# Struktur Proyek

Proyek ini adalah situs statis (HTML/CSS/JS biasa, tanpa build tool) yang
memakai Firebase (Firestore + Auth) sebagai database. Struktur folder:

```
Zientax-rapi/
├── public/
│   ├── index.html            # shell utama — cuma <head> + placeholder
│   └── partials/              # potongan HTML per section, dimuat via fetch()
│       ├── nav.html
│       ├── view-dashboard.html
│       ├── view-tugas.html
│       ├── view-kalender.html
│       ├── view-jadwal.html
│       ├── view-kas.html
│       ├── view-taman.html
│       └── modal-*.html       # satu file per modal (11 modal)
│
├── src/
│   ├── css/                   # dipecah per kategori, urutan <link> PENTING
│   │   ├── 00-base.css          variabel warna/tema, reset, tipografi
│   │   ├── 01-layout.css        topbar/navigasi, kerangka .app/.view
│   │   ├── 02-components.css    tombol, input, badge, grid foto, banner
│   │   ├── 03-pages.css         styling tiap halaman/menu
│   │   ├── 04-modals.css        semua modal + lightbox foto
│   │   └── 05-responsive.css    semua @media (dimuat paling akhir)
│   │
│   └── js/
│       ├── firebase-config.js   init Firebase + referensi koleksi Firestore
│       ├── data/
│       │   ├── schedule-data.js   data jam pelajaran & jadwal (statis)
│       │   └── calendar-data.js   data kalender akademik (statis)
│       ├── partials-loader.js   fetch & suntik semua public/partials/*.html
│       └── main.js              seluruh logic aplikasi (state, render,
│                                 event handler) + init()
│
├── assets/
│   └── images/
│       └── logo.png
│
└── docs/
    └── SETUP-DATABASE.md      cara setup Firebase & Firestore Rules
```

## Cara kerja pemuatan HTML

`public/index.html` tidak lagi berisi seluruh markup. Body-nya hanya
berisi elemen kosong bertanda `data-include="partials/xxx.html"`:

```html
<div data-include="partials/view-dashboard.html"></div>
```

`src/js/partials-loader.js` berjalan lebih dulu, meng-`fetch()` tiap file
partial dan menyuntikkan HTML-nya ke elemen tsb. Setelah **semua** partial
selesai dimuat, loader menembakkan custom event `partials:ready` di
`document`. `main.js` baru menjalankan `init()` (pasang semua event
listener, mulai sinkronisasi Firestore, dst) setelah event ini — bukan
`DOMContentLoaded` seperti versi lama — supaya elemen yang dicari lewat
`getElementById`/`querySelector` sudah pasti ada di halaman.

**Konsekuensi penting:** karena pakai `fetch()`, halaman ini **wajib**
dibuka lewat web server (`npx serve`, `python3 -m http.server`, Live
Server, atau hosting sungguhan). Tidak bisa lagi dibuka langsung sebagai
`file://` dari File Explorer — browser akan memblokir `fetch()` ke file
lokal.

## Menambah/mengubah tampilan

- Ubah section yang sudah ada → edit file partial-nya langsung di
  `public/partials/`, tidak perlu sentuh `index.html`.
- Tambah section/modal baru → buat file baru di `public/partials/`, lalu
  tambahkan satu baris `<div data-include="partials/nama-file.html"></div>`
  di `index.html`.
- Ubah style → cari kategori yang paling cocok di `src/css/` (komponen
  reusable vs styling khusus satu halaman vs breakpoint responsive).
- Ubah logic → hampir semua ada di `src/js/main.js`. Data statis jadwal/
  kalender ada di `src/js/data/`. Config Firebase ada di
  `src/js/firebase-config.js`.
