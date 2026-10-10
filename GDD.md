# PROCEED ANYWAY — Game Design Document

**Versi:** 0.1  
**Diperbarui:** 2026-10-06  
**Status:** Core Proof dibuat; ekspansi dan pengujian rasa bermain masih berlangsung  
**Platform:** browser desktop, keyboard; TypeScript + KAPLAY + Vite

Dokumen ini menyimpan arah desain agar diskusi lintas chat konsisten. `src/config.ts` dan kode terkait adalah acuan angka/perilaku build terbaru. `WORK_STEPS.md` adalah acuan status pekerjaan; `QA_REPORT.md` adalah acuan bukti pengujian. `MVP_PLAN.md` menyimpan baseline awal yang dapat berbeda dari build sekarang. Jika dua sumber berbeda, tunjukkan perbedaannya sebelum mengubah keputusan. Instruksi terbaru dari pemilik game tetap berlaku.

## 1. Inti game

**Premis `TETAP`:** Pemain bertahan hidup di satu arena dengan membaca ancaman fisik dan beradaptasi saat sistem game sementara mengubah aturannya.

**Bentuk `BERJALAN`:** survival arcade 2D dengan run berulang, kematian instan, skor, dan restart cepat. Tujuan pemain adalah bertahan lebih lama serta mengambil close call saat aman. Target audiens spesifik dan durasi sesi ideal masih `TERBUKA`.

**Janji pengalaman `TETAP`:** sistem terasa mengganggu dan mengejutkan, tetapi pemain masih bisa memahami perubahan, memilih respons, dan mengerti penyebab kematian. Risiko desain utamanya adalah error terasa seperti bug acak atau hazard terasa mustahil dihindari.

## 2. Pilar desain

| Pilar `TETAP` | Tanda berhasil | Batas keputusan |
| --- | --- | --- |
| Ancaman terbaca | Pemain melihat warning dan punya waktu merespons. | Jangan menambah kejutan yang menghilangkan jalur respons. |
| Aturan berubah dengan jelas | Pemain melihat cue sebelum efek, tahu kapan aktif dan pulih. | Jangan mengubah kontrol/fisika tanpa telegraph dan indikator aktif. |
| Cepat mencoba lagi | Kematian memberi sebab yang terlihat, lalu satu input memulai run baru. | Jangan membuat transisi atau menu berulang yang menghambat restart. |

Ini adalah kriteria desain, bukan klaim bahwa semua pemain sudah merasakannya. Keterbacaan dan fairness subjektif masih perlu diuji dengan manusia.

## 3. Loop pemain

1. Dari menu awal, pilih `> PROCEED ANYWAY`; skor, difficulty, hazard, error, dan audio mulai.
2. Gerakkan kotak pemain dan baca warning posisi/arah hazard.
3. Hindari hazard sambil menyesuaikan gerak saat error sistem memberi cue, aktif, lalu pulih.
4. Skor bertambah selama hidup. Dodge dekat yang berhasil memberi `CLOSE CALL +25`.
5. Setelah tabrakan, animasi kematian singkat menuju `FATAL ERROR`; pemain melihat skor, best score, jumlah close call, lalu restart dengan satu input. Best score lokal bertahan setelah refresh.

Status alur di atas: `BERJALAN` menurut `src/main.ts`, `src/systems/scoring.ts`, dan `src/config.ts`.

## 4. Aturan pemain dan arena

- Arena logis 800 × 800 dengan lantai, dinding kiri/kanan, dan langit-langit. Canvas diskalakan dalam browser. Nilai terkini: `src/config.ts`.
- `A/D` atau panah kiri/kanan untuk gerak horizontal; `Space/W/Up` untuk lompat. Tap menghasilkan short hop, hold menghasilkan lompatan lebih tinggi. `INPUT_INVERTED` membalik gerak horizontal saja. `ICE_FLOOR` membuat akselerasi dan perlambatan lebih lemah.
- State run: `MENU → PLAYING → DYING → DEAD → PLAYING`. Menu hanya pada load awal; restart tidak kembali ke menu. Input gameplay aktif saat `PLAYING`.
- Lethal collision mengakhiri run. Semua hazard, warning, modifier, dan timer run harus dibersihkan saat mati/restart.

