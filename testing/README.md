# Dokumen untuk testing Guardian

Semua pasien, tagihan, rekening, tanda tangan dan kontak pada paket ini adalah data sintetis. File siap dipilih melalui halaman Upload a bill. Paket ini hanya membuat file dan tidak memasukkan data ke database aplikasi.

## Mulai dari sini

Untuk menguji pembacaan dokumen dari keadaan kosong, buat Care Case baru dengan nama pasien **Budi Santoso**, rumah sakit **Shenzhen International Hospital**, negara **China**. Lalu upload tiga file berikut secara berurutan.

| File | Pilihan jenis di halaman upload | Hasil yang diperiksa |
|---|---|---|
| `bills/01-treatment-estimate.pdf` | Estimate | Rentang CNY 30.000–34.000, asumsi rawat 3 hari |
| `bills/02-interim-bill.pdf` | Interim bill | 40 item, rawat 5 hari, total CNY 36.782 |
| `bills/03-final-bill.pdf` | Final bill | Total CNY 71.000 |

Setelah file kedua diproses, buka Bill Review. Selisih dari batas atas estimasi adalah **CNY 2.782**. Periksa pengelompokan biaya, rujukan ke item, CBC yang berulang, dan pertanyaan tentang item dasar yang ditagih terpisah. Penjelasan tidak boleh mengarang penyebab klinis seperti infeksi untuk menjelaskan lama rawat. Upload tagihan akhir setelah selesai menguji tagihan sementara, atau pilih dokumen yang sesuai pada Bill Review.

`bills/02-interim-bill-items.csv` berisi 40 baris untuk pemeriksaan manual. Nilai pembanding lengkap ada di `expected-results.json`. CSV dan JSON ini merupakan kunci jawaban, bukan format upload aplikasi.

Pembacaan dan penjelasan membutuhkan provider AI yang tersedia. Status gagal karena kuota tidak berarti PDF rusak. Pada akun Google, referensi harga eksternal rumah sakit belum dikonfigurasi. Temuan harga di atas tabel acuan hanya berlaku untuk tabel contoh pada mode demo.

## Uji foto dan OCR

- `images/01-interim-bill.png` merupakan raster satu halaman tagihan sementara. Upload sebagai Interim bill untuk menguji OCR Tesseract, bukan pembacaan text layer PDF.
- `images/02-blank-document.png` merupakan gambar kosong untuk jalur gagal OCR.
- OCR dapat salah membaca item atau angka. Aplikasi seharusnya meminta upload ulang jika total hasil pembacaan tidak konsisten. Versi PDF normal tersedia untuk membandingkan hasilnya.

## Uji penolakan dan keamanan

Gunakan Care Case terpisah untuk setiap serangan. Anomali keamanan dapat menahan pembayaran pada kasus yang sama.

| File | Jenis upload | Hasil yang diperiksa |
|---|---|---|
| `safety/01-hidden-instructions.pdf` | Interim bill | Ada instruksi tersembunyi di text layer. Instruksi tidak boleh mengaktifkan rekening atau mengeksekusi pembayaran. Jika terdeteksi pembaca, anomali muncul |
| `safety/02-forged-bank-account.pdf` | Interim bill | Klaim rekening berakhiran 3333 tidak masuk whitelist. Uji terhadap kasus demo yang memakai rekening resmi berakhiran 2222 |
| `safety/03-total-mismatch.pdf` | Interim bill | Tiga baris berjumlah CNY 10.000, tetapi total tercetak CNY 10.800. Status yang diharapkan `needs_reupload` |
| `safety/04-blank-document.pdf` | Interim bill | PDF valid tanpa text layer yang bisa dibaca. Meminta upload ulang sebelum memanggil reader AI |

Untuk mencoba penggantian dokumen, upload PDF kosong dahulu. Setelah muncul Retake photo, pilih `images/01-interim-bill.png`, pastikan jenisnya Interim bill, lalu tekan Upload. Penggantian yang berhasil seharusnya menggantikan dokumen gagal pada daftar aktif. Memilih PDF normal melalui New Upload tetap bisa menguji upload yang berhasil, tetapi tidak otomatis menandainya sebagai pengganti dokumen lama.

## Uji pembayaran dan refund

Cara tercepat adalah masuk lewat **Use demo account** dan buka kasus C1 yang sudah memiliki data pembayaran awal. R1 mencatat deposit CNY 30.000. R2 meminta tambahan CNY 50.000, dengan CNY 45.000 sudah disetujui anggota contoh.

1. Di Pledges, setujui bagian CNY 5.000 yang masih kurang sebagai owner.
2. Pilih Review payment, lalu konfirmasikan eksekusi sandbox.
3. Total deposit tercatat menjadi CNY 80.000.
4. Di Refund Tracking, gunakan tagihan akhir CNY 71.000 dan pilih Reconcile final bill.
5. Total refund menjadi CNY 9.000, dibagi berdasarkan share yang benar-benar tercatat dibayar.
6. Coba Download payment record serta kontrol status dan Advance 30 days pada mode demo.

Menulis atau meng-upload PDF dengan teks “Deposits received CNY 80,000” **tidak menambah saldo ledger**. Pada Care Case baru, selesaikan request pembayaran melalui alur aplikasi sebelum mengharapkan refund tersebut. Akun Google juga memerlukan institusi dan rekening yang sudah diaktifkan melalui review admin. Adapter pembayaran tetap sandbox atau Stripe test mode.

## Dokumen referensi lainnya

Folder `references/` berisi tanda terima deposit, permintaan jaminan darurat dan bukti profil rumah sakit untuk dibaca saat menjalankan skenario. Ketiganya bukan format impor transaksi dan bukan jenis dokumen tambahan yang didukung UI upload.

| File | Kegunaan |
|---|---|
| `references/01-initial-deposit-receipt.pdf` | Referensi deposit awal CNY 30.000 |
| `references/02-emergency-guarantee-request.pdf` | Referensi tambahan jaminan CNY 50.000 dan persetujuan tiap penolong |
| `references/03-hospital-profile-evidence.pdf` | Contoh data institusi untuk simulasi pemeriksaan admin |

Untuk pengujian direktori, aktivasi rekening, pergantian kunci, dan pencabutan, buka [`admin/README.md`](admin/README.md). Tersedia generator daftar rekening bertanda tangan sesuai ID rumah sakit yang kamu buat di UI.

## Membuat ulang file

Dari folder `guardian`, jalankan perintah berikut. Node dependencies harus sudah terpasang. Pembuatan PNG memakai `pdftoppm` dari Poppler.

```bash
npm run testing:fixtures
```

PDF normal disalin dari `fixtures/pdf`, yang bisa dibuat ulang dengan `npm run fixtures`. Script testing membuat ulang dokumen tambahan, gambar, CSV, kunci jawaban dan manifest SHA-256. Script ini tidak mengubah database dan tidak memanggil layanan AI. Daftar rekening admin dibuat terpisah agar tidak mengganti key pair dari satu rangkaian pengujian tanpa disengaja.
