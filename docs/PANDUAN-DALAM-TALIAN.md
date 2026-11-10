# Panduan: Pasang sistem dalam talian (Render)

Selepas langkah ini, sistem boleh dibuka di mana-mana, contohnya `https://gita-gangsa.onrender.com`,
dari komputer, telefon Android atau iPhone. Ia boleh juga dipasang sebagai aplikasi di skrin utama telefon.

**Anggaran kos:** pelan *Starter* Render (lebih kurang USD 7 sebulan) + cakera data 1 GB (beberapa sen sebulan).
Sila semak harga terkini di render.com/pricing. Pelan percuma **tidak sesuai** kerana data akan hilang setiap kali
pelayan dimulakan semula.

---

## Langkah 1: Gabungkan kod ke `main` (sekali sahaja)

Di GitHub, buka Pull Request #3 → klik **Merge pull request** → **Confirm merge**.

## Langkah 2: Daftar akaun Render

1. Pergi ke **https://render.com** → **Get Started**.
2. Pilih **Sign up with GitHub** (paling mudah) dan benarkan akses.
3. Tambah kad bayaran di **Billing** (diperlukan untuk pelan berbayar).

## Langkah 3: Pasang sistem dengan Blueprint

1. Di papan pemuka Render, klik **New +** → **Blueprint**.
2. Pilih repositori **mukminhamdan/TastyTuesday**. Jika tidak kelihatan, klik *Configure GitHub* dan benarkan
   Render melihat repositori itu.
3. Render akan membaca fail `render.yaml` dan menunjukkan servis **gita-gangsa** (Singapura, pelan Starter, cakera 1 GB).
4. Ia akan meminta nilai untuk **SETUP_CODE**. Taip satu kod rahsia ciptaan sendiri, contohnya `GitaGangsa-2026!`,
   dan **simpan kod ini**. Ia hanya diperlukan sekali, semasa mencipta akaun pentadbir.
5. Klik **Apply**. Tunggu 3 hingga 5 minit sehingga status menjadi **Live**.

## Langkah 4: Buka sistem dan cipta akaun pentadbir

1. Klik alamat servis, contohnya `https://gita-gangsa.onrender.com`.
2. Isi borang **Persediaan kali pertama**:
   - **Kod persediaan**: kod SETUP_CODE dari Langkah 3
   - Nama perniagaan, nama anda, e-mel dan kata laluan (sekurang-kurangnya 8 aksara)
3. Semak **Tetapan** (logo, maklumat bank dan nombor invois seterusnya, contohnya 211).

## Langkah 5: Pasang di telefon Android

1. Buka alamat sistem dalam **Chrome**.
2. Menu **⋮** → **Pasang aplikasi** (atau *Tambah ke skrin utama*).
3. Ikon Gita Gangsa akan muncul di skrin utama. Log masuk sekali, dan sistem akan mengingati anda selama 7 hari.

> iPhone: buka dalam Safari → butang **Kongsi** → **Add to Home Screen**.

## Langkah 6 (pilihan): Tambah staf

**Tetapan → Pengguna → Tambah pengguna.** Pilih peranan **Kakitangan** untuk staf: mereka boleh merekod tempahan,
invois dan bayaran, tetapi tidak boleh memadam rekod atau mengubah tetapan.

---

## Perkara penting

- **Sandaran:** sistem menyimpan salinan pangkalan data setiap hari di pelayan. Untuk keselamatan tambahan,
  muat turun **Tetapan → Sandaran & pemulihan → Muat turun fail sandaran** sekurang-kurangnya seminggu sekali,
  dan simpan di Google Drive atau komputer.
- **Kemas kini sistem:** setiap kali kod baharu digabungkan ke `main`, Render akan memasangnya secara automatik.
  Data tidak terjejas. Sistem tidak dapat dibuka selama kira-kira satu minit semasa kemas kini.
- **Alamat sendiri (pilihan):** di Render → servis → **Settings → Custom Domains**, contohnya `sistem.gitagangsa.com`
  jika anda memiliki domain.
- **Kata laluan:** gunakan kata laluan yang kukuh, kerana sistem ini boleh dibuka dari internet.
  Jika telefon hilang, tukar kata laluan; semua sesi lain akan dilog keluar.
