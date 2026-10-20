# Guardian demo video, rancangan 5 menit

Status **draft editorial untuk ditinjau**. Permintaan Dien pada 20 Oktober 2026. Pemetaan mengikuti kriteria dan subkriteria pada gambar yang diberikan Dien, dengan bobot internal yang dicatat di AGENTS.md Shenzhen. Pemetaan ini bukan prediksi nilai juri.

Video acuan adalah `../AI-I_Couldve_Done_It_Father-DemoVideo.mp4`. FFprobe mengukur **154,752 detik**, 1920 × 1080, 30 fps. Rancangan ini menargetkan **298 detik atau 4 menit 58 detik**, sehingga menambah sekitar **2 menit 23 detik** dan menyisakan 2 detik dari batas 5 menit. Durasi tersebut merupakan anggaran edit, bukan hasil render baru.

## File yang dipakai

- `narration.json` dan `src/timeline.ts` tetap menjadi sumber render versi lama. README video dan outline lama ada di `../docs/TASKS.md` bagian 9.
- **Dokumen ini** menjadi rancangan scene versi panjang, termasuk instruksi rekaman, ilustrasi, batas klaim, dan pemetaan penilaian.
- **`narration.5min.json`** adalah naskah Inggris versi panjang, dengan ID `v2-*`. Kolom `text` untuk subtitle dan `say` untuk pengucapan angka atau alamat web.
- Aset suara, durasi TTS, dan rekaman lama belum mencakup naskah baru. Mengganti import JSON saja belum menghasilkan video versi panjang yang benar. Produksi dan render dilakukan setelah rancangan ditinjau.

## Pilihan editorial

| Pendekatan | Dampak |
|---|---|
| Memperlambat rekaman lama saja | Memberi waktu membaca, tetapi masih kurang bukti klarifikasi, fallback, dan perencanaan |
| **Rekomendasi, demo nyata diselingi ilustrasi pendek** | Mengisi kekurangan subkriteria sambil menjelaskan alasan keamanan dan manfaatnya |
| Memperbanyak diagram teknis | Menjelaskan arsitektur, tetapi mengurangi waktu untuk membuktikan tugas benar-benar selesai |

Pertahankan satu cerita utama tentang Budi, Rina, teman, kerabat, dan mosque fund yang membantu membayar lintas negara. Kekuatan yang ditonjolkan adalah hubungan antara tagihan, rekening tujuan, persetujuan tiap orang, dan catatan refund dalam satu kasus. Jangan mengklaim produk pertama di dunia atau seluruh rumah sakit sudah terverifikasi.

## Timeline keseluruhan

Semua transisi, jeda baca, intro, dan outro sudah termasuk dalam anggaran berikut. Timecode memakai rentang awal inklusif dan akhir eksklusif.

