# Panduan: Pasang sistem terus di telefon Android (percuma)

Sistem berjalan **di dalam telefon anda sendiri**. Tidak perlu komputer atau internet (kecuali semasa memasang),
dan tiada bayaran. Data disimpan dalam telefon, dengan salinan sandaran automatik.

**Keperluan:** Android 7 atau lebih baharu, ruang kosong ±300 MB, internet semasa memasang kali pertama.

---

## Langkah 1: Pasang Termux (sekali sahaja)

Termux ialah aplikasi percuma yang membolehkan sistem ini berjalan di telefon.

1. Buka **https://f-droid.org/packages/com.termux/** di Chrome telefon.
2. Tatal ke bawah dan tekan **Download APK** pada versi teratas.
3. Buka fail yang dimuat turun dan tekan **Pasang**. Jika diminta, benarkan *"Pasang apl tidak diketahui"* untuk Chrome.

> Gunakan Termux dari **F-Droid**, bukan Play Store, kerana versi Play Store mungkin tidak lengkap.

**Disyorkan, untuk ikon satu sentuhan di skrin utama:** pasang juga **Termux:Widget** dengan cara yang sama dari
**https://f-droid.org/packages/com.termux.widget/**

## Langkah 2: Simpan fail ZIP dalam telefon

Pastikan fail **SistemGitaGangsa.zip** berada dalam folder **Download** (Muat turun) telefon. Contohnya:

- Muat naik ZIP ke Google Drive dari komputer → di telefon buka Drive → ⋮ → **Muat turun**, atau
- Hantar ZIP kepada diri sendiri melalui e-mel atau Telegram → buka di telefon → **Muat turun**.

Semak dengan aplikasi **Fail** (Files): fail mesti ada dalam folder **Download**.

## Langkah 3: Pasang sistem

1. Buka aplikasi **Termux**.
2. Taip arahan ini dan tekan Enter:
   ```
   termux-setup-storage
   ```
   Tekan **Benarkan** apabila ditanya tentang akses storan.
3. Salin dan tampal arahan ini (tekan lama di Termux → **Paste**), kemudian tekan Enter:
   ```
   pkg install -y unzip && unzip -o ~/storage/downloads/SistemGitaGangsa.zip -d ~ && bash ~/SistemGitaGangsa/termux-install.sh
   ```
4. Tunggu 3 hingga 10 minit. Jika ditanya `[Y/n]`, taip **y** dan tekan Enter.
5. Apabila siap, Chrome akan dibuka secara automatik di **http://localhost:3000**.

## Langkah 4: Persediaan kali pertama

1. Cipta akaun pentadbir (nama, e-mel, kata laluan).
2. Semak **Tetapan**: logo dan maklumat Gita Gangsa sudah tersedia. Tetapkan nombor invois seterusnya
   (contohnya 211) di **Penomboran dokumen**.
3. Di Chrome, tekan **⋮ → Tambah ke skrin utama** supaya ikon Gita Gangsa muncul di skrin utama.

## Langkah 5: Tetapan bateri (penting)

Supaya Android tidak menghentikan sistem secara tiba-tiba:
**Tetapan telefon → Aplikasi → Termux → Bateri → Tidak dihadkan** (*Unrestricted*).

---

## Cara guna setiap hari

**Jika memasang Termux:Widget (paling mudah):**
1. Tekan lama ruang kosong di skrin utama → **Widget** → **Termux:Widget** → letak di skrin utama.
2. Pilih **Gita Gangsa**.
3. Seterusnya, tekan sahaja ikon itu. Sistem akan dimulakan dan Chrome terus dibuka.

**Tanpa widget:** buka Termux, taip `gitagangsa`, dan tekan Enter.

Selepas sistem dimulakan, ikon Gita Gangsa di skrin utama (dari Langkah 4) boleh digunakan seperti aplikasi biasa.
Jika aplikasi memaparkan *"Tidak dapat menghubungi pelayan"*, maksudnya sistem belum dimulakan. Tekan ikon widget
atau taip `gitagangsa`.

---

## Sandaran (sangat penting)

Data disimpan dalam telefon. **Jika telefon hilang, rosak atau Termux dibuang, data dalam Termux turut hilang.**

- **Automatik:** setiap kali sistem berjalan, salinan sandaran disimpan dalam folder telefon
  **Documents/GitaGangsa-Sandaran** (14 salinan terkini). Folder ini kekal walaupun Termux dibuang.
- **Seminggu sekali (disyorkan):** dalam sistem, pergi ke **Tetapan → Sandaran & pemulihan → Muat turun fail sandaran**,
  kemudian muat naik fail itu ke **Google Drive**.

**Pindah ke telefon baharu:** pasang semula (Langkah 1 hingga 4), kemudian **Tetapan → Sandaran & pemulihan →
Pilih fail sandaran** dan pilih fail sandaran dari Google Drive.

## Kemas kini ke versi baharu

Simpan fail ZIP baharu dalam folder Download, kemudian jalankan arahan yang sama seperti di Langkah 3. Data anda
tidak akan terjejas.

## Masalah biasa

| Masalah | Penyelesaian |
|---|---|
| `No such file` semasa unzip | Fail ZIP tiada dalam folder Download, atau namanya berbeza. Semak dengan aplikasi Fail. |
| Ralat semasa `pkg install` | Taip `termux-change-repo`, pilih mana-mana pelayan, kemudian cuba semula Langkah 3. |
| Sistem berhenti sendiri | Lihat Langkah 5 (tetapan bateri). |
| Terlupa kata laluan | Pulihkan dari fail sandaran, atau hubungi pembangun sistem. |
