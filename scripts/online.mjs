// Run the system on this computer AND make it reachable from anywhere (e.g. your phone)
// through a Cloudflare Tunnel. Started by start-online-windows.bat / start-online-mac.command.
//
// - Free mode (default): no account needed, gives a random https://….trycloudflare.com
//   address that changes every time this script starts.
// - Fixed address: create a tunnel in your free Cloudflare account and put its token
//   (and the address) in cloudflare.txt:
//       TOKEN=eyJhIjoi...
//       URL=https://sistem.gitagangsa.com
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const qrcode = require('qrcode-terminal');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const LOCAL = `http://localhost:${PORT}`;
const TOOLS = path.join(ROOT, 'tools');
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'data');
const children = [];
let stopping = false;

const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readConfig() {
  const cfg = { token: process.env.CLOUDFLARE_TUNNEL_TOKEN || '', url: process.env.PUBLIC_URL || '' };
  const file = path.join(ROOT, 'cloudflare.txt');
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(TOKEN|URL)\s*=\s*(.+?)\s*$/i);
      if (m) cfg[m[1].toLowerCase()] = m[2];
    }
  }
  return cfg;
}

/** Download URL of the cloudflared release for this computer. */
function releaseAsset() {
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download/';
  const { platform, arch } = process;
  if (platform === 'win32') return { url: base + (arch === 'ia32' ? 'cloudflared-windows-386.exe' : 'cloudflared-windows-amd64.exe'), file: 'cloudflared.exe' };
  if (platform === 'darwin') return { url: base + (arch === 'arm64' ? 'cloudflared-darwin-arm64.tgz' : 'cloudflared-darwin-amd64.tgz'), file: 'cloudflared', tgz: true };
  const a = { x64: 'amd64', arm64: 'arm64', arm: 'arm', ia32: '386' }[arch] || 'amd64';
  return { url: base + `cloudflared-linux-${a}`, file: 'cloudflared' };
}