| Scene | Waktu | Durasi | Bentuk | Perubahan utama | Subkriteria utama |
|---|---|---|---|---|---|
| 01 Disclaimer | 00:00–00:06 | 6 dtk | Ilustrasi | Perjelas sandbox dan tidak ada bank settlement | S5, S6 |
| 02 Masalah lintas negara | 00:06–00:23 | 17 dtk | Ilustrasi | Peta orang, mata uang, dan dokumen yang terpisah | I1, I2 |
| 03 Tim dan produk | 00:23–00:33 | 10 dtk | Presenter dan ilustrasi | Sebut Dien dan Aurel secara lisan | I1, I2 |
| 04 Kasus dan sumber rekening | 00:33–00:49 | 16 dtk | Website dan ilustrasi | Bedakan listing rumah sakit dari otoritas pembayaran | S1, S3, S5 |
| 05 Rencana kerja | 00:49–01:03 | 14 dtk | Website dan ilustrasi | **Baru**, next step berdasarkan status kasus | T3, T4 |
| 06 Penjelasan tagihan | 01:03–01:30 | 27 dtk | Website | Perbesar bukti hitungan dan sitasi | T1, T4, I2 |
| 07 Bahasa sehari-hari dan klarifikasi | 01:30–01:51 | 21 dtk | Website | **Baru**, permintaan ambigu lalu koreksi maksud | T2, I3, I4, I5, I6 |
| 08 Gagal baca dan fallback | 01:51–02:07 | 16 dtk | Website | **Baru**, file diganti dan second check unavailable | I5, S6 |
| 09 Pledge, withdrawal, konfirmasi | 02:07–02:46 | 39 dtk | Website | Tambah gagal di bawah 100% dan withdrawal sebelum charge | T1, T4, S5, S6 |
| 10 Batas peran | 02:46–03:00 | 14 dtk | Website dan bukti uji | **Baru**, payer dan companion, termasuk penolakan server | S2, S3 |
| 11 Refund dan receipt | 03:00–03:19 | 19 dtk | Website | Jelaskan perhitungan, status tracking, dan receipt bersama | T1, T4, I2 |
| 12 Rekening palsu | 03:19–03:38 | 19 dtk | Website | Tunjukkan hold yang benar-benar memblokir pembayaran | S1, S5, S6 |
| 13 Injeksi PDF dan ekstraksi data | 03:38–03:56 | 18 dtk | Website dan ilustrasi | **Baru**, bedakan data dokumen dari instruksi | S2, S4 |
| 14 Cara kerja pertahanan | 03:56–04:12 | 16 dtk | Ilustrasi | **Baru**, AI, kode, dan manusia punya tugas terpisah | T3, T4, S2, S3, S4 |
| 15 Penutupan dan audit | 04:12–04:28 | 16 dtk | Website dan ilustrasi | Benar-benar tutup kasus dan buktikan read-only | T1, S5 |
| 16 Hasil dan cara verifikasi | 04:28–04:50 | 22 dtk | Kartu bukti | Pisahkan unit tests, bukti historis, dan keterbatasan | T1, I2 |
| 17 Penutup | 04:50–04:58 | 8 dtk | Presenter dan ilustrasi | URL demo dan arahan masuk demo | I3 |

## Rancangan tiap scene

### 01 Disclaimer, 00:00–00:06

Tampilkan ikon shield dan label besar `Synthetic data`, `Sandbox payments`, dan `No bank settlement`. Jangan menampilkan animasi uang yang tiba di rekening rumah sakit. Label kecil sandbox tetap terlihat pada scene pembayaran. Ini menetapkan konteks demo, bukan pengganti bukti kontrol keamanan.

### 02 Masalah lintas negara, 00:06–00:23

Pakai ulang ilustrasi orang dan rumah sakit yang sudah ada. Budi berada di Shenzhen dengan tagihan CNY. Adi di Jakarta memakai IDR, Sari di Kuala Lumpur memakai MYR, dan Fajar di Dubai memakai AED. Tiga potongan dokumen terpisah diberi label estimate, bill, dan payment request, lalu masuk ke satu care case. Utamakan masalah keputusan dan koordinasi, bukan tambahan statistik. Angka crowdfunding dari studi 2021 tidak perlu diperpanjang atau dipresentasikan sebagai kondisi terbaru.

### 03 Tim dan produk, 00:23–00:33

Nama tim `I Could've Done It Father`, Dien dan Aurel, serta Topic C muncul jelas. Sebut kedua nama dalam narasi. Gunakan presenter asli bila tersedia. Jika belum ada rekaman presenter, gunakan kartu nama dan ilustrasi, bukan kotak kosong bertuliskan `Presenter video`. Tampilkan hubungan `Understand bill → Agree shares → Record outcome` sebagai nilai produk, bukan janji transfer bank yang sudah berjalan.

### 04 Kasus dan sumber rekening, 00:33–00:49

Rekam care case, Case Members, dan menu akun rumah sakit. Role badge harus mengikuti orang yang sedang ditampilkan. Sisipkan ilustrasi dua gerbang terpisah `Hospital profile` dan `Payment authority`. Sebuah profil rumah sakit yang tersedia di direktori tidak otomatis memperoleh izin pembayaran. Skenario memakai rumah sakit dan signed registry sintetis. Verifikasi institusi nyata membutuhkan pemeriksaan manusia, jangan menganimasikan persetujuan rumah sakit nyata yang tidak pernah dilakukan.

### 05 Rencana kerja, 00:49–01:03

Perbesar strip **What to do next** pada Agent Office. Sorot langkah selesai dan langkah berikutnya yang berasal dari status kasus. Lanjutkan dengan urutan ilustratif `Read → Compare → Verify recipient → Collect pledges → Owner confirms → Track refund`.

