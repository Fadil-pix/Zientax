# Cara Setup Database Bersama (Firebase Firestore)

Website ini memakai **Firebase Firestore** supaya data Tugas, Kas, dan Acara
Kalender dibagikan ke semua siswa (bukan cuma tersimpan di 1 HP/laptop).
Tema (gelap/terang) dan pilihan blok tetap disimpan lokal per-perangkat.

## 1. Buat project Firebase (gratis)

1. Buka https://console.firebase.google.com lalu login pakai akun Google.
2. Klik **Add project** → beri nama (mis. `xipplga-kelas`) → lanjutkan
   sampai selesai (boleh matikan Google Analytics, tidak perlu).

## 2. Aktifkan Firestore Database

1. Di sidebar kiri, buka **Build → Firestore Database**.
2. Klik **Create database**.
3. Pilih lokasi server, contoh: `asia-southeast2 (Jakarta)`.
4. Pilih **Start in test mode** (supaya cepat jalan dulu; nanti kita
   perketat aturan keamanannya di langkah 4).

## 3. Daftarkan Web App & ambil config

1. Klik ikon gerigi (⚙️) di sidebar kiri → **Project settings**.
2. Scroll ke bagian **Your apps** → klik ikon `</>` (Web).
3. Beri nickname app (mis. `web-kelas`) → **Register app**.
4. Firebase akan menampilkan kode `firebaseConfig` seperti ini:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "xipplga-kelas.firebaseapp.com",
     projectId: "xipplga-kelas",
     storageBucket: "xipplga-kelas.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcd1234"
   };
   ```
5. **Copy semua isinya**, lalu buka `script.js`, cari bagian:
   ```js
   const firebaseConfig = {
     apiKey: "GANTI_DENGAN_API_KEY_KAMU",
     ...
   };
   ```
   dan **ganti seluruhnya** dengan config asli dari Firebase Console kamu.
6. Simpan file, upload ulang website (lihat bagian Hosting di bawah).

## 4. Buat akun Admin (Firebase Authentication) — supaya hanya admin bisa edit

1. Di sidebar kiri, buka **Build → Authentication** → klik **Get started**.
2. Di tab **Sign-in method**, aktifkan provider **Email/Password**.
3. Buka tab **Users** → klik **Add user** → isi email & password admin
   (mis. ketua kelas / kamu sendiri). Bisa buat lebih dari satu akun kalau
   perlu beberapa admin (misal ketua kelas + bendahara).
4. Simpan email & password itu baik-baik — itu yang dipakai untuk login
   lewat tombol **"Login Admin"** di pojok kanan atas website.

Siswa lain **tidak perlu akun apa pun** — mereka tetap bisa membuka dan
membaca semua data tanpa login. Hanya tombol tambah/edit/hapus yang
disembunyikan sampai ada yang login sebagai admin.

## 5. Atur aturan keamanan (Firestore Rules) — PENTING

Mode "test mode" dari langkah 2 membuat database **terbuka untuk siapa saja
di internet** (bisa baca & tulis bebas) dan **otomatis kedaluwarsa dalam 30
hari** lalu terkunci total. Supaya **hanya admin yang login yang bisa
menulis** (dan semua orang tetap bisa membaca), pakai aturan berikut:

1. Di Firestore Database, klik tab **Rules**.
2. Ganti isinya dengan:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /tasks/{taskId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /calendarEvents/{eventId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /kasPayments/{docId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       match /kasTransactions/{txId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```
3. Klik **Publish**.

> `allow read: if true` → semua orang (tanpa login) tetap bisa lihat tugas,
> kalender, dan rekap kas. `allow write: if request.auth != null` → hanya
> yang sudah login (akun admin yang kamu buat di langkah 4) yang bisa
> menambah, mengubah, atau menghapus data. Tombol login ada di UI, tapi
> keamanan sesungguhnya ditegakkan di sini (Rules) — bukan di tampilan.

## 6. Hosting (supaya bisa dibuka semua orang)

Karena `script.js` sekarang memuat Firebase dari internet (`import ...
gstatic.com`), situs **harus dibuka lewat server/hosting**, bukan dengan
klik-dua-kali file `index.html` dari folder lokal. Opsi gratis:

- **GitHub Pages** — upload folder ini ke repo GitHub, aktifkan Pages di
  Settings → Pages.
- **Netlify / Vercel** — drag & drop folder ini ke dashboard mereka.

## Struktur data di Firestore

| Collection          | Isi dokumen                                             |
|---------------------|----------------------------------------------------------|
| `tasks`             | `subject, title, deadline, type, desc, status, photos` (array foto tugas/catatan materi, opsional — bisa lebih dari 1, disimpan sebagai data URL base64; field `photoData` lama masih dibaca untuk data lawas) |
| `calendarEvents`    | `date, title, type` (acara tambahan yang dibuat siswa)    |
| `kasPayments`       | 1 dokumen per siswa+bulan (id = `{no_induk}_{YYYY-MM}`), field `induk, ym, paid, paidAt` (iuran bulanan Rp10.000/siswa) |
| `kasTransactions`   | Pemasukan lain & pengeluaran kas di luar iuran bulanan, field `type` (`masuk`/`keluar`), `date, amount, desc, createdAt` |

Saat pertama kali dijalankan dan koleksi `tasks` masih kosong, situs akan
otomatis mengisi 6 contoh tugas (data awal) sekali saja — ini butuh admin
login dulu, kalau tidak percobaan seed akan gagal diam-diam (tidak masalah,
tinggal login admin lalu refresh).

## Catatan: Foto Tugas / Catatan Materi

Fitur "+ Foto" pada Tugas Baru (dan tombol "+ Foto" / "Ganti Foto" pada tiap
kartu tugas) menyimpan foto langsung di dalam dokumen `tasks` sebagai teks
base64 (bukan file terpisah), supaya **tidak perlu setup Firebase Storage
tambahan**. Foto otomatis dikompres & di-resize di browser (maks. ~900px,
kualitas disesuaikan) sebelum disimpan, supaya ukurannya tetap kecil. Karena
Firestore membatasi ukuran 1 dokumen maksimal 1 MB, hindari mengunggah foto
yang sangat besar/beresolusi sangat tinggi dari kamera langsung — kompresi
otomatis biasanya sudah cukup untuk foto tugas/papan tulis/buku catatan.
