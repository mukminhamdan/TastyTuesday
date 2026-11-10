#!/bin/bash
# Klik dua kali untuk memulakan Sistem Pengurusan Perniagaan (macOS)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo " Node.js belum dipasang. Sila pasang versi LTS dari https://nodejs.org"
  echo " kemudian klik dua kali fail ini sekali lagi."
  open https://nodejs.org
  read -n 1 -s -r -p " Tekan sebarang kekunci untuk tutup..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Memasang komponen sistem kali pertama. Ini mungkin mengambil masa beberapa minit..."
  npm install || { echo "Ralat semasa memasang."; read -n 1 -s; exit 1; }
fi
if [ ! -f dist/index.html ]; then
  echo "Menyediakan paparan sistem..."
  npm run build || { echo "Ralat semasa menyediakan paparan."; read -n 1 -s; exit 1; }
fi
echo ""
echo " Sistem sedang berjalan di http://localhost:3000"
echo " JANGAN tutup tetingkap ini semasa menggunakan sistem."
echo ""
(sleep 3 && open http://localhost:3000) &
npm start