Ini adalah penjelasan workflow yang sudah diimplementasikan. Planner mengklasifikasikan intent dan mengusulkan aksi dari daftar tetap. Jangan menampilkan terminal palsu berisi autonomous planning, chain-of-thought, atau klaim bahwa LLM merancang dan menjalankan semua langkah sendiri. Sumber implementasi ada di `src/components/office/NextSteps.tsx` dan `src/server/agent.ts`.

### 06 Penjelasan tagihan, 01:03–01:30

Pakai Bill Review untuk interim bill 40 baris dengan total CNY 36.782. Zoom penjelasan tambahan dua hari yang menghasilkan CNY 3.000, lalu sumber barisnya. Tunjukkan duplicate CBC sebagai pertanyaan untuk billing, bukan kesimpulan penipuan. Bedakan hitungan dari kode, pernyataan dalam dokumen, dan hal yang perlu ditanyakan ke rumah sakit. Tahan satu contoh sitasi sekitar 3 detik agar terbaca. Jangan menganggap teks dokumen sebagai diagnosis yang sudah terverifikasi.

### 07 Bahasa sehari-hari dan klarifikasi, 01:30–01:51

Rekam dua pesan pengguna pada assistant dalam kasus yang memiliki interim dan final bill.

1. Rina mengetik `bayarin aja yg kemarin dong`.
2. Tampilkan respons aktual yang menanyakan tagihan mana, beserta pilihan bill. Beri terjemahan Inggris pada caption.
3. Rina mengoreksi maksudnya dengan `jelasin tagihan interim dulu ya`.
4. Tampilkan aksi atau tautan penjelasan interim yang benar, kemudian buka penjelasannya.

Overlay singkat `Clarify first · Nothing paid`. Ini menunjukkan pemahaman bahasa informal, satu pertanyaan yang spesifik, dan koreksi dari niat membayar menjadi ingin memahami tagihan. Jangan mengganti pesan kedua menjadi pelunasan final dalam fixture default. Deposits dan request yang sudah ada dapat menutup saldo final sehingga tidak ada pembayaran baru yang sah untuk disiapkan. Tidak ada narasi bahwa chat telah mengotorisasi pembayaran. Contoh D6 memiliki bukti di `evidence/run-2026-10-18-clean-clone/summary.md` dan uji `src/server/agent.test.ts`.

### 08 Gagal baca dan fallback, 01:51–02:07

Dua insert pendek dengan label `Recovery example`.

- Rekam unggahan `testing/safety/04-blank-document.pdf` atau file PDF rusak yang menghasilkan `needs_reupload`. Tampilkan alasan gagal, gunakan kontrol penggantian file, lalu tampilkan hasil file pengganti yang sudah terbaca. Kegagalan tidak boleh dipotong seolah pembacaan selalu berhasil.
- Tunjukkan hasil second check yang memang `unavailable`, tanpa centang keberhasilan. Jika perlu fault injection terkontrol di lingkungan lokal, labeli `Simulated service outage`. Jangan mengganti respons server dengan teks sukses buatan. Angka hasil perhitungan tetap tersedia, tetapi tidak berubah menjadi hasil second check yang sudah terverifikasi.

Tanggal 20 Oktober memiliki timeout web 15 detik yang tercatat di `evidence/live-services-2026-10-20/interactive-second-model.json`. Hasil background yang berhasil tidak boleh dipakai untuk berpura-pura bahwa request web tersebut sukses.

### 09 Pledge, withdrawal, konfirmasi, 02:07–02:46

Rekam rangkaian utama berikut dengan UI yang dapat dibaca.

1. Tampilkan emergency guarantee CNY 50.000, dengan CNY 45.000 yang sudah pledged. Jumlah guarantee dimasukkan manual dari surat, bukan hasil ekstraksi surat otomatis.
2. Tampilkan kondisi belum 100% sehingga pembayaran belum dapat dijalankan. Bila tombol UI tidak tersedia, jangan membuat modal gagal palsu. Kondisi UI bisa dipadukan dengan bukti D4 yang mencatat penolakan check 4.
3. Beralih ke mosque fund, tampilkan IDR, kurs, fee, dan batas bagiannya.
4. Pledge sisa CNY 5.000. Jangan percepat layar persetujuan sampai nilai tidak terbaca.
5. Klik **Withdraw** selama pending. Coverage turun lagi. Pledge ulang untuk mengembalikan coverage.
6. Beralih ke Rina. Tampilkan review dan konfirmasi, lalu receipt per payer.

