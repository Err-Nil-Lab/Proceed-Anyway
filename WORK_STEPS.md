# PROCEED ANYWAY — One Chat, One Step

Dokumen ini adalah urutan kerja utama proyek.

## Aturan kerja

Setiap chat hanya mengerjakan **satu step aktif**.

Dalam setiap step, Codex harus:

1. membaca kondisi proyek terbaru;
2. mengerjakan hanya scope step tersebut;
3. menjalankan verifikasi yang relevan;
4. memperbaiki error yang masih termasuk scope step;
5. memperbarui status checklist ini;
6. melaporkan hasil dan berhenti;
7. tidak memulai step berikutnya sebelum diminta.

Jika sebuah step belum lolos Definition of Done, statusnya tetap `IN PROGRESS` dan chat berikutnya melanjutkan step yang sama.

Status yang digunakan:

- `[ ]` NOT STARTED
- `[-]` IN PROGRESS
- `[x]` DONE
- `[!]` BLOCKED

---

## Core Proof

### [x] Step 1 — Bootstrap proyek

**Tujuan:** Membuat fondasi TypeScript + KAPLAY + Vite yang dapat dijalankan.

**Pekerjaan:**

- inisialisasi proyek;
- pasang KAPLAY;
- siapkan script `dev` dan `build`;
- buat entry point game;
- tampilkan canvas kosong dengan background hitam;
- buat `config.ts` untuk ukuran arena dan tuning value;
- tambahkan `.gitignore` yang sesuai.

**Definition of Done:**

- dependency berhasil terpasang;
- dev server dapat dijalankan;
- halaman menampilkan canvas tanpa error console;
- `npm run build` berhasil.

**Tidak dikerjakan:** arena, player, movement, atau hazard.

---

### [x] Step 2 — Arena dan player movement

**Tujuan:** Membuktikan bahwa bergerak dan melompat sudah terasa nyaman sebelum menambah permainan.

**Pekerjaan:**

- buat arena tetap berukuran logis 800 × 800;
- buat floor, wall kiri/kanan, dan ceiling;
- tampilkan player sebagai bentuk geometris sederhana;
- implementasi gerak kiri/kanan;
- implementasi jump, gravity, dan grounded check;
- batasi player agar tidak keluar arena;
- tambahkan control hint minimal.

**Definition of Done:**

- A/D dan arrow keys menggerakkan player;
- Space/W/Up melakukan jump;
- tidak ada accidental double jump;
- player tidak menembus batas arena;
- sepuluh kali jump berturut-turut tetap konsisten;
- `npm run build` berhasil.

**Tidak dikerjakan:** hazard, death, score, atau error modifier.

---

### [x] Step 3 — Falling block

**Tujuan:** Menambahkan satu ancaman yang terbaca dengan jelas.

**Pekerjaan:**

- spawn falling block dari atas;
- tambahkan warning sebelum block jatuh;
- randomisasi posisi yang tetap aman dan terbaca;
- hapus hazard setelah keluar arena;
- pindahkan parameter spawn/speed/warning ke `config.ts`.

**Definition of Done:**

- falling block muncul berulang;
- warning selalu muncul sebelum hazard;
- hazard tidak muncul langsung di atas player tanpa kesempatan merespons;
- hazard lama dibersihkan;
- performa tidak menurun setelah dibiarkan berjalan beberapa menit.

**Tidak dikerjakan:** collision yang mematikan atau game over.

---

### [x] Step 4 — Death dan instant restart

**Tujuan:** Membentuk gameplay loop pertama yang lengkap.

**Pekerjaan:**

- collision player dengan falling block;
- state `PLAYING` dan `DEAD`;
- feedback kematian minimal;
- game-over overlay sederhana;
- restart dengan Enter, Space, atau click;
- reset player, hazard, dan timer tanpa reload halaman.

**Definition of Done:**

- menyentuh hazard selalu menyebabkan death;
- game tidak menerima movement saat `DEAD`;
- restart hanya membutuhkan satu input;
- restart tidak me-reload browser;
- lima restart berturut-turut tidak menduplikasi hazard atau timer.

