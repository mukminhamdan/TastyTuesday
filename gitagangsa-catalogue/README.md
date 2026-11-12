# Katalog Digital Gita Gangsa

Katalog persembahan rasmi **Gita Gangsa**, dalam bentuk laman web yang responsif dan boleh dicetak atau disimpan sebagai PDF A4 (20 halaman).

Katalog ini tidak memerlukan pelayan, pemasangan atau sambungan internet. Fon dihoskan sendiri dalam folder `fonts/`.

---

## 1. Struktur folder

```
gitagangsa-catalogue/
├── index.html              ← semua kandungan katalog (20 halaman)
├── css/
│   ├── style.css           ← reka bentuk skrin (telefon, tablet, komputer)
│   └── print.css           ← susun atur cetakan / PDF A4 potret
├── js/
│   ├── config.js           ← ★ MAKLUMAT HUBUNGAN (WhatsApp, e-mel, media sosial)
│   └── main.js             ← fungsi interaktif (tiada perlu diubah)
├── fonts/                  ← Cormorant Garamond & Manrope (lesen OFL)
└── images/
    ├── SENARAI-GAMBAR.md   ← ★ senarai lengkap gambar yang diperlukan
    ├── logo/  gamelan/  kompang/  tarian/  caklempong/
    ├── muzik-asli/  ghazal/  portfolio/  general/
```

## 2. Melihat katalog

- **Komputer:** buka `index.html` dengan Chrome, Edge, Safari atau Firefox (klik dua kali).
- **Telefon (Android / iPhone):** muat naik folder ini ke hosting web, GitHub Pages, Netlify atau Vercel. Kemudian kongsi pautannya melalui WhatsApp. Lihat bahagian 7.

Kandungan navigasi:

- **Kandungan** (butang menu): senarai 20 halaman. Klik untuk melompat ke halaman tersebut.
- **Sebut Harga**: borang pertanyaan. Mesej dijana automatik dan dihantar melalui WhatsApp atau e-mel.
- **WhatsApp**: butang di bar atas dan butang terapung di penjuru kanan bawah.
- **Galeri**: klik mana-mana gambar untuk paparan besar. Gunakan anak panah atau leret (swipe) untuk gambar seterusnya.

## 3. ★ Kemaskini maklumat hubungan (WAJIB sebelum diedarkan)

Buka `js/config.js` dan isi nilai berikut:

```js
whatsapp:  "60123456789",                       // format antarabangsa, tanpa + / ruang / sengkang
email:     "nama@domain.com",
instagram: "https://instagram.com/akaun",
facebook:  "https://facebook.com/halaman",
tiktok:    "https://tiktok.com/@akaun",
website:   "https://www.domain.com",
legalName: "Gita Gangsa Enterprise (No. Pendaftaran)"  // pilihan, untuk cover belakang
```

Selepas disimpan, semua butang WhatsApp, borang sebut harga, halaman Hubungi Kami dan cover belakang dikemaskini secara automatik.

Nilai yang dibiarkan kosong akan dipaparkan sebagai placeholder seperti `[ Instagram ]`. Selagi nombor WhatsApp belum ditetapkan, butang WhatsApp akan memaparkan peringatan.

## 4. Menggantikan gambar

1. Lihat senarai dalam `images/SENARAI-GAMBAR.md`, atau fail `BACA-SAYA.md` dalam setiap folder.
2. Namakan gambar **sama tepat** dengan nama fail yang tertera, contohnya `images/gamelan/gamelan-kumpulan-pemuzik.jpg`.
3. Salin gambar ke dalam folder berkenaan. Gambar akan dipaparkan secara automatik.

Selagi gambar belum dimasukkan, ruang gambar bertekstur kayu dan motif emas akan dipaparkan bersama nama fail yang diperlukan.

Untuk menggunakan nama fail lain, ubah atribut `src="..."` pada `<img>` yang berkenaan dalam `index.html`.