Withdrawal membatalkan pledge yang belum ditagih. Tidak ada fitur membatalkan transfer bank yang sudah selesai. Rekaman demo memakai sandbox receipt. Jangan menamainya Stripe PaymentIntent bila data aktual hanya berisi referensi sandbox. Label `Reference FX` dan `No hospital bank settlement` tampak pada bagian yang relevan.

### 10 Batas peran, 02:46–03:00

Bandingkan tampilan payer dengan companion melalui demo role switch yang diberi label jelas. Pada payer, zoom financial details miliknya dan ringkasan bill. Pada companion, tunjukkan kontrol pembayaran yang tidak tersedia. Kemudian tampilkan kutipan bukti A4, yang mencatat penolakan companion, quote orang lain, batas share, dan payer yang mencoba membuat request.

UI yang menyembunyikan tombol saja bukan bukti enforcement server. Karena itu rekaman UI dipasangkan dengan hasil uji backend yang benar, bukan HTTP 403 buatan. Jangan mengklaim seluruh invoice privat terhadap payer. File invoice memang dapat dilihat semua anggota kasus. Batas akses ada di `docs/TECHNICAL.md` bagian 5 dan `evidence/run-2026-10-18-clean-clone/summary.md` A4.

### 11 Refund dan receipt, 03:00–03:19

Rekam reconciliation dengan deposits CNY 80.000, final bill CNY 71.000, dan refund CNY 9.000. Sorot dua alokasi anggota, lalu ringkasan total. Pembagian fixture adalah Rina 3.375, Adi 2.250, Sari 1.687,50, Fajar 1.125, dan mosque fund 562,50. Jumlahnya harus tepat CNY 9.000.

Tampilkan receipt yang sesuai setiap paid request. Pakai `testing/references/01-initial-deposit-receipt.pdf` untuk request deposit yang cocok. Request guarantee CNY 50.000 memerlukan fixture receipt sintetis yang sesuai jumlah tersebut, diberi label demo. Jangan memakai final medical bill sebagai payment receipt. Tampilkan peringatan bahwa semua case member dapat membuka invoice, sehingga pengguna perlu membuang informasi sensitif sebelum unggah. Guardian menghitung dan melacak refund, bukan mengirim pengembalian bank.

### 12 Rekening palsu, 03:19–03:38

Awali label `Independent attack test`. Gunakan kasus uji terpisah dengan request yang sudah penuh dan masih dapat dibayar sebelum serangan. Companion mengirim rekening palsu `6222 9999 8888 7777`. Tampilkan warning dan hold. Owner mencoba melanjutkan dan mendapat penolakan nyata. Tunjukkan arahan menuju official billing channel.

Jangan memakai request yang sudah dibayar sebagai bukti bahwa serangan memblokir pembayaran, karena request tersebut memang tidak dapat dieksekusi ulang. Akun dari chat tidak ditambahkan ke registry. Bukti A1 dan A7 mendukung batas ini.

### 13 Injeksi PDF dan ekstraksi data, 03:38–03:56

Gunakan kasus uji baru lagi agar tidak mewarisi hold dari scene 12. Tampilkan cuplikan instruksi berbahaya pada `fixtures/pdf/interim-bill-injected.pdf`, misalnya perintah mengabaikan aturan dan memakai rekening baru. Data semuanya sintetis.

Rekam warning hasil upload dan tampilkan bukti A2 yang mencatat rekening tersebut ditolak di check 1. Ilustrasikan panah PDF menuju Reader berakhir di data bertipe. Panah PDF menuju daftar rekening diberi tanda blok. Reader tidak memiliki payment tools. Tambahkan insert respons aktual atau bukti A5 saat seseorang meminta medical records dan nomor kartu. Jangan mengganti bukti penolakan backend dengan animasi model yang hanya berkata menolak. Ini memperlihatkan pertahanan di luar model, tanpa mengklaim bahwa semua bentuk prompt injection sudah terdeteksi.

### 14 Cara kerja pertahanan, 03:56–04:12