**Tidak dikerjakan:** score, high score, atau visual polish final.

---

### [x] Step 5 — Survival score dan best score

**Tujuan:** Memberikan objective yang terukur untuk setiap run.

**Pekerjaan:**

- survival score bertambah selama `PLAYING`;
- score berhenti saat `DEAD`;
- tampilkan current score;
- simpan best score dengan `localStorage`;
- tampilkan score dan best score pada game-over overlay;
- reset current score saat restart tanpa menghapus best score.

**Definition of Done:**

- current score hanya bertambah saat hidup;
- final score sama dengan score pada saat mati;
- best score hanya diperbarui jika terlampaui;
- best score tetap ada setelah browser refresh;
- corrupted/missing local storage tidak membuat game crash.

---

### [x] Step 6 — Error system dan INPUT_INVERTED

**Tujuan:** Membuktikan identitas utama game: aturan berubah, tetapi perubahan dapat dipahami.

**Pekerjaan:**

- buat `ErrorManager`;
- beri fase awal 12–15 detik tanpa error;
- aktifkan `INPUT_INVERTED` untuk durasi terbatas;
- ubah horizontal input melalui modifier;
- tampilkan announcement saat aktivasi dan recovery;
- tampilkan active error pada HUD;
- reset error dan seluruh timer saat death/restart.

**Definition of Done:**

- hanya gerak horizontal yang terbalik;
- jump tetap sama;
- activation dan recovery terlihat jelas;
- game tetap berjalan saat announcement muncul;
- restart selalu mengembalikan input normal;
- timer error tidak berlipat setelah beberapa restart.

**Gate:** Setelah step ini, evaluasi feel sebelum menambah konten. Jika error terasa seperti bug atau input lag, perbaiki cue dan pacing terlebih dahulu.

---

### [x] Step 7 — Horizontal projectile

**Tujuan:** Menambah jenis keputusan dodge yang berbeda dari falling block.

**Pekerjaan:**

- spawn projectile dari sisi kiri atau kanan;
- tampilkan warning arah masuk;
- buat lintasan dan kecepatan yang dapat diprediksi;
- tambahkan lethal collision;
- bersihkan projectile setelah keluar arena;
- pastikan kombinasi dengan falling block masih dapat dihindari.

**Definition of Done:**

- arah datang selalu dapat dibaca;
- projectile memaksa jump atau repositioning;
- collision konsisten;
- tidak ada spawn combination yang diketahui mustahil;
- repeated restart tidak meninggalkan projectile lama.

---

### [x] Step 8 — GRAVITY_UNSTABLE

**Tujuan:** Menambahkan rule change kedua yang memengaruhi timing, bukan arah input.

**Pekerjaan:**

- tambahkan `GRAVITY_UNSTABLE` ke `ErrorManager`;
- gunakan satu multiplier gravity yang tetap selama satu activation;
- announce activation dan recovery;
- jadwalkan error tanpa overlap untuk Core Proof;
- update HUD active error;
- reset gravity secara aman setelah error/death/restart.

**Definition of Done:**

- jump arc berubah secara jelas tetapi masih dapat dipelajari;
- multiplier tidak berubah acak di tengah activation;
- hanya satu error aktif pada fase Core Proof;
- gravity selalu kembali normal setelah recovery atau restart;
- kedua error dapat muncul dalam beberapa run tanpa state bocor.

---

### [x] Step 9 — Difficulty scaling

**Tujuan:** Membuat tekanan meningkat tanpa mengorbankan readability.

**Pekerjaan:**

- buat difficulty bands berdasarkan survival time;
- tingkatkan hazard speed secara terbatas;
- turunkan spawn interval secara terbatas;
- atur error cooldown berdasarkan fase;
- beri minimum spawn interval dan maximum speed;
- reset difficulty saat restart.

**Definition of Done:**

- perbedaan early, mid, dan late run dapat dirasakan;
- scaling tidak menghasilkan angka tak terbatas;
- early game memberi waktu belajar;
- late game tetap memiliki respons yang mungkin dilakukan;
- semua nilai kembali ke baseline setelah restart.

---

### [x] Step 10 — Near-miss system

