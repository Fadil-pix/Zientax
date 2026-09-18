/* ==========================================================================
   FIREBASE CONFIG — inisialisasi Firebase & referensi koleksi Firestore.
   Semua modul lain (main.js) mengimpor `db`, `auth`, dan koleksi dari sini
   supaya hanya ada SATU instance Firebase App di seluruh aplikasi.

   CARA SETUP (sekali saja):
   1. Buka https://console.firebase.google.com -> Add project
   2. Di project baru: Build -> Firestore Database -> Create database
      -> pilih lokasi asia-southeast2 (Jakarta) -> mulai di test mode
   3. Project settings (ikon gerigi) -> General -> scroll ke "Your apps"
      -> klik ikon web </> -> daftarkan app -> copy object firebaseConfig
   4. Tempel object tsb menggantikan firebaseConfig di bawah ini
   5. (Opsional tapi disarankan) atur Firestore Rules, lihat catatan di
      docs/SETUP-DATABASE.md
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getFirestore, collection } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

// TODO: ganti dengan firebaseConfig milikmu sendiri dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyC9--urH7kmLPjOuNtjC6WKa9Wx6XjcG4s",
  authDomain: "zientax-b93cc.firebaseapp.com",
  projectId: "zientax-b93cc",
  storageBucket: "zientax-b93cc.firebasestorage.app",
  messagingSenderId: "55660481725",
  appId: "1:55660481725:web:4ff5aae3a80d14cab27bd4"
};

const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

// Tugas, Kas, dan Acara Kalender disimpan di Firestore supaya semua siswa
// lihat data yang sama. Tema & blok aktif tetap disimpan lokal (lihat
// STORAGE_KEY_* di main.js).
export const colTasks = collection(db, 'tasks');
export const colCalEvents = collection(db, 'calendarEvents');
export const colKas = collection(db, 'kasPayments');
export const colKasTx = collection(db, 'kasTransactions');

// Menu Taman: katalog tanaman dikelola admin (seperti tugas), sedangkan
// kegiatan "Selasa Asri" & "Piket Harian" boleh diunggah siapa saja tanpa
// login (lihat docs/SETUP-DATABASE.md bagian Rules untuk aturan Firestore-nya).
export const colTamanSettings = collection(db, 'tamanSettings');
export const colTamanPlants = collection(db, 'tamanPlants');
export const colTamanKegiatan = collection(db, 'tamanKegiatan');
export const colTamanPiket = collection(db, 'tamanPiket');
