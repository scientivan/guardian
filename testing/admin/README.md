# Testing Hospital Directory dan admin

Gunakan file pada folder ini untuk simulasi, bukan sebagai bukti kepemilikan rumah sakit nyata. Seluruh alamat, kontak, rekening, dan domain contoh bersifat sintetis. Domain `.example` tidak menyediakan portal rumah sakit yang bisa dihubungi, sehingga pengambilan sumber dapat gagal dan AI pemeriksa harus menyatakan klaim belum terkonfirmasi.

Untuk menjaga data operasional tetap terpisah, kamu dapat menghentikan dev server terlebih dahulu, lalu menjalankan kembali pada port lokal yang sama dengan direktori data khusus pengujian.

```bash
GUARDIAN_ACCOUNTS_DIR=.cache/testing-accounts npm run dev
```

Login Google dan allowlist admin tetap mengikuti konfigurasi lokal. Jangan menjalankan server kedua pada port lain tanpa menyesuaikan konfigurasi OAuth. Kembali ke direktori data normal dengan menjalankan dev server tanpa override tersebut.

## Pengajuan dan pemeriksaan profil

1. Buka `/admin/hospitals/new` dengan akun admin yang diizinkan.
2. Isi field berdasarkan `01-hospital-profile.json`.
3. Gunakan URL dari `04-evidence-sources.json` untuk kolom Evidence source URLs, satu URL per baris.
4. Submit for review. Profil masih draft, rekening belum aktif.
5. Coba Run independent AI check. Domain contoh yang tidak dapat diambil tidak boleh menghasilkan klaim bahwa identitas sudah terbukti.
6. Uji Request more evidence dan pengajuan ulang, atau jalankan konfirmasi manusia sebagai **simulasi pengujian**. Isi catatan dengan jelas bahwa ini data sintetis, bukan konfirmasi institusi nyata.
7. Setelah persetujuan profil, status pembayaran masih unverified.

`02-contact-change.json` mengubah telepon biasa. Pengajuan perubahan tidak boleh langsung mengganti profil yang berlaku. Pemeriksaan perubahan menggunakan telepon lama yang sudah diverifikasi sebagai kanal konfirmasi. Persetujuan perubahan kontak biasa tidak otomatis menghentikan rekening aktif.

`03-branch-change.json` mengubah cabang. Setelah disetujui, otoritas pembayaran harus ditangguhkan dan diperiksa kembali secara terpisah.

## Daftar rekening dengan ID rumah sakit yang benar

Setelah profil terverifikasi, buka institution record lalu Payment authority. Salin ID `HD_...` yang ditampilkan. Dari folder `guardian`, jalankan perintah berikut dengan ID tersebut.

```bash
npx tsx testing/admin/generate-payment-fixtures.ts HD_GANTI_DENGAN_ID_DARI_UI
```

Hasil disimpan di `testing/admin/generated/<ID-rumah-sakit>/`. Generator membuat pasangan kunci acak di memori, memvalidasi tanda tangannya, dan menyimpan **hanya public key dan dokumen bertanda tangan**. Tidak ada private key yang disimpan, tidak ada data database yang diubah, dan tidak ada aktivasi otomatis.

Folder `generated/HD_TESTING_EXAMPLE/` sudah berisi satu rangkaian contoh yang bisa dibuka. ID contoh ini sengaja berbeda dari rumah sakit yang kamu buat di UI. Memakai daftar tersebut tanpa membuat ulang untuk ID yang benar harus ditolak oleh pemeriksaan identifier.

| File hasil generator | Penggunaan |
|---|---|
| `01-public-key.txt` | Isi field Hospital Ed25519 public key |
| `01-signed-account-list.json` | Isi field Signed account list JSON untuk aktivasi awal |
| `01-payment-proposal.json` | Referensi lengkap untuk officialChannel, publicKey, bankName, dan signedList |
| `02-replacement-account-list.json` | Mengganti rekening awal berakhiran 2222 menjadi 4444 menggunakan kunci yang sama |
| `02-replacement-payment-proposal.json` | Referensi field untuk perubahan rekening |
| `03-rotated-public-key.txt` | Kunci baru untuk skenario rotasi |
| `03-rotation-signature.txt` | Pernyataan rotasi yang ditandatangani kunci lama |
| `03-rotated-account-list.json` | Daftar rekening bertanda tangan kunci baru |
| `03-rotated-payment-proposal.json` | Referensi lengkap rotasi kunci |
| `04-tampered-account-list.json` | Rekening diubah setelah penandatanganan. Aktivasi harus ditolak karena signature salah |
| `05-stale-account-list.json` | Signature benar, tetapi dokumen berusia delapan hari. Aktivasi harus ditolak |

Isi official billing channel dengan `https://hospital.example/billing` dan bank name sesuai payment-proposal JSON. Untuk pengujian offline ini, paste signed list ke formulir. Retrieve signed account list tidak akan berhasil terhadap domain contoh.

**Hanya objek `signedList` yang dimasukkan ke Signed account list JSON.** File payment-proposal berisi beberapa field, jadi jangan menempelkan seluruh isinya ke satu field.

## Urutan pengujian otorisasi pembayaran

1. Aktifkan set `01` melalui review pembayaran terpisah. Gunakan public key dan signed list dari rangkaian generator yang sama.
2. Hubungkan Care Case Google ke institusi ini. Buat request pembayaran dan approval, tetapi belum dieksekusi.
3. Ajukan set `02`, lalu setujui perubahan rekening melalui kanal lama yang dipercaya.
4. Request lama harus dibatalkan dan approval lama tidak boleh dipindahkan. Buat request dan quote baru untuk rekening berakhiran 4444.
5. Untuk rotasi kunci, ajukan set `03` dengan public key baru dan rotation signature. Konfirmasi melalui kanal institusi yang sudah dipercaya. Mengosongkan signature tanpa memilih pemulihan identitas harus ditolak.
6. Untuk pemulihan identitas, gunakan proposal baru, pilih Identity recovery, dan isi catatan pemulihan independen minimal 60 karakter. Ini mensimulasikan pemeriksaan manusia, bukan bukti bahwa pemeriksaan benar-benar dilakukan.
7. Di Incident controls, coba payment hold atau revocation. Request tertunda yang terkait tidak boleh dieksekusi. Share yang sudah dikirim ke provider tidak dapat dibatalkan oleh hold setelahnya.
8. Di History, coba Anchor verification hash. Keberhasilan memerlukan FISCO BCOS yang berjalan. Hash tercatat tidak memberikan otoritas pembayaran otomatis.

Daftar bertanda tangan untuk aktivasi normal berlaku bagi pemeriksaan usia maksimal tujuh hari. Buat ulang file jika sudah terlalu lama, atau gunakan set stale untuk sengaja mencoba penolakan. Menjalankan generator lagi pada ID yang sama mengganti seluruh key pair contoh di folder itu. Jika otoritas lama sudah aktif, perubahan kunci dari generasi berbeda memerlukan alur recovery karena signature rotasinya tidak berasal dari key pair generasi sebelumnya.