**Tujuan:** Memberikan reward untuk dodge yang berisiko dan memuaskan.

**Pekerjaan:**

- tambahkan near-miss area pada falling block;
- prioritaskan lethal collision;
- berikan reward hanya setelah player keluar dari near-miss area dalam keadaan hidup;
- satu hazard hanya dapat memberi satu reward;
- tampilkan `CLOSE CALL +25`;
- tambahkan jumlah close call pada game-over summary.

**Definition of Done:**

- collision tidak pernah menghasilkan near-miss reward;
- satu hazard tidak dapat di-farm berulang;
- bonus score diberikan tepat satu kali;
- feedback terbaca tanpa menutupi hazard;
- restart membersihkan seluruh near-miss state.

---

### [x] Step 11 — Presentation pass

**Tujuan:** Menyatukan seluruh Core Proof menjadi produk kecil yang terasa disengaja.

**Pekerjaan:**

- konsistenkan visual monochrome;
- gunakan typography monospace;
- tambahkan branding `ERR NIL // 001` dan `PROCEED ANYWAY`;
- rapikan HUD active error, score, dan best score;
- rapikan game-over screen;
- tambahkan feedback minimal untuk jump, error, near miss, dan death;
- gunakan CSS/KAPLAY primitive tanpa asset berat.

**Definition of Done:**

- semua teks dapat dibaca;
- arena dan hazard tetap menjadi fokus visual;
- death cause tidak tertutup efek;
- restart CTA jelas;
- visual konsisten di ukuran browser yang berbeda;
- production build berhasil.

**Refinement:** Tambahkan main-menu overlay pada scene yang sama. Gameplay, score, difficulty, error, hazard, dan audio baru dimulai setelah `> PROCEED ANYWAY` dipilih.

**Tidak dikerjakan:** soundtrack, full glitch transition, atau elaborate particle effect.

---

### [x] Step 12 — QA dan playtest build

**Tujuan:** Menguji Core Proof sebagai pengalaman lengkap, bukan sekadar kumpulan fitur.

**Pekerjaan:**

- jalankan browser QA untuk full loop;
- cek console error;
- tes resize, refresh, focus loss, dan repeated restart;
- tes seluruh error/hazard secara manual;
- lakukan playtest kecil jika tester tersedia;
- dokumentasikan temuan sebagai fakta, observasi, dan hipotesis;
- perbaiki blocker dalam scope Core Proof;
- buat production build final.

**Definition of Done:**

- build dapat dimainkan dari awal sampai beberapa kali game over;
- tidak ada blocker atau console error yang diketahui;
- state tidak bocor antar-run;
- control dipahami dalam sekitar 10 detik;
- activation dan recovery error dapat dipahami;
- penyebab death terlihat;
- production build berhasil dijalankan.

Setelah Step 12, **Core Proof selesai**.

---

## Core Proof Refinement

Refinement memperbaiki feel yang ditemukan setelah Core Proof. Bagian ini harus selesai sebelum menambah hazard atau error baru.

### [x] Step 12A — Near-miss parity dan generous tuning

**Tujuan:** Membuat close call lebih mudah terpicu secara sengaja dan konsisten pada kedua hazard.

**Pekerjaan:**

- ubah near-miss padding menjadi nilai per-axis agar bentuk zona mengikuti arah gerak hazard;
- perluas zona falling block secara moderat, terutama pada sumbu horizontal;
- tambahkan near-miss area pada horizontal projectile, terutama pada jarak vertikal saat player melompat;
- gunakan `NearMissTracker` yang sama untuk kedua hazard;
- tetap prioritaskan lethal collision dan reward hanya setelah keluar dari zona dalam keadaan hidup;
- pindahkan seluruh tuning value ke `config.ts`;
- tambahkan tes untuk falling block, projectile, collision priority, dan one-reward-per-hazard.

**Starting hypothesis:**

- falling block: padding horizontal lebih besar daripada vertikal;
- horizontal projectile: padding vertikal lebih besar daripada horizontal;
- nilai final harus ditentukan lewat browser feel test, bukan hanya hitungan geometri.

**Definition of Done:**

