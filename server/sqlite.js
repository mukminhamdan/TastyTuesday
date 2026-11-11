// SQLite driver selection.
//
// better-sqlite3 (native, fastest) is used when it is installed. Where it is not
// available, e.g. on an Android phone running Termux, where native modules are hard
// to build, we fall back to Node's built-in `node:sqlite` (Node 22.5+) behind a small
// adapter that exposes the subset of the better-sqlite3 API this app uses:
// prepare().run/get/all, exec, pragma, transaction, backup, close, name.
//
// Set BMS_SQLITE=node to force the built-in driver (used by the test suite).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export function openSqlite(file) {
  if (process.env.BMS_SQLITE !== 'node') {
    try {
      const Database = require('better-sqlite3');
      const db = new Database(file);
      db.driver = 'better-sqlite3';
      return db;
    } catch (e) {
      if (process.env.BMS_SQLITE === 'better-sqlite3') throw e;
    }
  }
  return new NodeSqliteDatabase(file);
}

const NAMED = /[@:$]([A-Za-z_][A-Za-z0-9_]*)/g;

/** Map node:sqlite errors onto the better-sqlite3 error codes the app checks for. */
function translateError(e) {
  const msg = String(e?.message || '');
  if (/FOREIGN KEY constraint failed/i.test(msg)) e.code = 'SQLITE_CONSTRAINT_FOREIGNKEY';
  else if (/UNIQUE constraint failed/i.test(msg)) e.code = 'SQLITE_CONSTRAINT_UNIQUE';
  return e;
}

const bindValue = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);

class Statement {
  constructor(stmt, sql) {
    this.stmt = stmt;
    this.names = [...new Set([...sql.matchAll(NAMED)].map((m) => m[1]))];
  }

  args(params) {
    // Named parameters: pass only the names the SQL uses (node:sqlite rejects extras).
    if (params.length === 1 && params[0] && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      if (!this.names.length) return []; // SQL uses no named parameters
      const src = params[0];
      const obj = {};
      for (const n of this.names) obj[n] = bindValue(src[n]);
      return [obj];
    }
    return params.map(bindValue);
  }

  run(...params) {
    try {
      const r = this.stmt.run(...this.args(params));
      return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
    } catch (e) {
      throw translateError(e);
    }
  }

  get(...params) {
    try {
      return this.stmt.get(...this.args(params));
    } catch (e) {
      throw translateError(e);
    }
  }

  all(...params) {
    try {
      return this.stmt.all(...this.args(params));
    } catch (e) {
      throw translateError(e);
    }
  }
}

class NodeSqliteDatabase {
  constructor(file) {
    // Silence Node's "SQLite is an experimental feature" warning.
    const emit = process.emitWarning;
    process.emitWarning = (w, ...rest) => (String(w?.message || w).includes('SQLite') ? undefined : emit.call(process, w, ...rest));
    let DatabaseSync;
    try {
      ({ DatabaseSync } = require('node:sqlite'));
    } catch {
      throw new Error('No SQLite driver available: install better-sqlite3, or use Node.js 22.13+ which includes node:sqlite.');
    } finally {
      process.emitWarning = emit;
    }
    this.db = new DatabaseSync(file);
    this.name = file;
    this.driver = 'node:sqlite';
    this.depth = 0;
  }

  prepare(sql) {
    try {
      return new Statement(this.db.prepare(sql), sql);
    } catch (e) {
      throw translateError(e);
    }
  }

  exec(sql) {
    try {
      this.db.exec(sql);
    } catch (e) {
      throw translateError(e);
    }
    return this;
  }

  pragma(source, options = {}) {
    const rows = this.db.prepare(`PRAGMA ${source}`).all();
    if (options.simple) return rows[0] ? Object.values(rows[0])[0] : undefined;
    return rows;
  }

  /** Same semantics as better-sqlite3: returns a function running `fn` atomically (nestable). */
  transaction(fn) {
    return (...args) => {
      const sp = this.depth > 0 ? `sp_${this.depth}` : null;
      this.db.exec(sp ? `SAVEPOINT ${sp}` : 'BEGIN');
      this.depth++;
      try {
        const result = fn(...args);
        this.depth--;
        this.db.exec(sp ? `RELEASE ${sp}` : 'COMMIT');
        return result;
      } catch (e) {
        this.depth--;
        this.db.exec(sp ? `ROLLBACK TO ${sp}; RELEASE ${sp}` : 'ROLLBACK');
        throw e;
      }
    };
  }

  async backup(destination) {
    this.db.exec(`VACUUM INTO '${String(destination).replace(/'/g, "''")}'`);
  }

  close() {
    this.db.close();
  }
}
