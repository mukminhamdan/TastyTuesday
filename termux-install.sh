#!/data/data/com.termux/files/usr/bin/bash
# Pasang Sistem Pengurusan Gita Gangsa di telefon Android (Termux).
# Jalankan dari folder sistem yang telah diekstrak:  bash ~/SistemGitaGangsa/termux-install.sh
set -e
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ""
echo "=== Memasang Sistem Pengurusan Gita Gangsa ==="
echo "Folder: $APP_DIR"
echo ""

if [ ! -f "$APP_DIR/dist/index.html" ]; then
  echo "RALAT: folder 'dist' tiada. Sila guna fail ZIP SistemGitaGangsa yang lengkap."
  exit 1
fi

echo "[1/3] Memasang Node.js (beberapa minit, perlu internet)..."
pkg update -y >/dev/null 2>&1 || true
yes | pkg upgrade -y -o Dpkg::Options::="--force-confnew" >/dev/null 2>&1 || true
pkg install -y nodejs-lts || pkg install -y nodejs

if ! node -e "require('node:sqlite')" >/dev/null 2>&1; then
  echo "RALAT: versi Node.js ($(node -v)) terlalu lama. Cuba: pkg install nodejs"
  exit 1
fi

echo "[2/3] Memasang komponen sistem..."
cd "$APP_DIR"
# --omit=optional: skip the native SQLite module; the built-in node:sqlite is used instead.
npm install --omit=dev --omit=optional --no-audit --no-fund

echo "[3/3] Mencipta pintasan..."
LAUNCHER="$PREFIX/bin/gitagangsa"
cat > "$LAUNCHER" <<LAUNCH
#!/data/data/com.termux/files/usr/bin/bash
# Mulakan Sistem Pengurusan Gita Gangsa dan buka di Chrome
cd "$APP_DIR"
URL=http://localhost:3000
if node -e "fetch('\$URL/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))" 2>/dev/null; then
  termux-open-url "\$URL"
  exit 0
fi
termux-wake-lock 2>/dev/null || true
# Salinan sandaran harian juga disimpan dalam storan telefon (kekal walaupun Termux dibuang)
if [ -d "\$HOME/storage/shared" ]; then
  export BACKUP_COPY_DIR="\$HOME/storage/shared/Documents/GitaGangsa-Sandaran"
fi
echo ""
echo " Sistem Gita Gangsa sedang berjalan di \$URL"
echo " Biarkan Termux terbuka (boleh tekan butang Home)."
echo " Untuk berhenti: tekan Ctrl+C atau tutup Termux."
echo ""
(sleep 4; termux-open-url "\$URL") &
exec node --no-warnings server/index.js
LAUNCH
chmod +x "$LAUNCHER"
mkdir -p "$HOME/.shortcuts"
cp "$LAUNCHER" "$HOME/.shortcuts/Gita Gangsa"
chmod +x "$HOME/.shortcuts/Gita Gangsa"

echo ""
echo "=== SIAP! ==="
echo " Mulakan sistem bila-bila masa dengan menaip:  gitagangsa"
echo " (atau tekan ikon 'Gita Gangsa' jika anda memasang Termux:Widget)"
echo ""
echo "Memulakan sistem sekarang..."
exec "$LAUNCHER"