Gunakan ikon dan minifig yang sudah tersedia. Tiga kelompok besar cukup.

- **AI** membaca dokumen yang sudah ditokenisasi dan mengklasifikasikan maksud chat. Second Opinion opsional, dapat unavailable.
- **Code** menghitung uang, memeriksa provenance penerima, role, coverage, dan warning, lalu menulis audit.
- **People** memperjelas maksud, memberi izin bagiannya, dan mengonfirmasi eksekusi sesuai role.

Diagram ini penjelasan arsitektur, bukan rekaman keputusan internal LLM. Tokenisasi mencakup pola dan nama yang didukung. Jangan menulis bahwa semua PII pasti hilang, atau bahwa seven agent modules semuanya adalah model otonom.

```mermaid
flowchart LR
    D[Untrusted document] --> P[Tokenisation]
    P --> R[Reader without tools]
    R --> C[Code calculates and validates]
    U[User intent] --> L[Planner selects allowed action]
    L --> C
    C --> H[Payers approve their own shares]
    H --> O[Owner confirms]
    O --> G[Five-check payment gate]
    G --> S[Sandbox receipt and audit]
```

### 15 Penutupan dan audit, 04:12–04:28

Label `Back to completed case`, lalu kembali ke cerita utama yang tidak terkena mutasi kasus uji serangan. Pastikan tidak ada pending atau executing request, final bill parsed, serta receipt pada R1 dan R2. Klik **Close case** dan konfirmasi, bukan hanya membuka halaman Closing Documents. Setelah berhasil, tampilkan banner read-only dan dokumen per role.

Zoom `Chain intact` dengan ilustrasi rantai hash. Hash mendeteksi perubahan data log, bukan membuktikan issuer atau kebenaran dokumen. FISCO belum aktif pada deployment publik. Jika satu bukti anchor dipakai, labeli `Archived local FISCO test · 20 Oct 2026` dan tampilkan hash/receipt yang benar dari `evidence/live-services-2026-10-20/`. Tidak ada klaim anchor baru pada website publik atau bonus on-chain otomatis.

### 16 Hasil dan cara verifikasi, 04:28–04:50

Tampilkan tiga kartu bergantian agar masing-masing terbaca.

1. `125/125 automated tests · 20 Oct` dengan `npm test`.
2. `Archived 16/16 tasks and attacks · 18 Oct` dengan label model calls, Stripe test, dan local FISCO. Ini hasil historis, bukan pernyataan bahwa semua integrasi web saat ini selalu lulus.
3. `One synthetic bill · 3 trials · 18 Oct`, Guardian 5/5 causes dan generic chatbot 2–4/5. Catatan kecil menyebut baseline terbatas dan renderer telah diperbarui sejak baseline tersebut.

Tampilkan nama berkas bukti, URL demo, serta satu arahan reproduksi `Use demo account`. Detail 16/16 ada di `evidence/run-2026-10-18-clean-clone/summary.md`. Angka baseline ada di `evidence/baseline-2026-10-18/metrics.json`. Sertakan catatan keterbatasan `Free-tier models may be unavailable. Production anchoring is off.` Jangan menambahkan persentase akurasi umum, waktu hemat, atau jumlah pengguna yang belum diukur.

### 17 Penutup, 04:50–04:58

URL `guardian.scientivan.dev` besar dan terbaca, dengan tombol ilustratif `Use demo account`. Nama tim dan tautan source code menjadi informasi sekunder. Jangan menyebut repo publik karena akses repo perlu dipastikan untuk juri. Tagline tetap singkat. Tidak ada credit roll atau bumper yang menambah durasi setelah 04:58.

## Pemetaan seluruh subkriteria

