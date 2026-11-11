# Panduan: Komputer + Cloudflare Tunnel (percuma)

Sistem berjalan di **komputer anda** (pejabat atau rumah). Cloudflare memberi alamat **HTTPS** supaya sistem boleh
dibuka dari **telefon di mana-mana sahaja**, termasuk di lokasi majlis.

- **Kos:** percuma. Untuk alamat tetap, anda perlukan domain sendiri (contohnya `gitagangsa.com`, ±RM 45 setahun).
- **Syarat:** komputer mesti **hidup dan bersambung ke internet** semasa sistem digunakan.
- **Data:** disimpan dalam komputer anda (folder `data`), bukan di Cloudflare.

---

## Bahagian A: Mula sekarang, tanpa akaun (alamat berubah-ubah)

1. Pasang **Node.js** versi LTS dari https://nodejs.org (sekali sahaja).
2. Ekstrak **SistemGitaGangsa.zip** ke folder, contohnya `Documents\SistemGitaGangsa`.
3. Klik dua kali:
   - **Windows:** `start-online-windows.bat`
   - **Mac:** `start-online-mac.command` (kali pertama: klik kanan → *Open*)
4. Kali pertama, sistem akan memasang komponen dan memuat turun Cloudflare secara automatik (beberapa minit).
5. Pelayar di komputer akan dibuka. **Cipta akaun pentadbir dahulu.** Akses internet hanya dibuka selepas akaun
   dicipta, supaya orang lain tidak dapat mendaftar sebelum anda.
6. Tetingkap hitam akan memaparkan:
   ```
   SISTEM BOLEH DIBUKA DARI MANA-MANA:
       https://contoh-perkataan-rawak.trycloudflare.com
   ```
   berserta **kod QR**. **Imbas kod QR dengan kamera telefon** untuk membuka sistem.

**Perlu tahu:**
- Alamat ini **berubah setiap kali** sistem dimulakan semula, jadi imbas kod QR yang baharu setiap kali.
  Alamat terkini juga disimpan dalam fail `data\alamat-internet.txt`.
- Mod tanpa akaun ini percuma, tetapi Cloudflare tidak menjamin ia sentiasa tersedia. Untuk kegunaan harian,
  gunakan **Bahagian B**.

---

## Bahagian B: Alamat tetap (disyorkan untuk kegunaan harian)

Dengan alamat tetap (contohnya `https://sistem.gitagangsa.com`), sistem boleh dipasang di telefon sebagai aplikasi
dan alamatnya tidak berubah lagi.

### B1. Akaun Cloudflare dan domain (sekali sahaja)
1. Daftar akaun **percuma** di **https://dash.cloudflare.com/sign-up**.
2. Dapatkan domain:
   - **Beli di Cloudflare:** *Domain Registration → Register Domains*. Contohnya `.com`, kira-kira USD 10 setahun, harga kos.
   - **Atau guna domain sedia ada:** *Add a domain*, kemudian tukar *nameserver* di syarikat domain anda mengikut
     arahan Cloudflare.

### B2. Cipta terowong (tunnel)
> Nama menu Cloudflare mungkin sedikit berbeza dari semasa ke semasa.

1. Di papan pemuka Cloudflare, buka **Zero Trust → Networks → Tunnels** → **Create a tunnel**.
2. Pilih **Cloudflared** → beri nama `gita-gangsa` → **Save tunnel**.
3. Cloudflare akan memaparkan arahan pemasangan yang mengandungi token panjang selepas perkataan `--token`
   (bermula dengan `eyJ...`). **Salin token itu sahaja.** Anda tidak perlu menjalankan arahan tersebut.
4. Klik **Next**. Di bahagian **Public Hostname**:
   - **Subdomain:** `sistem`
   - **Domain:** domain anda (contohnya `gitagangsa.com`)
   - **Service Type:** `HTTP`
   - **URL:** `localhost:3000`
5. Klik **Save tunnel**.

### B3. Simpan token dalam folder sistem
1. Dalam folder sistem (sama dengan `start-online-windows.bat`), cipta fail teks baharu bernama **`cloudflare.txt`**.
2. Isikan dua baris ini, menggunakan token dan alamat anda:
   ```
   TOKEN=eyJhIjoi...token-panjang-anda...
   URL=https://sistem.gitagangsa.com
   ```
3. Simpan. Kemudian klik dua kali `start-online-windows.bat` seperti biasa.

Tetingkap hitam akan memaparkan **"Alamat ini TETAP"** berserta kod QR.

> **Rahsiakan fail `cloudflare.txt`.** Sesiapa yang memiliki token itu boleh menyambung terowong anda.

### B4. Pasang di telefon
1. Buka `https://sistem.gitagangsa.com` dalam **Chrome** (Android) → **⋮ → Pasang aplikasi**.
2. iPhone: buka dalam **Safari** → **Kongsi** → **Add to Home Screen**.

---

## Bahagian C: Supaya sistem sentiasa tersedia

**Mula secara automatik apabila komputer dihidupkan (Windows):**
1. Tekan **Windows + R**, taip `shell:startup`, dan tekan Enter.
2. Klik kanan `start-online-windows.bat` → **Create shortcut** (Cipta pintasan), kemudian pindahkan pintasan itu
   ke dalam folder Startup yang dibuka tadi.

**Jangan biarkan komputer tidur (sleep):**
*Settings → System → Power & battery → Screen and sleep → "When plugged in, put my device to sleep after" → **Never***.

---

## Keselamatan

- Alamat sistem boleh dibuka oleh sesiapa sahaja di internet, tetapi mereka hanya akan melihat **halaman log masuk**.
- Gunakan **kata laluan yang kukuh** (sekurang-kurangnya 8 aksara, campuran huruf dan nombor).
- Sistem menyekat sementara selepas terlalu banyak cubaan log masuk yang salah.
- Jika telefon hilang, **tukar kata laluan**. Semua sesi lain akan dilog keluar secara automatik.
- Buat sandaran seminggu sekali: **Tetapan → Sandaran & pemulihan → Muat turun fail sandaran** → simpan di Google Drive.

## Masalah biasa

| Mesej | Penyelesaian |
|---|---|
| *Tidak dapat menghubungi Cloudflare* | Semak sambungan internet komputer. Sistem akan cuba menyambung semula setiap 10 saat. |
| *Token dalam cloudflare.txt tidak sah* | Salin semula token dari Cloudflare (Bahagian B2, langkah 3). |
| Telefon memaparkan ralat Cloudflare 1033 / 502 | Komputer tutup, tidur, atau tetingkap sistem telah ditutup. Mulakan semula sistem. |
| Windows bertanya tentang *firewall* | Pilih **Allow**. |
