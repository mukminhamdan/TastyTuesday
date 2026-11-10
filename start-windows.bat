@echo off
title Sistem Pengurusan Perniagaan
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js belum dipasang.
  echo  Sila muat turun dan pasang versi LTS dari https://nodejs.org
  echo  kemudian klik dua kali fail ini sekali lagi.
  echo.
  start "" https://nodejs.org
  pause
  exit /b 1
)
if not exist node_modules (
  echo Memasang komponen sistem kali pertama. Ini mungkin mengambil masa beberapa minit...
  call npm install
  if errorlevel 1 goto :error
)
if not exist dist\index.html (
  echo Menyediakan paparan sistem...
  call npm run build
  if errorlevel 1 goto :error
)
echo.
echo  Sistem sedang berjalan di http://localhost:3000
echo  JANGAN tutup tetingkap ini semasa menggunakan sistem.
echo  Untuk telefon Android dalam Wi-Fi yang sama, guna alamat "Dari telefon" yang dipaparkan di bawah.
echo.
start "" cmd /c "timeout /t 3 >nul & start http://localhost:3000"
call npm start
pause
exit /b 0
:error
echo.
echo  Ralat berlaku. Sila semak sambungan internet dan cuba lagi.
pause
exit /b 1