| Subkriteria | Bobot pada matriks Dien | Scene | Bukti yang ingin juri lihat |
|---|---|---|---|
| T1 Task completion | 12,5 | 06, 09, 11, 15, 16 | Bill menjadi penjelasan, request menjadi paid sandbox, refund dihitung, case benar-benar ditutup, log bisa diverifikasi |
| T2 Intent understanding | 12,5 | 07 | Bahasa informal dikenali, perubahan maksud dari bayar menjadi jelaskan diikuti |
| T3 Task planning | 12,5 | 05, 14 | Langkah berurutan dan next step sesuai state, tanpa mengklaim autonomous planner yang belum ada |
| T4 Correct tool use | 2,5 | 06, 09, 11, 14 | Calculator, gate, dan ledger menghasilkan nilai/receipt yang sesuai, bukan jawaban chat saja |
| S1 Induced transfers | 5,5 | 04, 12 | Rekening dari chat tidak dapat menggantikan registry dan payment benar-benar ditahan |
| S2 Data extraction | 5,5 | 10, 13, 14 | Data payer dibatasi, permintaan data privat ditolak, tokenisasi ditunjukkan beserta batasnya |
| S3 Permission boundaries | 5,5 | 04, 10, 14 | Role UI dan bukti server denial, listing bukan payment authority |
| S4 Prompt injection | 5,5 | 13, 14 | Instruksi PDF tidak memperoleh tools atau dapat menulis registry |
| S5 User control | 5,5 | 07, 09, 12, 15 | Klarifikasi, withdrawal sebelum charge, konfirmasi, hold yang tidak bisa dioverride |
| S6 Risk warnings | 2,5 | 01, 08, 09, 12 | Mode sandbox, biaya, kegagalan check, dan rekening palsu terlihat jelas |
| I1 Scenario novelty | 5,5 | 02, 03, 04 | Satu care case menghubungkan bill evidence, kontribusi lintas negara, intended recipient, dan refund |
| I2 Real and measurable value | 5,5 | 02, 06, 11, 16 | Contoh 40 baris, sebab kenaikan yang bisa ditelusuri, refund terkonservasi, baseline berlingkup jelas |
| I3 Dialogue efficiency | 5,5 | 07, 17 | Satu pertanyaan klarifikasi yang spesifik, lalu aksi relevan, tanpa klaim waktu hemat yang tidak diukur |
| I4 Clarification | 5,5 | 07 | Tidak menebak kata kemarin dan menyediakan pilihan yang benar |
| I5 Correction and fallback | 5,5 | 07, 08 | Maksud yang dikoreksi, file diganti, second check unavailable tidak ditutupi |
| I6 Colloquial input | 2,5 | 07 | Prompt informal Indonesia dengan terjemahan/subtitle Inggris |

Security memiliki penalti serius pada matriks. Menambah animasi pertahanan tidak boleh menutupi sebuah uji yang gagal. T3 dibuktikan sejauh workflow dan action planning yang benar-benar ada, bukan dijanjikan mendapat nilai penuh.

## Kontinuitas rekaman dan spesifikasi edit

- **Kasus M, cerita utama** untuk setup, workflow, bill, clarification, pledge/withdrawal/payment, role projection, refund, dan closing. Gunakan sesi demo sintetis tersendiri. Default fixture sudah memuat dokumen dan request, jadi jangan menyebut seluruhnya baru dibuat lewat klik yang tidak pernah direkam.
- **Kasus F, recovery** untuk file gagal dan pengganti. Jangan menambah dokumen rusak ke cerita M lalu menyembunyikan akibatnya.
- **Kasus A dan B, attack tests** untuk rekening chat dan injeksi PDF. Masing-masing dimulai dari state bersih. Satu hold yang sudah ada tidak boleh menjadi bukti serangan baru bekerja.
- Rekaman kasus uji berbeda diberi label. Jangan membuat montage tampak seperti satu transaksi kontinu jika state sebenarnya berbeda.
- Pertahankan Manrope, DM Serif Display, warna Guardian, ikon, dan minifig. Ambil ulang close-up UI yang kecil. Hindari menjejalkan seluruh dashboard ke frame kecil di samping presenter kosong.
- Role badge dan callout berada di luar isi UI. Maksimal satu bukti utama di layar. Subtitle Inggris tidak menutupi angka pembayaran dan tidak melampaui area aman.
- Pangkas latency dengan edit yang jelas. Jangan mempercepat layar persetujuan atau mengarang jawaban. Log model dan error tidak boleh membocorkan API key, email nyata, atau dokumen pasien asli.
- Gunakan 30 fps. Anggaran 298 detik setara **8.940 frame**. TTS yang lebih cepat dapat diberi visual hold pada scene terkait. Jika lebih panjang, ringkas teks dahulu. Jangan mempercepat semua voiceover agar dipaksakan masuk.
- Aturan timing aktif saat ini hanya mengikuti durasi audio. Pada implementasi versi panjang, `src/timeline.ts` perlu mendukung budget scene, dan `Root.tsx`, recorder actions, serta marks/offsets perlu mencakup scene baru. Faktor recording SCALE 1,16 lama perlu diukur ulang, bukan dipakai sebagai konstanta universal.