Untuk menukar fokus potongan gambar, tambah `style="object-position: center top"` pada `<img>`. Nilai lain yang boleh digunakan: `left`, `right`, `bottom`, atau peratus seperti `50% 30%`.

**Kod QR:** jana kod QR (contohnya untuk pautan WhatsApp atau website). Simpan sebagai `images/general/qr-code.png`.

**Logo:** logo rasmi Gita Gangsa sudah dimasukkan dalam `images/logo/`. Untuk menukarnya, gantikan fail dengan nama yang sama.

## 5. Mengemaskini teks

Semua teks berada dalam `index.html` dan boleh disunting dengan mana-mana editor teks (contohnya VS Code atau Notepad). Setiap halaman ditandakan dengan komen seperti:

```html
<!-- HALAMAN 6 — A. GAMELAN MELAYU -->
```

Perkara yang perlu disemak oleh pihak Gita Gangsa:

- **Visi & Misi (halaman 4):** ini ialah cadangan. Selepas disahkan, padam baris berikut:
  `<p class="draft-tag ...">Cadangan — untuk semakan ...</p>`
- **Portfolio (halaman 15–16):** gantikan `[Nama acara]`, `[Lokasi]`, `[Tarikh]` dan `[Jenis persembahan]` dengan maklumat sebenar. Selepas itu, padam `<span class="tbd">` yang membalutnya.
- **Perjalanan (halaman 3):** hanya tahun 2011 dinyatakan. Tarikh atau peristiwa lain boleh ditambah dalam `<ol class="timeline">`.

Katalog ini tidak mengandungi sebarang harga, angka pencapaian, anugerah atau nama pelanggan rekaan.

## 6. Cetak / Simpan sebagai PDF (A4 potret)

1. Buka `index.html` dalam **Google Chrome** atau **Microsoft Edge**. Ini disyorkan untuk hasil terbaik.
2. Klik butang **Cetak / PDF** di bar atas, atau tekan `Ctrl + P` (`Cmd + P` pada Mac).
3. Tetapkan:
   - **Destination:** Save as PDF
   - **Paper size:** A4
   - **Margins:** None (atau Default)
   - **Options:** ✅ **Background graphics** (wajib, supaya warna dan tekstur dicetak)
   - Pastikan **Headers and footers** tidak ditanda.
4. Klik **Save**.

Hasil cetakan:

- Setiap halaman katalog menjadi satu halaman A4, dengan nombor halaman di kaki halaman.
- Gambar tidak akan terbelah antara halaman.
- Butang laman web digantikan dengan baris hubungan WhatsApp.
- Pautan WhatsApp, e-mel dan media sosial dalam PDF boleh diklik.

> Selepas menambah gambar atau mengubah teks yang panjang, semak semula pratonton cetakan. Jika teks melebihi halaman, pendekkan ayat berkenaan. Setiap halaman PDF mempunyai saiz tetap.

## 7. Menerbitkan secara dalam talian (pilihan)

- **Netlify Drop:** seret folder `gitagangsa-catalogue` ke <https://app.netlify.com/drop>.
- **GitHub Pages:** muat naik folder ke repositori, kemudian aktifkan Pages.
- **Hosting sedia ada:** muat naik keseluruhan folder melalui cPanel / FTP.

Kongsi pautan tersebut melalui WhatsApp atau e-mel kepada pelanggan.

## 8. Identiti visual

| Elemen | Nilai |
|---|---|
| Hitam | `#0E0C0A` |
| Emas | `#C9A45C` (terang `#E4C88A`, gelap `#94702F`) |
| Ivory | `#F7F2E8` |
| Beige | `#EDE3D1` |
| Kayu gelap | `#2E2017` / `#1E150F` |
| Fon tajuk | Cormorant Garamond (serif) |
| Fon kandungan | Manrope (sans-serif) |
| Motif | kekisi geometri berbunga, pucuk rebung, bintang lapan penjuru, siluet alat muzik (gong, kompang, kipas, caklempong, biola, gambus) |

Warna boleh diubah di bahagian `:root` dalam `css/style.css`.
