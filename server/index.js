import os from 'node:os';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { fileBackup } from './routes/settings.js';
import { sweepStatuses } from './lib/finance.js';

const db = openDb();
sweepStatuses(db);
const app = createApp(db);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`Business Management System running on http://localhost:${port} (${db.driver})`);
  let ifaces = {};
  try {
    ifaces = os.networkInterfaces();
  } catch {
    /* not permitted on some Android versions */
  }
  const lan = Object.values(ifaces)
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${port}`);
  // Only relevant when running on a local computer (not behind an HTTPS host such as Render)
  if (lan.length && process.env.COOKIE_SECURE !== 'true') console.log(`Dari telefon / peranti lain dalam Wi-Fi yang sama: ${lan.join('  atau  ')}`);
});

// Automatic daily database snapshot (data/backups, newest 14 kept).
const DAY = 24 * 3600 * 1000;
const runBackup = () => fileBackup(db).then((f) => console.log('Backup saved:', f)).catch((e) => console.error('Backup failed:', e));
if (process.env.AUTO_BACKUP !== 'false') {
  setTimeout(runBackup, 60 * 1000);
  setInterval(runBackup, DAY).unref();
}
setInterval(() => sweepStatuses(db), 3600 * 1000).unref();

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