## Pemeriksaan sebelum export berikutnya

1. Setiap kalimat Inggris bersumber pada naskah JSON yang sama. Ukur audio TTS sesungguhnya, termasuk pengucapan angka.
2. Pastikan semua ID memiliki audio dan semua scene website memiliki rekaman serta marks yang cocok. Jangan mencampur durasi TTS versi lama dengan naskah baru.
3. Pastikan pledge turun saat Withdraw, uang belum charged pada saat itu, dan pembayaran baru berjalan setelah coverage kembali penuh serta owner mengonfirmasi.
4. Pastikan closing menampilkan status closed, bukan halaman checklist yang masih blocked. Jangan membawa anomaly dari kasus uji ke akhir cerita utama.
5. Pastikan klaim transfer, refund, privacy, baseline, dan anchoring sesuai batas di atas. Tampilkan tanggal serta lingkungan pada bukti historis.
6. Hilangkan presenter placeholder sebelum submission. Periksa subtitle, angka, dan sitasi pada resolusi 1080p.
7. Jalankan FFprobe pada MP4 final. Target 298 detik, wajib tidak melebihi 300 detik, dengan 1920 × 1080, 16:9, English narration/subtitles. Nama file submission tetap `AI-I_Couldve_Done_It_Father-DemoVideo.mp4` setelah versi baru dinyatakan siap.

## Naskah Inggris per scene

Daftar berikut disalin otomatis dari `narration.5min.json`. Angka timecode merujuk anggaran storyboard, bukan durasi TTS yang sudah dihasilkan.

Naskah berisi 551 kata pada subtitle dan 568 kata menurut pengucapan `say`. Ini perkiraan berbasis pemisahan kata, bukan pengukuran durasi audio.

### 01 disclaimer, 00:00–00:06

- `v2-disclaimer-01` Synthetic data. Sandbox payments. No real money or hospital bank settlement.

### 02 problem, 00:06–00:23

- `v2-problem-01` Budi is treated in Shenzhen. His payers are in other countries.
- `v2-problem-02` They must understand changing bills, agree on shares, and verify whom to pay.
- `v2-problem-03` Today, those records are scattered.

### 03 intro, 00:23–00:33

- `v2-intro-01` We are Dien and Aurel, the team behind Guardian.
- `v2-intro-02` One care case connects bill explanation, payer approvals, and refund records.

### 04 setup, 00:33–00:49

- `v2-setup-01` Rina invites payers and a companion, with different permissions.
- `v2-setup-02` A hospital listing alone does not authorize payments.
- `v2-setup-03` Recipients need a signed registry entry. Real hospital enrollment still requires human verification.

### 05 plan, 00:49–01:03

- `v2-plan-01` The case follows an ordered workflow, from reading bills to approvals and refunds.
- `v2-plan-02` The next step reflects the case state.
- `v2-plan-03` Suggested actions still pass code-enforced checks.

### 06 bill, 01:03–01:30

- `v2-bill-01` Guardian compares the 40-line bill with the estimate and cites the source lines.
- `v2-bill-02` Two extra days add 3,000 yuan in room costs.
- `v2-bill-03` A duplicated blood test becomes a question, not an accusation.
- `v2-bill-04` Calculations are separated from document statements.
- `v2-bill-05` Guardian does not invent a medical cause.

### 07 clarify, 01:30–01:51

- `v2-clarify-01` Rina informally asks in Indonesian to pay yesterday’s bill.
- `v2-clarify-02` Guardian asks which bill, instead of guessing.
- `v2-clarify-03` She clarifies that she wants the interim bill explained first.
- `v2-clarify-04` The assistant links to that explanation. Nothing is paid.

### 08 recovery, 01:51–02:07

- `v2-recovery-01` An unreadable file gets a request for a clearer copy.
- `v2-recovery-02` The user replaces the failed upload.
- `v2-recovery-03` If a second-model check is unavailable, Guardian says so and preserves the calculation.

### 09 pay, 02:07–02:46