## 5. Hazard dan encounter

| Hazard `BERJALAN` | Warning | Respons utama | Batas penting |
| --- | --- | --- | --- |
| Falling block | Posisi jatuh ditandai sebelum block turun. | Pindah dari jalurnya. | Encounter pertama selalu satu block tengah agar pemain dapat belajar. |
| Horizontal projectile | Sisi dan ketinggian lintasan ditandai. | Lompat atau reposisi. | Projectile berdekatan tidak diarahkan saling berlawanan hingga menutup jump window. |
| Moving wall | Siluet bagian solid dan safe gap terlihat sebelum wall masuk. | Masuk ke celah rendah/tinggi yang sesuai. | Tidak dipasangkan dengan projectile, wall lain, atau triple encounter. |

`HazardDirector` memilih encounter terkontrol: `LOW` maksimal satu hazard terisi, `RISING` dua, `CRITICAL` tiga. Warning yang masih menunggu juga memakai slot. Encounter berikutnya bisa mulai sebelum hazard sebelumnya hilang. Posisi, komposisi, arah, kecepatan, dan jarak waktu bervariasi di dalam batas; algoritme persisnya ada di `src/systems/hazardDirector.ts`.

**Invariant `TETAP`:** setiap ancaman harus memberi petunjuk dan jalur respons yang masuk akal. Simulasi kombinasi dan pengecekan geometri sudah ada dalam `QA_REPORT.md`, tetapi fairness saat dimainkan manusia masih `PERLU UJI`.

## 6. Error sistem

| Error `BERJALAN` | Perubahan | Informasi untuk pemain |
| --- | --- | --- |
| `INPUT_INVERTED` | Arah gerak horizontal terbalik; jump tetap sama. | Telegraph, announcement, HUD, recovery. |
| `GRAVITY_UNSTABLE` | Gravity dikali nilai tetap selama satu aktivasi. | Telegraph, announcement, HUD, recovery. |
| `WORLD_SHIFT` | Jalur spawn falling block bergeser kiri/kanan dan tetap di dalam arena; lantai dan batas fisik arena tidak bergeser. | Arah `LANES LEFT/RIGHT` diumumkan. |
| `ARENA_COMPRESSED` | Area gerak menyempit bertahap dari kiri, kanan, atau keduanya. | Cue di tepi arena, dinding visual, HUD. |
| `ICE_FLOOR` | Momentum horizontal bertahan lebih lama. | Cue lantai, announcement, HUD. |

Error pertama dijadwalkan setelah 8 detik permainan, lalu telegraph 0,5 detik sebelum efeknya. Aktivasi berlangsung 9 detik. Setelah 28 detik, error kedua dapat menyusul dengan jeda 1,8 detik. Maksimum dua error aktif; pasangan harus lolos allowlist di `src/systems/errors.ts`. Error dipilih melalui shuffled bag agar kelima jenis muncul satu kali per bag tanpa urutan tetap. HUD menampilkan semua error aktif dan hitung mundurnya; pemulihan satu error tidak menghapus yang lain. Angka terkini selalu cek `src/config.ts`.

**Invariant `TETAP`:** error bersifat sementara, jelas awal/akhirnya, tidak lebih dari dua sekaligus, dan hilang sepenuhnya saat mati/restart. Kelayakan semua kombinasi dalam browser masih `PERLU UJI`; Step 15 di `WORK_STEPS.md` belum selesai.

## 7. Skor, difficulty, dan reset