- close call falling block lebih sering terbaca tanpa memberi bonus dari jarak yang terasa aman;
- melompati projectile dengan jarak tipis memberi `CLOSE CALL +25`;
- collision tidak pernah memberi bonus;
- setiap hazard hanya dapat memberi satu bonus;
- feedback dan close-call counter bekerja sama untuk kedua hazard;
- production build berhasil.

---

### [x] Step 12B — Calculated-random encounter director

**Tujuan:** Menghasilkan encounter single, double, dan triple yang tidak terasa terjadwal, tetapi selalu memiliki respons yang masuk akal.

**Pekerjaan:**

- ganti antrean satu-hazard dengan encounter yang dapat berisi 1–3 spawn;
- pertahankan falling block tunggal sebagai encounter pertama agar onboarding tetap terbaca;
- pilih encounter size berdasarkan difficulty: early dominan single, mid membuka double, late membuka triple;
- dukung kombinasi vertical + horizontal, double vertical, double horizontal, dan kombinasi tiga hazard;
- randomisasi jenis, posisi, arah, dan stagger di dalam batas setiap encounter;
- beri jarak minimum antar-lane vertical agar tidak membentuk dinding tanpa celah;
- larang projectile berlawanan arah yang menutup jump window pada saat bersamaan;
- batasi active hazard count sesuai difficulty band;
- validasi setiap kandidat terhadap response window minimum sebelum spawn;
- jika kandidat tidak valid, reroll terbatas lalu fallback ke encounter yang aman;
- jadwalkan encounter berikutnya dari waktu mulai encounter, bukan menunggu seluruh hazard sebelumnya keluar;
- pertahankan warning individual sebelum setiap hazard;
- reset encounter history, active count, dan seluruh timer saat restart;
- buat pemilihan encounter sebagai sistem terpisah yang dapat dites secara deterministik.

**Difficulty envelope awal:**

- `LOW`: maksimum 1 active hazard; hanya single encounter;
- `RISING`: maksimum 2 active hazards; single dan double;
- `CRITICAL`: maksimum 3 active hazards; single, double, dan triple dengan bobot triple tetap rendah.

**Kenapa bukan random timer independen:** Random murni dapat menutup semua jalur respons. Encounter templates menjaga surprise pada komposisi dan timing sambil tetap menjamin ada solusi.

**Definition of Done:**

- hazard baru dapat mulai sebelum hazard lama keluar;
- single, mixed double, same-type double, dan sedikitnya satu triple dapat dihasilkan;
- LOW tidak pernah menghasilkan overlap;
- RISING tidak pernah melampaui dua active hazards;
- CRITICAL tidak pernah melampaui tiga active hazards;
- double vertical selalu memiliki lane spacing yang dapat dilalui;
- kombinasi projectile tidak menutup jump window secara mustahil;
- first hazard tetap memberi waktu belajar;
- warning dan minimum response window selalu terjaga;
- fixed-seed simulation sekurangnya 1.000 encounter tidak melanggar constraint;
- tidak ada state leak setelah restart;
- production build berhasil.

---

### [ ] Step 12C — Refinement QA dan micro-playtest

**Tujuan:** Menentukan apakah perubahan benar-benar mengurangi predictability dan memperbaiki close-call feel.

**Pekerjaan:**

- browser QA kedua jenis near miss dan beberapa urutan spawn;
- cek collision boundary, repeated restart, refresh, dan console;
- catat sekurangnya 30 hasil pemilihan hazard untuk memeriksa repeat cap dan variasi;
- lakukan satu micro-playtest tanpa menjelaskan aturan near miss atau scheduler;
- pisahkan temuan menjadi fakta, observasi, dan hipotesis;
- hanya tune threshold, weight, dan interval—jangan menambah mekanik baru.

**Pertanyaan playtest:**

1. Kapan kamu merasa melakukan dodge yang berisiko?
2. Apakah game memberi reward pada momen yang sama?
3. Kapan kamu mulai bisa menebak hazard berikutnya?
4. Adakah kematian yang terasa mustahil direspons?

**Definition of Done:**