- `v2-pay-01` Rina manually enters a 50,000-yuan emergency guarantee from a hospital letter.
- `v2-pay-02` At 45,000 pledged, it cannot be paid.
- `v2-pay-03` The Jakarta payer sees rupiah, with the rate and fee.
- `v2-pay-04` A pledge authorizes their share. Nothing is charged yet.
- `v2-pay-05` They can withdraw while pending, then pledge again.
- `v2-pay-06` At full coverage, Rina reviews and confirms.
- `v2-pay-07` Five checks run again. The sandbox records a separate test receipt for each payer.

### 10 permissions, 02:46–03:00

- `v2-permissions-01` Payers see the summary and their own financial details.
- `v2-permissions-02` Companions help with documents but cannot execute payments.
- `v2-permissions-03` Recorded tests show these boundaries are enforced on the server.

### 11 refund, 03:00–03:19

- `v2-refund-01` Deposits total 80,000 yuan. The final bill is 71,000.
- `v2-refund-02` Guardian splits the 9,000-yuan refund by what each person paid.
- `v2-refund-03` It tracks refunds. The hospital must return the money.
- `v2-refund-04` Uploaded payment receipts are shared with every member.

### 12 security, 03:19–03:38

- `v2-security-01` In a separate test, a message asks for payment to a different account.
- `v2-security-02` Guardian warns the user and pauses payments.
- `v2-security-03` Even the owner cannot override the hold.
- `v2-security-04` Verification must use the hospital’s official channel, not the suspicious message.

### 13 injection, 03:38–03:56

- `v2-injection-01` Another test hides malicious instructions inside a hospital PDF.
- `v2-injection-02` The document reader has no payment tools.
- `v2-injection-03` An account from the PDF cannot become an approved recipient.
- `v2-injection-04` The test rejects it. Private-record requests are refused too.

### 14 architecture, 03:56–04:12

- `v2-architecture-01` Here is why those controls hold.
- `v2-architecture-02` Supported identifiers are tokenised before case model calls.
- `v2-architecture-03` AI reads and classifies. Code calculates amounts and enforces permissions.
- `v2-architecture-04` Payers approve their shares. The owner confirms execution.

### 15 close, 04:12–04:28

- `v2-close-01` Back in the completed case, the final bill and both receipts are saved.
- `v2-close-02` Rina confirms closing. Records become read-only.
- `v2-close-03` The hash chain detects edits. It does not authenticate hospital bills.

### 16 results, 04:28–04:50

- `v2-results-01` All 125 automated tests pass.
- `v2-results-02` An archived run passed sixteen tasks and attacks with test payments and a local chain.
- `v2-results-03` In three trials on one synthetic bill, Guardian found all five causes.
- `v2-results-04` The generic chatbot found two to four. These are fixture results, not a general accuracy guarantee.

### 17 end, 04:50–04:58

- `v2-end-01` Try the demo at guardian.scientivan.dev.
- `v2-end-02` Understand the bill. Pay together. Verify the recipient first.


## Validasi draft, 20 Oktober

Pemeriksaan terstruktur lulus. Timeline memiliki 17 scene tanpa celah, total 298 detik atau 8.940 frame. Semua 59 cue memiliki ID unik dan teks yang sama pada storyboard serta naskah JSON. Seluruh 16 subkriteria dipetakan. Naskah memiliki 551 kata subtitle dan sekitar 568 kata berdasarkan kolom pengucapan, di bawah batas kerja internal 650 kata. Ini belum mengukur durasi suara atau MP4 versi baru.

Unit test aplikasi lulus 125/125. Pemeriksaan lint, TypeScript, dan build juga dijalankan. Ada kendala pada source/setup video yang sudah ada sebelum perubahan draft ini. Dependensi Remotion belum terpasang di workspace ini, import public/rec/offsets.json menunjuk aset yang belum tersedia, dan lint melaporkan hook di callback serta apostrof JSX pada scene lama. Build Next.js terhenti saat pemeriksaan tipe Remotion. Kendala tersebut perlu ditangani pada tahap implementasi/produksi, bukan dianggap sebagai hasil render yang sudah siap. Tahap ini hanya mengubah dokumen dan JSON draft, tidak mengubah kode aplikasi, composition aktif, audio, rekaman, atau MP4 acuan.