- Skor survival: 10 poin per detik saat `PLAYING`; close call: +25, maksimal sekali per hazard. Reward baru diberikan setelah pemain keluar dari zona dekat dalam keadaan hidup; tabrakan memprioritaskan kematian. Sumber: `src/systems/scoring.ts`, `src/systems/nearMiss.ts`, `src/config.ts`.
- Best score disimpan lokal melalui `localStorage`, dan kegagalan akses storage tidak menghentikan run.
- Difficulty `LOW` sejak awal, `RISING` pada 18 detik, `CRITICAL` pada 38 detik. Kenaikan tekanan berasal dari interval encounter, batas hazard aktif, kecepatan, dan cooldown error yang dibatasi. Angka tuning lebih rinci ada di `src/config.ts`.
- Saat mati, skor membeku dan BGM berhenti; death animation berlangsung sebelum overlay. Restart langsung membuat run baru, memulihkan aturan normal dan memulai BGM dari awal.

## 8. Presentasi

- Identitas: `ERR NIL // 001`, `PROCEED ANYWAY`, bentuk geometris, tipografi monospace, latar hampir hitam, hazard putih. Merah dipakai untuk informasi error sistem.
- Hierarki: arena/warning lebih penting daripada dekorasi; HUD menampilkan skor, best, difficulty, dan error aktif. Announcement sementara tidak menghentikan gameplay.
- SFX singkat untuk gerak/ancaman/error/close call/kematian; BGM memakai `public/audio/bgm/gameplay-proceed-anyway.mp3`. Audio dimulai setelah input pemain.
- Animasi dan shake memberi rasa benturan tetapi collider tetap terpisah dari tampilan kotak pemain. Nilai presentasi ini `BERJALAN`; loudness, keterbacaan berbagai kondisi, dan rasa bermain masih `PERLU UJI`.

## 9. Scope dan bukti

**Dibuat:** Core Proof, near miss untuk tiga hazard, encounter director, moving wall, lima error, menu awal, BGM/SFX, animasi pemain dan kematian. Ini deskripsi build, bukan persetujuan otomatis bahwa seluruh fiturnya sudah lulus playtest.

**Belum dinyatakan selesai:** Step 12C (refinement QA dan micro-playtest) dan Step 15 (manual-survive/feel test overlap) menurut `WORK_STEPS.md`. Catatan QA terakhir juga menyebut browser feel test untuk beberapa perubahan terbaru masih pending. Jangan menyebut keduanya tervalidasi sampai bukti baru dicatat.

**Di luar scope saat ini:** near-miss combo, arena prosedural, controller/mobile, fitur online, dan menu/settings/pause lengkap. Perlu keputusan baru sebelum menjadi pekerjaan aktif.

**Pertanyaan `TERBUKA`:** Siapa pemain sasaran utama? Apakah semua lima error memperkaya keputusan pemain? Pada difficulty tinggi, kombinasi apa yang terasa mustahil meski lolos simulasi? Apakah close call terasa tepat waktunya? Jawab lewat observasi playtest sebelum menambah mekanik.

## 10. Aturan kerja lintas chat

Pada awal chat baru, berikan GDD ini bersama tugas spesifik. Gunakan instruksi berikut:

> Pakai `GDD.md` untuk tujuan dan batas desain Proceed Anyway. Cek `src/config.ts`/kode untuk kondisi build sekarang, `WORK_STEPS.md` untuk status step, dan `QA_REPORT.md` untuk bukti. Pisahkan fakta build, observasi pemain, hipotesis, dan usulan. Jangan menganggap rencana awal atau checklist `[x]` sebagai bukti pengalaman pemain sudah tervalidasi. Jika idemu mengubah pilar atau invariant, jelaskan alasan dan dampaknya sebelum mengubah GDD. Kerjakan tugas yang kuminta, verifikasi sesuai risikonya, lalu perbarui bagian dokumen yang terdampak. Instruksi terbaruku mengatasi keputusan lama.

Setelah keputusan desain berubah, catat di bawah dan perbarui aturan terkait. Setelah implementasi atau playtest, perbarui status/bukti yang terdampak.

## 11. Log keputusan GDD

| Tanggal | Keputusan / dasar | Dampak |
| --- | --- | --- |
| 2026-10-06 | GDD disusun dari build, `MVP_PLAN.md`, `WORK_STEPS.md`, dan `QA_REPORT.md`. | Angka dan status mutakhir dirujuk ke sumbernya; bagian yang menunggu playtest tetap ditandai. |