- pemain mendapat setidaknya satu close call dari masing-masing hazard dalam sesi yang wajar;
- reward tidak terasa muncul dari jarak aman;
- tester tidak dapat menyebut pola alternation tetap;
- tidak ditemukan rangkaian spawn yang mustahil;
- hasil QA ditambahkan ke `QA_REPORT.md`;
- production build final berhasil.

---

## Optional Expansion

Optional Expansion tidak otomatis dikerjakan. Masing-masing tetap satu chat dan hanya dimulai jika Core Proof sudah lolos.

### [x] Step 13 — Moving wall

- implementasi wall horizontal dengan safe gap rendah, menengah, atau tinggi;
- tampilkan bentuk safe gap selama warning sebelum wall masuk;
- integrasikan wall sebagai single encounter atau pasangan dengan falling block;
- larang double wall, wall + projectile, dan wall pada triple encounter;
- tambahkan lethal collision dan near-miss scoring di tepi gap;
- perluas cleanup, active-slot accounting, dan reset;
- verifikasi constraint dengan fixed-seed simulation dan safe-gap geometry check;
- berhenti setelah hazard ketiga stabil.

### [x] Step 14 — WORLD_SHIFT

- geser falling-block spawn lane ke kiri atau kanan selama activation;
- clamp lane agar warning dan block selalu berada di dalam arena;
- announce `LANES LEFT` atau `LANES RIGHT` dan tampilkan error pada HUD;
- pertahankan floor dan collision arena tanpa perubahan;
- reset arah shift saat recovery, death, dan restart;
- verifikasi transformasi lane dan production build.

### [-] Step 15 — Overlapping errors

- tambahkan `ARENA_COMPRESSED`: batas arena menyempit dari kiri, kanan, atau
  kedua sisi secara bertahap, lalu kembali terbuka saat error selesai;
- tambahkan `ICE_FLOOR`: akselerasi melemah dan momentum bertahan lebih lama
  ketika input dilepas;
- masukkan kedua error ke rotasi dan allowlist overlap dengan batas maksimum
  dua error aktif;
- reset seluruh state dan visual compression saat death/restart;
- verifikasi TypeScript dan production build tanpa browser QA.

- izinkan maksimum dua error setelah 70 detik dengan stagger 2,5 detik;
- allowlist `INPUT_INVERTED + GRAVITY_UNSTABLE`;
- allowlist `INPUT_INVERTED + WORLD_SHIFT`;
- allowlist `GRAVITY_UNSTABLE + WORLD_SHIFT`;
- blok error duplikat dan semua triple stack;
- tampilkan seluruh error aktif pada HUD dan recovery tanpa menghapus error lain;
- reset seluruh modifier dan timer saat death/restart;
- deterministic test seluruh pair, batas waktu 70 detik, dan maksimum dua error;
- manual-survive setiap kombinasi di browser sebelum status menjadi DONE.

### [x] Step 16 — Audio dan extra juice

- tambahkan procedural SFX untuk jump, tiga jenis warning, error, recovery, near miss, dan death;
- unlock audio hanya setelah input pertama agar sesuai browser autoplay policy;
- gunakan SFX procedural dengan volume dan durasi pendek;
- gunakan `gameplay-proceed-anyway.mp3` sebagai looping BGM setelah input pertama;
- simpan BGM di `public/audio/bgm/` dan cegah duplikasi saat restart;
- pertahankan jump mark, warning pulse, death flash, dan close-call rise;
- gunakan screen shake kecil untuk error/near miss dan lebih kuat untuk death;
- gunakan impact slow-motion singkat saat error dan death;
- tambahkan variable jump height melalui tap untuk short hop dan hold untuk full jump;
- lebarkan moving-wall safe gap agar kedua jump height punya ruang respons;
- pisahkan visual player dari collider agar idle pulse, movement lean, jump rotation, dan landing squash tidak mengubah hitbox;
- pastikan feedback tidak menutupi hazard atau menambah mekanik baru;
- production build berhasil.

---

## Current status

**Active step:** Step 15 — Menunggu manual-survive tiga error pair dari user

**Last completed step:** Step 14 — WORLD_SHIFT

**Next instruction to start:** `Review hasil playtest overlap dan audio.`
