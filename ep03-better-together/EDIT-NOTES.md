# Nota Suntingan — Tasty Tuesday EP3 · Better Together

Sumber: rakaman TikTok Live 92 min (640×1280, 25 fps). Transkrip penuh di `data/transcript.txt`.

## Ringkasan 6 video

| # | Video | Durasi | Hook pembuka |
|---|---|---|---|
| 1 | **YouTube — sesi penuh** (16:9) | 45:00 | Cold open 30s: oven Cooven menyala (red velvet), "Siakap kedai RM40++ vs < RM20", "Patutlah nama ubi lambung!", "Regular customer… patutlah happy" → kad tajuk |
| 2 | **Reels rumusan** (9:16) | 0:51 | "Thermomix tak boleh bakar? Di sinilah datangnya Cooven" atas b-roll oven menyala |
| 3 | **Menu 1 · Pes Sup** (Kak Salma) | 0:51 | "Bawang sekilo… dalam Cooven sekali harung je!" |
| 4 | **Menu 2 · Red Velvet Cupcake** (Piah) | 0:50 | Oven menyala + "15 minit tanpa preheat" |
| 5 | **Menu 3 · Siakap Stim** (Ida) | 0:54 | "Siakap steam kat kedai RM40 lebih… total bahan tak sampai RM20!" |
| 6 | **Menu 4 · Ubi Lambung** (Mukmin) | 0:54 | "Kenapa nama dia ubi lambung?" → "Patutlah!" |

Reels dan semua video menu bawah 1 minit (v2, atas permintaan). Versi ~3 minit (v1) ada dalam sejarah git (commit 64fd538).

## Struktur video YouTube (bab)

1. Cold open → kad tajuk *Tasty Tuesday · Episod 3 · Better Together · Cooven × Thermomix*
2. Pembukaan — kenapa "Better Together" (Thermomix blend/adun, Cooven bakar/goreng/steam; bukan saingan)
3. Menu 1 · Pes Sup — Kak Salma
4. Menu 2 · Red Velvet Cupcake
5. Menu 3 · Siakap Stim — Ida
6. Menu 4 · Ubi Lambung — Mukmin
7. Hasil & tips akhir (frosting tanpa nozzle, sos siakap, testimoni, nasi dalam bowl Thermomix, F.R.E.E joke)
8. Penutup → **Blooper** (filter make-up, "tak ada helmet, tak ada 29k", "cari muka sendiri") → kad akhir

Panel kanan sentiasa tunjuk: jenama, kad "Sedang dimasak" setiap bab, kad tip/label setting, dan caption ayat semasa. Sidecar `youtube-full.srt` disediakan untuk upload subtitle ke YouTube.

## Apa yang dibuang

- 11 minit pertama: setup teknikal (mic bergema, invite peserta, "nampak tak?") — kecuali 3 blooper lucu dipindah ke hujung
- Senyap / jeda janggal: dipotong automatik dari timestamp perkataan (jurang > 0.7 s di YouTube, > 0.4–0.45 s di Reels/menu) dengan jump-zoom 6–10% supaya potongan nampak sengaja
- Ulangan ("Haa", "okey", "nampak tak", "sekejap") dan menunggu masakan siap
- Sesi screenshot panjang, kiraan cupcake, sebahagian promo/support group
- **Selepas 1:19:43 (selepas "bye")** — perbualan peribadi peserta (rancangan esok, memandu, dll.) **tidak digunakan langsung**. Hanya resepi ubi lambung yang disebut di situ (keledek 400 g, tepung ubi 100 g, tepung pulut 20 g, baking soda 1 sdt, garam) dijadikan teks kad bahan Menu 4.
- Perbincangan harga ("3 plus plus… 2 plus plus") dibuang supaya tiada tuntutan harga dalam video kekal.

## Tips memasak yang ditonjolkan (kad TIP)

- Blend rempah tanpa air — terus guna minyak; buat 2–3 batch kalau banyak; 30 s × 2 dah halus
- Cooven Mode Cooker 140 °C, 30 min — kacau setiap 5–10 min; 160–180 °C kalau nak cepat (kerap kacau)
- Pes dah garing bila berbiji, tak bergumpal; lebihan minyak simpan untuk tumis next round
- Cupcake: isi satu sudu (bukan 3/4); Cooven Mode Oven 145 °C, 15 min tanpa preheat; muat 14–16 cup
- Frosting tanpa nozzle → sapu guna pisau; tabur crumbs untuk sembunyi cacat-cela
- Ikan: kelar badan; serai bawah & dalam perut; berus darah hitam dalam perut guna berus gigi khas (tak hanyir)
- Cooven Mode Steam P1/P2/P3 (rendah/sederhana/tinggi), P3 15 min + 2 min selepas curah sos; air ±1 liter
- Masak nasi terus dalam bowl Thermomix yang berlada — air beras bantu "cuci" bowl
- Deep fry: preheat 1–2 min, basket dapat sekali, suhu stabil → masak sekata; 8 L tapi minyak ±1 L pun cukup

## Lawak yang dimasukkan (sticker + SFX)

"Regular customer… patutlah happy", "OCD sikit", "Red… red… red?!", "Terus ke Thailand!", "Cedera parah!",
"Sahabat kamceng", "Mak malas", "Patutlah (nama ubi lambung)", "I'm not a baker", "Jangan cabar saya (cari nozzle)",
"Masak satu, jadi macam-macam", "F.R.E.E? Shhh!", "Rampas limelight", "Kesiannya (ambil gambar sendiri)", blooper.

## Bunyi

- Suara asal dari rakaman (sudah kuat, ~-11 LUFS) — volume 0.85; bahagian Mukmin dinaikkan ×1.3 kerana lebih perlahan
- SFX: whoosh (kad menu/bab), pop (tip), ding (tip penting), boing / ba-dum-tss (lawak), sparkle (hasil siap), impact (hook), chime (penutup)
- Muzik latar ringan (disintesis, bebas hak cipta) pada volume rendah untuk Reels/menu; YouTube hanya di intro & outro
- SFX pustaka dari Pixabay (lihat `shared/sfx/CREDITS.md`)

## Perlu disahkan sebelum render final

1. ~~Nama host Menu 2~~ — disahkan **Piah** (kad, lower-third YouTube & caption dikemas kini).
2. **Ejaan caption** — Whisper kadang salah dengar dialek; perkataan utama sudah dibetulkan (Kuven → Cooven, Turbomix → Thermomix, dll.). Semak caption dalam preview.
3. "Cooven Food Engine" — whisper dengar "Current Food Engine"; caption tulis "Cooven Food Engine".
4. Testimoni "dapat Cooven secara percuma" (promo combo) masih ada dalam video YouTube kerana itu kata-kata live — buang jika promo dah tamat.
5. Ida sebut "chop 5 minit" (mungkin maksud 5 saat) — kad tidak menyebut angka.