async function ensureCloudflared() {
  if (process.env.CLOUDFLARED_BIN) return process.env.CLOUDFLARED_BIN;
  const onPath = spawnSync('cloudflared', ['--version'], { stdio: 'ignore' });
  if (onPath.status === 0) return 'cloudflared';
  const asset = releaseAsset();
  const bin = path.join(TOOLS, asset.file);
  if (fs.existsSync(bin)) return bin;
  log('Memuat turun Cloudflare Tunnel (sekali sahaja, ±40 MB)...');
  fs.mkdirSync(TOOLS, { recursive: true });
  const res = await fetch(asset.url);
  if (!res.ok) throw new Error(`Muat turun gagal (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (asset.tgz) {
    const tgz = path.join(TOOLS, 'cloudflared.tgz');
    fs.writeFileSync(tgz, buf);
    const r = spawnSync('tar', ['-xzf', tgz, '-C', TOOLS]);
    fs.unlinkSync(tgz);
    if (r.status !== 0) throw new Error('Gagal mengekstrak cloudflared');
  } else {
    fs.writeFileSync(bin, buf);
  }
  if (process.platform !== 'win32') fs.chmodSync(bin, 0o755);
  return bin;
}

async function healthy() {
  try {
    return (await fetch(`${LOCAL}/api/health`)).ok;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  try {
    const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
    const child = spawn(cmd[0], cmd[1], { stdio: 'ignore', detached: true });
    child.on('error', () => log(`Sila buka ${url} di pelayar.`));
    child.unref();
  } catch {
    /* no browser available */
  }
}

function banner(url, fixed) {
  const line = '='.repeat(64);
  log(`\n${line}`);
  log('  SISTEM BOLEH DIBUKA DARI MANA-MANA (telefon, tablet, komputer lain):');
  log(`\n      ${url}\n`);
  log(fixed ? '  Alamat ini TETAP.' : '  Alamat ini BERUBAH setiap kali sistem dimulakan semula.');
  log('  Imbas kod QR di bawah dengan kamera telefon:');
  log(line);
  qrcode.generate(url, { small: true });
  log('  Biarkan tetingkap ini terbuka. Tekan Ctrl+C untuk berhenti.\n');
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, 'alamat-internet.txt'), url + '\n');
  } catch {
    /* ignore */
  }
}

async function startServer() {
  if (await healthy()) {
    log(`Sistem sudah berjalan di ${LOCAL}`);
    return;
  }
  const child = spawn(process.execPath, ['--no-warnings', 'server/index.js'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PORT: String(PORT) } });
  children.push(child);
  child.on('exit', (code) => {
    if (!stopping) {
      log(`\nSistem berhenti (kod ${code}).`);
      shutdown(1);
    }
  });
  for (let i = 0; i < 60; i++) {
    if (await healthy()) return;
    await sleep(500);
  }
  throw new Error('Sistem tidak dapat dimulakan');
}

/** Never expose a fresh install to the internet before the admin account exists. */
async function requireAdmin() {
  const status = await (await fetch(`${LOCAL}/api/auth/status`)).json();
  if (!status.needsSetup) return;
  log('\n>>> Sila cipta akaun pentadbir dahulu di pelayar yang dibuka (komputer ini).');
  log('>>> Akses internet akan dibuka secara automatik selepas akaun dicipta.\n');
  openBrowser(LOCAL);
  for (;;) {
    await sleep(3000);
    const s = await (await fetch(`${LOCAL}/api/auth/status`)).json();
    if (!s.needsSetup) return;
  }
}

function runTunnel(bin, cfg) {
  return new Promise((resolve) => {
    const fixed = !!cfg.token;
    const args = fixed ? ['tunnel', '--no-autoupdate', 'run', '--token', cfg.token] : ['tunnel', '--no-autoupdate', '--url', LOCAL];
    const child = spawn(bin, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child);
    let shown = false;
    let output = '';
    const onData = (chunk) => {
      const text = chunk.toString();
      output = (output + text).slice(-4000);
      if (process.env.TUNNEL_DEBUG) process.stderr.write(text);
      if (shown) return;
      // Quick tunnel addresses look like https://some-random-words.trycloudflare.com (never api.)
      const quick = text.match(/https:\/\/(?!api\.)[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com/);
      if (!fixed && quick) {
        shown = true;
        banner(quick[0], false);
      } else if (fixed && /Registered tunnel connection/i.test(text)) {
        shown = true;
        if (cfg.url) banner(cfg.url, true);
        else log('\nTerowong Cloudflare tersambung. Buka alamat yang anda tetapkan dalam Cloudflare.\n');
      }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('exit', (code) => {
      children.splice(children.indexOf(child), 1);
      if (!shown && !stopping) {
        if (/failed to request quick Tunnel|no such host|dial tcp|connection refused|i\/o timeout/i.test(output)) {
          log('\nTidak dapat menghubungi Cloudflare. Semak sambungan internet komputer ini.');
        } else if (/Unauthorized|invalid token|token is invalid/i.test(output)) {
          log('\nToken dalam cloudflare.txt tidak sah. Salin semula token dari papan pemuka Cloudflare.');
        } else {
          log(`\nCloudflare Tunnel gagal (kod ${code}). Mesej terakhir:\n${output.split('\n').slice(-6).join('\n')}`);
        }
      }
      resolve(code);
    });
  });
}

function shutdown(code = 0) {
  stopping = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone */
    }
  }
  setTimeout(() => process.exit(code), 500);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  await startServer();
  await requireAdmin();
  const bin = await ensureCloudflared();
  const cfg = readConfig();
  log(cfg.token ? 'Menyambung terowong Cloudflare (alamat tetap)...' : 'Membuka akses internet melalui Cloudflare (percuma)...');
  // Keep the tunnel up: reconnect after network drops.
  while (!stopping) {
    await runTunnel(bin, cfg);
    if (stopping) break;
    log('Cuba menyambung semula dalam 10 saat...');
    await sleep(10000);
  }
} catch (e) {
  console.error(`\nRALAT: ${e.message}`);
  shutdown(1);
}
