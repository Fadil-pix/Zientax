/* ==========================================================================
   XI PPLG A — SMKN 2 Klaten — class site logic
   Data disusun dari jadwal blok umum & produktif kelas XI PPLG A serta
   kodifikasi guru SMKN 2 Klaten 2025/2026.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 0a. FIREBASE (database bersama) — Tugas, Kas, dan Acara Kalender        */
/*     disimpan di Firestore supaya semua siswa lihat data yang sama.      */
/*     Tema & blok aktif tetap disimpan lokal (preferensi per-perangkat).  */
/*                                                                          */
/*  CARA SETUP (sekali saja):                                              */
/*  1. Buka https://console.firebase.google.com -> Add project             */
/*  2. Di project baru: Build -> Firestore Database -> Create database     */
/*     -> pilih lokasi asia-southeast2 (Jakarta) -> mulai di test mode     */
/*  3. Project settings (ikon gerigi) -> General -> scroll ke "Your apps"  */
/*     -> klik ikon web </> -> daftarkan app -> copy object firebaseConfig */
/*  4. Tempel object tsb menggantikan firebaseConfig di bawah ini          */
/*  5. (Opsional tapi disarankan) atur Firestore Rules, lihat catatan di   */
/*     bagian bawah file ini / README.                                    */
/* ---------------------------------------------------------------------- */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, getDocs
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

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
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

const colTasks = collection(db, 'tasks');
const colCalEvents = collection(db, 'calendarEvents');
const colKas = collection(db, 'kasPayments');
const colKasTx = collection(db, 'kasTransactions');

// Menu Taman: katalog tanaman dikelola admin (seperti tugas), sedangkan
// kegiatan "Selasa Asri" & "Piket Harian" boleh diunggah siapa saja tanpa
// login (lihat SETUP-DATABASE.md bagian Rules untuk aturan Firestore-nya).
const colTamanSettings = collection(db, 'tamanSettings');
const colTamanPlants = collection(db, 'tamanPlants');
const colTamanKegiatan = collection(db, 'tamanKegiatan');
const colTamanPiket = collection(db, 'tamanPiket');

/* ---------------------------------------------------------------------- */
/* 0b. ADMIN LOGIN (Firebase Authentication)                              */
/*     Hanya akun admin yang login (dibuat manual di Firebase Console ->  */
/*     Authentication -> Users) yang bisa menambah/mengedit/menghapus     */
/*     data. Siswa lain tetap bisa lihat semua data tanpa login.          */
/*     Perlindungan sesungguhnya ada di Firestore Rules (lihat            */
/*     SETUP-DATABASE.md) — kelas UI ini hanya menyembunyikan tombolnya.  */
/* ---------------------------------------------------------------------- */
let isAdmin = false;

onAuthStateChanged(auth, (user)=>{
  isAdmin = !!user;
  updateAdminUI(user);
  renderTasks();
  renderCalendar();
  renderKas();
  renderKasTx();
  renderPlantGrid();
  renderSelasaAsriList();
  renderPiketHarianList();
});

function updateAdminUI(user){
  document.body.classList.toggle('is-admin', isAdmin);
  const label = document.getElementById('adminBadgeLabel');
  const badge = document.getElementById('adminBadge');
  if (isAdmin){
    label.textContent = `Admin (${user.email}) · Keluar`;
    badge.title = 'Klik untuk logout';
  } else {
    label.textContent = 'Login Admin';
    badge.title = 'Login sebagai admin';
  }
}

function openAdminModal(){
  document.getElementById('adminError').style.display = 'none';
  document.getElementById('adminModalOverlay').classList.add('is-open');
}
function closeAdminModal(){
  document.getElementById('adminModalOverlay').classList.remove('is-open');
  document.getElementById('adminForm').reset();
}

async function handleAdminFormSubmit(e){
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errEl = document.getElementById('adminError');
  errEl.style.display = 'none';
  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAdminModal();
  } catch(err){
    console.error(err);
    errEl.textContent = 'Email atau password salah.';
    errEl.style.display = 'block';
  }
}

function showDbError(msg){
  let bar = document.getElementById('dbErrorBar');
  if (!bar){
    bar = document.createElement('div');
    bar.id = 'dbErrorBar';
    bar.className = 'storage-warning';
    document.body.prepend(bar);
  }
  bar.textContent = msg;
}

/* ---------------------------------------------------------------------- */
/* 0b. PENYIMPANAN LOKAL (localStorage) — hanya untuk preferensi tampilan  */
/*     per-perangkat: tema & blok aktif yang sedang dilihat.               */
/* ---------------------------------------------------------------------- */
const STORAGE_KEY_THEME = 'xipplga_theme';
const STORAGE_KEY_BLOK = 'xipplga_blok_aktif';
const STORAGE_KEY_JADWAL_BLOK = 'xipplga_jadwal_blok_tab';

function storageAvailable(){
  try {
    const k = '__storage_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch(e){ return false; }
}
const HAS_STORAGE = storageAvailable();

/* ---------------------------------------------------------------------- */
/* 1. STRUKTUR JAM PELAJARAN (per hari)                                    */
/* ---------------------------------------------------------------------- */
const TIME_SLOTS = {
  senin: [
    { type:'special', label:'Upacara Bendera', start:'07:00', end:'07:40' },
    { type:'jam', jam:1,  start:'07:40', end:'08:20' },
    { type:'jam', jam:2,  start:'08:20', end:'09:00' },
    { type:'jam', jam:3,  start:'09:00', end:'09:40' },
    { type:'break', label:'Istirahat 1', start:'09:40', end:'09:55' },
    { type:'jam', jam:4,  start:'09:55', end:'10:35' },
    { type:'jam', jam:5,  start:'10:35', end:'11:15' },
    { type:'jam', jam:6,  start:'11:15', end:'11:55' },
    { type:'break', label:'Istirahat 2 (Ishoma)', start:'11:55', end:'12:45' },
    { type:'jam', jam:7,  start:'12:45', end:'13:25' },
    { type:'jam', jam:8,  start:'13:25', end:'14:05' },
    { type:'jam', jam:9,  start:'14:05', end:'14:45' },
    { type:'jam', jam:10, start:'14:45', end:'15:20' },
  ],
  selasa: [
    { type:'special', label:'Selasa Asri', start:'07:00', end:'07:40' },
    { type:'jam', jam:1,  start:'07:40', end:'08:20' },
    { type:'jam', jam:2,  start:'08:20', end:'09:00' },
    { type:'jam', jam:3,  start:'09:00', end:'09:40' },
    { type:'break', label:'Istirahat 1', start:'09:40', end:'09:55' },
    { type:'jam', jam:4,  start:'09:55', end:'10:30' },
    { type:'jam', jam:5,  start:'10:30', end:'11:05' },
    { type:'jam', jam:6,  start:'11:05', end:'11:40' },
    { type:'break', label:'Istirahat 2 (Ishoma)', start:'11:40', end:'12:30' },
    { type:'jam', jam:7,  start:'12:30', end:'13:05' },
    { type:'jam', jam:8,  start:'13:05', end:'13:40' },
    { type:'jam', jam:9,  start:'13:40', end:'14:15' },
    { type:'jam', jam:10, start:'14:15', end:'14:50' },
    { type:'jam', jam:11, start:'14:50', end:'15:25' },
  ],
  rabu: [
    { type:'jam', jam:1,  start:'07:00', end:'07:40' },
    { type:'jam', jam:2,  start:'07:40', end:'08:20' },
    { type:'jam', jam:3,  start:'08:20', end:'09:00' },
    { type:'jam', jam:4,  start:'09:00', end:'09:40' },
    { type:'break', label:'Istirahat 1', start:'09:40', end:'09:55' },
    { type:'jam', jam:5,  start:'09:55', end:'10:35' },
    { type:'jam', jam:6,  start:'10:35', end:'11:15' },
    { type:'jam', jam:7,  start:'11:15', end:'11:55' },
    { type:'break', label:'Istirahat 2 (Ishoma)', start:'11:55', end:'12:45' },
    { type:'jam', jam:8,  start:'12:45', end:'13:25' },
    { type:'jam', jam:9,  start:'13:25', end:'14:05' },
    { type:'jam', jam:10, start:'14:05', end:'14:45' },
    { type:'jam', jam:11, start:'14:45', end:'15:20' },
  ],
  // Kamis pakai struktur sama dengan Rabu. Blok Umum kelas ini berhenti di
  // jam ke-10, sedangkan Blok Produktif memakai jam ke-11.
  kamis: [
    { type:'jam', jam:1,  start:'07:00', end:'07:40' },
    { type:'jam', jam:2,  start:'07:40', end:'08:20' },
    { type:'jam', jam:3,  start:'08:20', end:'09:00' },
    { type:'jam', jam:4,  start:'09:00', end:'09:40' },
    { type:'break', label:'Istirahat 1', start:'09:40', end:'09:55' },
    { type:'jam', jam:5,  start:'09:55', end:'10:35' },
    { type:'jam', jam:6,  start:'10:35', end:'11:15' },
    { type:'jam', jam:7,  start:'11:15', end:'11:55' },
    { type:'break', label:'Istirahat 2 (Ishoma)', start:'11:55', end:'12:45' },
    { type:'jam', jam:8,  start:'12:45', end:'13:25' },
    { type:'jam', jam:9,  start:'13:25', end:'14:05' },
    { type:'jam', jam:10, start:'14:05', end:'14:45' },
    { type:'jam', jam:11, start:'14:45', end:'15:20' },
  ],
  jumat: [
    { type:'special', label:'Jumat Karakter', start:'07:00', end:'07:35' },
    { type:'jam', jam:1,  start:'07:35', end:'08:10' },
    { type:'jam', jam:2,  start:'08:10', end:'08:45' },
    { type:'jam', jam:3,  start:'08:45', end:'09:20' },
    { type:'break', label:'Istirahat 1', start:'09:20', end:'09:35' },
    { type:'jam', jam:4,  start:'09:35', end:'10:10' },
    { type:'jam', jam:5,  start:'10:10', end:'10:45' },
    { type:'jam', jam:6,  start:'10:45', end:'11:20' },
    { type:'jam', jam:7,  start:'11:20', end:'11:55' },
    { type:'break', label:'Istirahat Sholat Jumat', start:'11:55', end:'12:45' },
    { type:'jam', jam:8,  start:'12:45', end:'13:20' },
    { type:'jam', jam:9,  start:'13:20', end:'13:55' },
  ],
};

const DAY_LABELS = { senin:'Senin', selasa:'Selasa', rabu:'Rabu', kamis:'Kamis', jumat:'Jumat' };
const DAY_ORDER = ['senin','selasa','rabu','kamis','jumat'];
const JS_DAY_TO_KEY = { 1:'senin', 2:'selasa', 3:'rabu', 4:'kamis', 5:'jumat' }; // 0=Min,6=Sab -> libur

/* ---------------------------------------------------------------------- */
/* 2. JADWAL BLOK UMUM (Ruang 3)                                          */
/* ---------------------------------------------------------------------- */
const SCHEDULE_UMUM = {
  senin: [
    { jamStart:1, jamEnd:2,  subject:'Sejarah', teacher:'Endang Rijanti, S.Pd (E01)', room:'Ruang 3', category:'teori' },
    { jamStart:3, jamEnd:4,  subject:'PJOK', teacher:'Hanif Prabowo, S.Pd (D02)', room:'Ruang 3', category:'olahraga' },
    { jamStart:5, jamEnd:7,  subject:'Bahasa Inggris', teacher:'Suyanto, S.Pd (I02)', room:'Ruang 3', category:'teori' },
    { jamStart:8, jamEnd:8,  subject:'Bimbingan Konseling', teacher:'Nur Fatimah Zahrok, S.Psi (V03)', room:'Ruang 3', category:'khusus' },
    { jamStart:9, jamEnd:10, subject:'Pendidikan Agama', teacher:'Suyono, MSI / Nur Zaimah, S.Pd.I (A03/A05)', room:'Ruang 3', category:'teori' },
  ],
  selasa: [
    { jamStart:1, jamEnd:2,  subject:'Sejarah', teacher:'Endang Rijanti, S.Pd (E01)', room:'Ruang 3', category:'teori' },
    { jamStart:3, jamEnd:6,  subject:'Pendidikan Pancasila', teacher:'Nurul Candra Listyani, S.Pd (B02)', room:'Ruang 3', category:'teori' },
    { jamStart:7, jamEnd:9,  subject:'Bahasa Inggris', teacher:'Suyanto, S.Pd (I02)', room:'Ruang 3', category:'teori' },
    { jamStart:10, jamEnd:11, subject:'Pendidikan Agama', teacher:'Suyono, MSI / Nur Zaimah, S.Pd.I (A03/A05)', room:'Ruang 3', category:'teori' },
  ],
  rabu: [
    { jamStart:1, jamEnd:2,  subject:'Pendidikan Agama', teacher:'Suyono, MSI / Nur Zaimah, S.Pd.I (A03/A05)', room:'Ruang 3', category:'teori' },
    { jamStart:3, jamEnd:4,  subject:'PJOK', teacher:'Hanif Prabowo, S.Pd (D02)', room:'Ruang 3', category:'olahraga' },
    { jamStart:5, jamEnd:6,  subject:'Bahasa Jawa', teacher:'Haryanto, S.Pd (G02)', room:'Ruang 3', category:'teori' },
    { jamStart:7, jamEnd:9,  subject:'Bahasa Indonesia', teacher:'Perdana Suria Dinata, M.Pd (C04)', room:'Ruang 3', category:'teori' },
    { jamStart:10, jamEnd:11, subject:'KIK / Kewirausahaan', teacher:'Parmi, S.Pd (L01)', room:'Ruang 3', category:'teori' },
  ],
  kamis: [
    { jamStart:1, jamEnd:2,  subject:'KIK / Kewirausahaan', teacher:'Parmi, S.Pd (L01)', room:'Ruang 3', category:'teori' },
    { jamStart:3, jamEnd:5,  subject:'Matematika', teacher:'Kristiana Widayati, S.Pd (H04)', room:'Ruang 3', category:'teori' },
    { jamStart:6, jamEnd:6,  subject:'Bimbingan Konseling', teacher:'Nur Fatimah Zahrok, S.Psi (V03)', room:'Ruang 3', category:'khusus' },
    { jamStart:7, jamEnd:8,  subject:'Bahasa Inggris', teacher:'Suyanto, S.Pd (I02)', room:'Ruang 3', category:'teori' },
    { jamStart:9, jamEnd:10, subject:'Bahasa Jawa', teacher:'Haryanto, S.Pd (G02)', room:'Ruang 3', category:'teori' },
  ],
  jumat: [
    { jamStart:1, jamEnd:3, subject:'Bahasa Indonesia', teacher:'Perdana Suria Dinata, M.Pd (C04)', room:'Ruang 3', category:'teori' },
    { jamStart:4, jamEnd:6, subject:'Matematika', teacher:'Kristiana Widayati, S.Pd (H04)', room:'Ruang 3', category:'teori' },
  ],
};

/* ---------------------------------------------------------------------- */
/* 3. JADWAL BLOK PRODUKTIF PPLG (Lab J1/J2/J3)                           */
/* ---------------------------------------------------------------------- */
const SCHEDULE_PRODUKTIF = {
  senin: [
    { jamStart:1, jamEnd:4,  subject:'SKJ', teacher:'Riza Akbar, S.Kom (S06)', room:'Lab J3', category:'kejuruan' },
    { jamStart:5, jamEnd:7,  subject:'KIK', teacher:'Atik Ariyani, S.Kom (S03)', room:'Lab J1', category:'kejuruan' },
    { jamStart:8, jamEnd:10, subject:'SaaS', teacher:'Atik Ariyani, S.Kom (S03)', room:'Lab J1', category:'kejuruan' },
  ],
  selasa: [
    { jamStart:1, jamEnd:4,  subject:'SIoT', teacher:'Dalyanta Budisantosa, M.Eng (S02)', room:'Lab J2', category:'kejuruan' },
    { jamStart:5, jamEnd:7,  subject:'IaaS', teacher:'Andi Adriyatmoko, S.Kom (S01)', room:'Lab J3', category:'kejuruan' },
    { jamStart:8, jamEnd:11, subject:'PaaS', teacher:'Ahmad Suruli Musthofa, S.Kom (S04)', room:'Lab J2', category:'kejuruan' },
  ],
  rabu: [
    { jamStart:1, jamEnd:4,  subject:'SIoT', teacher:'Dalyanta Budisantosa, M.Eng (S02)', room:'Lab J3', category:'kejuruan' },
    { jamStart:5, jamEnd:8,  subject:'SKJ', teacher:'Riza Akbar, S.Kom (S06)', room:'Lab J3', category:'kejuruan' },
    { jamStart:9, jamEnd:11, subject:'IaaS', teacher:'Andi Adriyatmoko, S.Kom (S01)', room:'Lab J3', category:'kejuruan' },
  ],
  kamis: [
    { jamStart:1, jamEnd:4,  subject:'Mapil PPLG', teacher:'Atik Ariyani, S.Kom (S03)', room:'Lab J1', category:'kejuruan' },
    { jamStart:5, jamEnd:7,  subject:'KIK', teacher:'Atik Ariyani, S.Kom (S03)', room:'Lab J1', category:'kejuruan' },
    { jamStart:8, jamEnd:11, subject:'PaaS', teacher:'Ahmad Suruli Musthofa, S.Kom (S04)', room:'Lab J2', category:'kejuruan' },
  ],
  jumat: [
    { jamStart:1, jamEnd:3, subject:'SaaS', teacher:'Atik Ariyani, S.Kom (S03)', room:'Lab J1', category:'kejuruan' },
    { jamStart:4, jamEnd:7, subject:'Mapil PPLG', teacher:'Atik Ariyani, S.Kom (S03)', room:'Lab J1', category:'kejuruan' },
  ],
};

const SCHEDULES = { umum: SCHEDULE_UMUM, produktif: SCHEDULE_PRODUKTIF };

/* Daftar mapel unik (untuk form tugas & filter) */
function getAllSubjects(){
  const set = new Set();
  [SCHEDULE_UMUM, SCHEDULE_PRODUKTIF].forEach(block=>{
    Object.values(block).forEach(day=> day.forEach(s=> set.add(s.subject)));
  });
  return Array.from(set).sort();
}

/* ---------------------------------------------------------------------- */
/* 4. KALENDER AKADEMIK (data contoh — sesuaikan kalender resmi sekolah)   */
/* ---------------------------------------------------------------------- */
function expandRange(startISO, endISO, title, type){
  const out = [];
  let d = new Date(startISO + 'T00:00:00');
  const end = new Date(endISO + 'T00:00:00');
  while (d <= end){
    out.push({ date: d.toISOString().slice(0,10), title, type });
    d.setDate(d.getDate()+1);
  }
  return out;
}

/* Sumber: Kalender Pendidikan SMK Negeri 2 Klaten, Tahun Pelajaran 2025/2026
   (kalender dinding resmi sekolah, ditandatangani Kepala Sekolah 14 Juli 2025). */
const CALENDAR_EVENTS = [
  ...expandRange('2025-07-14','2025-07-14','Hari Pertama Masuk Sekolah', 'sekolah'),
  ...expandRange('2025-07-14','2025-07-16','Kegiatan MPLS', 'sekolah'),
  ...expandRange('2025-07-17','2025-07-17','Masa Pengenalan Mitra Sekolah (MPMS)', 'sekolah'),
  ...expandRange('2025-08-04','2025-08-07','Perkiraan AN (Asesmen Nasional)', 'an'),
  ...expandRange('2025-08-17','2025-08-17','Mengikuti Upacara HUT Kemerdekaan RI', 'libur-nasional'),
  ...expandRange('2025-09-05','2025-09-05',"Libur Umum (Peringatan Maulid Nabi Muhammad SAW 1446 H)", 'libur-nasional'),
  ...expandRange('2025-09-22','2025-09-26','Penilaian Sumatif Tengah Semester Gasal', 'pts'),
  ...expandRange('2025-10-01','2025-10-01','Mengikuti Upacara Hari Kesaktian Pancasila', 'sekolah'),
  ...expandRange('2025-10-28','2025-10-28','Mengikuti Upacara Peringatan Hari Sumpah Pemuda', 'sekolah'),
  ...expandRange('2025-11-10','2025-11-10','Mengikuti Upacara Peringatan Hari Pahlawan', 'sekolah'),
  ...expandRange('2025-11-17','2025-11-19','Tes Kemampuan Akademik (TKA)', 'tka'),
  ...expandRange('2025-11-24','2025-12-05','Perkiraan Penilaian Sumatif Akhir Semester (5 hari sekolah)', 'pas'),
  ...expandRange('2025-12-13','2025-12-13','Penyerahan Buku Laporan Hasil Belajar Semester Gasal (5 hari sekolah)', 'sekolah'),
  ...expandRange('2025-12-22','2026-01-02','Libur Akhir Semester Gasal (5 hari sekolah)', 'libur-semester'),
  ...expandRange('2025-12-25','2025-12-25','Libur Umum (Hari Raya Natal)', 'libur-nasional'),
  ...expandRange('2025-12-26','2025-12-26','Cuti Bersama setelah Hari Raya Natal', 'libur-nasional'),
  ...expandRange('2026-01-01','2026-01-01','Libur Umum (Tahun Baru Masehi 2026)', 'libur-nasional'),
  ...expandRange('2026-01-05','2026-01-05','Hari Pertama Masuk Semester Genap', 'sekolah'),
  ...expandRange('2026-01-16','2026-01-16',"Libur Umum (Isra Mi'raj 1447 H)", 'libur-nasional'),
  ...expandRange('2026-02-17','2026-02-17','Libur Umum (Tahun Baru Imlek 2577)', 'libur-nasional'),
  ...expandRange('2026-02-19','2026-02-19','Libur Umum (Perkiraan libur awal Puasa Ramadhan 1447 H)', 'libur-nasional'),
  ...expandRange('2026-03-09','2026-03-13','Penilaian Sumatif Tengah Semester Genap', 'pts'),
  ...expandRange('2026-03-16','2026-03-18','Libur Umum (Sebelum Hari Raya Idul Fitri 1447 H)', 'libur-nasional'),
  ...expandRange('2026-03-19','2026-03-19','Libur Umum (Hari Raya Nyepi Tahun Baru Saka 1948)', 'libur-nasional'),
  ...expandRange('2026-03-20','2026-03-21','Libur Umum (Hari Raya Idul Fitri 1447 H)', 'libur-nasional'),
  ...expandRange('2026-03-23','2026-03-28','Libur Umum (Sesudah Hari Raya Idul Fitri 1447 H)', 'libur-nasional'),
  ...expandRange('2026-03-30','2026-04-10','Perkiraan Penilaian Sumatif Akhir Jenjang (5 hari sekolah)', 'pas'),
  ...expandRange('2026-04-03','2026-04-03','Libur Umum (Wafat Yesus Kristus - Hari Paskah)', 'libur-nasional'),
  ...expandRange('2026-05-01','2026-05-01','Libur Umum (Hari Buruh Internasional)', 'libur-nasional'),
  ...expandRange('2026-05-02','2026-05-02','Mengikuti Upacara Peringatan Hari Pendidikan Nasional', 'sekolah'),
  ...expandRange('2026-05-04','2026-05-04','Perkiraan Pengumuman Kelulusan', 'sekolah'),
  ...expandRange('2026-05-14','2026-05-14','Libur Umum (Hari Kenaikan Yesus Kristus)', 'libur-nasional'),
  ...expandRange('2026-05-20','2026-05-20','Mengikuti Upacara Peringatan Hari Kebangkitan Nasional', 'sekolah'),
  ...expandRange('2026-05-25','2026-06-05','Perkiraan Penilaian Sumatif Akhir Tahun (5 hari sekolah)', 'pas'),
  ...expandRange('2026-05-27','2026-05-27','Libur Umum (Hari Raya Idul Adha 1447 H)', 'libur-nasional'),
  ...expandRange('2026-06-01','2026-06-01','Mengikuti Upacara Hari Lahir Pancasila', 'sekolah'),
  ...expandRange('2026-06-17','2026-06-17','Libur Umum (Tahun Baru Islam 1448 H)', 'libur-nasional'),
  ...expandRange('2026-06-19','2026-06-19','Penyerahan Buku Laporan Hasil Belajar Semester Genap (5 hari sekolah)', 'sekolah'),
  ...expandRange('2026-06-22','2026-07-11','Libur Akhir Semester Genap/Libur Akhir Tahun Ajaran 2025/2026', 'libur-semester'),
  ...expandRange('2026-07-13','2026-07-13','Permulaan Tahun Ajaran 2026/2027', 'sekolah'),
];

const CAL_TYPE_LABEL = {
  'pts':'Penilaian Sumatif Tengah Semester', 'pas':'Penilaian Sumatif Akhir Semester/Jenjang/Tahun',
  'tka':'Tes Kemampuan Akademik (TKA)', 'an':'Asesmen Nasional (AN)', 'ukk':'Uji Kompetensi Keahlian',
  'libur-semester':'Libur Semester', 'libur-nasional':'Libur Umum / Nasional', 'sekolah':'Kegiatan Sekolah',
  'pribadi':'Acara Kelas / Pribadi'
};

/* ---------- Acara kalender tambahan (Firestore, collection 'calendarEvents') ---------- */
let customEvents = []; // disinkron realtime dari Firestore

function allEvents(){ return [...CALENDAR_EVENTS, ...customEvents]; }

function subscribeCalEvents(){
  onSnapshot(colCalEvents, (snap)=>{
    customEvents = snap.docs.map(d => ({ id: d.id, custom:true, ...d.data() }));
    renderCalendar();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat acara kalender dari database. Cek koneksi internet & konfigurasi Firebase.');
  });
}

/* ---------------------------------------------------------------------- */
/* 5. STATE                                                                */
/* ---------------------------------------------------------------------- */
let currentBlok = 'umum';          // blok aktif untuk dashboard status
let jadwalTabBlok = 'umum';        // tab aktif di halaman Jadwal
let calViewDate = new Date();      // bulan yang sedang ditampilkan di kalender

const DEFAULT_TASKS = [
  { subject:'SaaS', title:'Laporan Praktikum Deployment SaaS', deadline:'2026-08-22', type:'Kelompok', desc:'Deploy aplikasi sederhana ke platform SaaS pilihan, sertakan dokumentasi.', status:'sedang' },
  { subject:'Matematika', title:'Latihan Soal Trigonometri Bab 3', deadline:'2026-08-25', type:'Individu', desc:'', status:'belum' },
  { subject:'Bahasa Indonesia', title:'Menyusun Teks Eksposisi', deadline:'2026-08-21', type:'Individu', desc:'Topik bebas, minimal 500 kata.', status:'belum' },
  { subject:'PaaS', title:'Konfigurasi Container pada Platform PaaS', deadline:'2026-08-29', type:'Kelompok', desc:'', status:'selesai' },
  { subject:'Sejarah', title:'Rangkuman Bab Kolonialisme di Indonesia', deadline:'2026-08-20', type:'Individu', desc:'', status:'sedang' },
  { subject:'SIoT', title:'Rancangan Sistem Sensor IoT Sederhana', deadline:'2026-09-02', type:'Kelompok', desc:'', status:'belum' },
];

function showStorageWarning(){
  if (HAS_STORAGE) return;
  const bar = document.createElement('div');
  bar.className = 'storage-warning';
  bar.innerHTML = 'Penyimpanan lokal browser tidak tersedia, jadi preferensi tampilan (tema & blok aktif) tidak akan tersimpan setelah halaman ditutup/di-refresh. Data tugas, kas, dan acara kalender tetap aman karena disimpan di database online.';
  document.body.prepend(bar);
}

/* ---------- Tugas (Firestore, collection 'tasks') ---------- */
let tasks = []; // disinkron realtime dari Firestore

async function seedDefaultTasksIfEmpty(){
  const snap = await getDocs(colTasks);
  if (!snap.empty) return;
  for (const t of DEFAULT_TASKS){
    await addDoc(colTasks, t);
  }
}

function subscribeTasks(){
  onSnapshot(colTasks, (snap)=>{
    tasks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTasks();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat data tugas dari database. Cek koneksi internet & konfigurasi Firebase (firebaseConfig) di script.js.');
  });
}

/* Ambil daftar foto suatu tugas sebagai array data URL.
   Mendukung data lama yang cuma punya field `photoData` (foto tunggal)
   maupun data baru yang pakai field `photos` (array, bisa lebih dari 1). */
function getTaskPhotos(t){
  if (!t) return [];
  if (Array.isArray(t.photos)) return t.photos;
  if (t.photoData) return [t.photoData];
  return [];
}

/* Render grid thumbnail foto (dipakai di form Tugas Baru/Edit & modal Kelola Foto).
   photosArray: array data URL. onRemove(index): dipanggil saat tombol × diklik. */
function renderPhotoGrid(container, photosArray, onRemove){
  if (!photosArray.length){
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }
  container.style.display = 'grid';
  container.innerHTML = photosArray.map((src, idx) => `
    <div class="photo-grid__item">
      <img src="${src}" alt="Foto ${idx + 1}">
      <button type="button" class="photo-grid__remove" data-idx="${idx}" title="Hapus foto ini">&times;</button>
    </div>
  `).join('');
  container.querySelectorAll('.photo-grid__remove').forEach(btn=>{
    btn.onclick = () => onRemove(Number(btn.dataset.idx));
  });
}

/* ---------------------------------------------------------------------- */
/* 5b. MENU TAMAN — Sambutan, Daftar Tanaman (+QR), Selasa Asri, Piket    */
/*     Katalog tanaman & sambutan dikelola admin (seperti tugas).         */
/*     Kegiatan Selasa Asri & Piket Harian boleh diunggah siapa saja      */
/*     tanpa login (allow create: if true di Firestore Rules), tapi       */
/*     hapus data tetap khusus admin.                                     */
/* ---------------------------------------------------------------------- */
let tamanSambutan = { title:'', caption:'', photo:'' };
let tamanPlants = [];       // disinkron realtime dari Firestore
let selasaAsriList = [];    // disinkron realtime dari Firestore
let piketHarianList = [];   // disinkron realtime dari Firestore
let pendingPlantDeepLink = new URLSearchParams(location.search).get('tanaman');

/* Ambil daftar foto generik (dipakai tanaman, kegiatan, piket) — sama pola
   dengan getTaskPhotos di atas. */
function getPhotos(item){
  return (item && Array.isArray(item.photos)) ? item.photos : [];
}

/* ---------- Sambutan ---------- */
function subscribeTamanSettings(){
  onSnapshot(doc(db, 'tamanSettings', 'welcome'), (snap)=>{
    tamanSambutan = snap.exists() ? snap.data() : { title:'', caption:'', photo:'' };
    renderTamanSambutan();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat sambutan taman dari database. Cek koneksi internet.');
  });
}

function renderTamanSambutan(){
  const titleEl = document.getElementById('tamanHeroTitle');
  if (!titleEl) return;
  document.getElementById('tamanHeroTitle').textContent = tamanSambutan.title || 'Selamat Datang di Taman Kelas';
  document.getElementById('tamanHeroCaption').textContent = tamanSambutan.caption ||
    'Belum ada sambutan. Admin dapat menambahkan foto & sambutan taman lewat tombol "Edit Sambutan".';
  const photoEl = document.getElementById('tamanHeroPhoto');
  const placeholderEl = document.getElementById('tamanHeroPlaceholder');
  if (tamanSambutan.photo){
    photoEl.src = tamanSambutan.photo;
    photoEl.style.display = 'block';
    placeholderEl.style.display = 'none';
  } else {
    photoEl.style.display = 'none';
    placeholderEl.style.display = 'flex';
  }
}

let newSambutanPhoto = '';

function openSambutanModal(){
  document.getElementById('sambutanTitle').value = tamanSambutan.title || '';
  document.getElementById('sambutanCaption').value = tamanSambutan.caption || '';
  newSambutanPhoto = tamanSambutan.photo || '';
  renderSambutanPhotoPreview();
  document.getElementById('sambutanModalOverlay').classList.add('is-open');
}
function closeSambutanModal(){
  document.getElementById('sambutanModalOverlay').classList.remove('is-open');
  document.getElementById('sambutanForm').reset();
  document.getElementById('sambutanPhotoPreviewWrap').innerHTML = '';
  document.getElementById('sambutanPhotoPreviewWrap').style.display = 'none';
  newSambutanPhoto = '';
}
function renderSambutanPhotoPreview(){
  renderPhotoGrid(document.getElementById('sambutanPhotoPreviewWrap'), newSambutanPhoto ? [newSambutanPhoto] : [], ()=>{
    newSambutanPhoto = '';
    renderSambutanPhotoPreview();
  });
}
async function handleSambutanPhotoChange(e){
  const file = (e.target.files || [])[0];
  if (!file) return;
  try {
    newSambutanPhoto = await compressImageFile(file, 1400);
  } catch(err){
    console.error(err);
    alert('Gagal memproses foto. Coba pilih foto lain.');
  }
  e.target.value = '';
  renderSambutanPhotoPreview();
}
async function handleSambutanFormSubmit(e){
  e.preventDefault();
  const title = document.getElementById('sambutanTitle').value.trim();
  const caption = document.getElementById('sambutanCaption').value.trim();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await setDoc(doc(db, 'tamanSettings', 'welcome'), { title, caption, photo: newSambutanPhoto }, { merge: true });
    closeSambutanModal();
  } catch(err){
    console.error(err);
    showDbError('Gagal menyimpan sambutan taman ke database. Cek koneksi internet.');
  } finally {
    submitBtn.disabled = false;
  }
}

/* ---------- Daftar Tanaman ---------- */
function subscribeTamanPlants(){
  onSnapshot(colTamanPlants, (snap)=>{
    tamanPlants = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (a.name||'').localeCompare(b.name||''));
    renderPlantGrid();
    maybeOpenPendingPlantDeepLink();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat daftar tanaman dari database. Cek koneksi internet.');
  });
}

/* Jika situs dibuka lewat link hasil scan QR (?tanaman=id), langsung
   pindah ke menu Taman & buka detail tanaman terkait. */
function maybeOpenPendingPlantDeepLink(){
  if (!pendingPlantDeepLink) return;
  const plant = tamanPlants.find(p => p.id === pendingPlantDeepLink);
  if (!plant) return;
  pendingPlantDeepLink = null;
  setActiveView('taman');
  openPlantDetailModal(plant.id);
}

function renderPlantGrid(){
  const grid = document.getElementById('plantGrid');
  if (!grid) return;
  if (!tamanPlants.length){
    grid.innerHTML = `<p class="empty-note">Belum ada tanaman terdaftar.</p>`;
    return;
  }
  grid.innerHTML = tamanPlants.map(plantCardHTML).join('');
  bindPlantCardButtons();
}

function plantCardHTML(p){
  const photos = getPhotos(p);
  const thumb = photos.length
    ? `<img src="${photos[0]}" alt="Foto ${escapeHTML(p.name)}" loading="lazy">`
    : `<div class="plant-card__photo-empty">Belum ada foto</div>`;

  let actions = `<button class="btn btn--sm" data-action="plant-detail" data-id="${p.id}">Lihat &amp; QR</button>`;
  if (isAdmin){
    actions += `<button class="btn btn--sm" data-action="plant-edit" data-id="${p.id}">Edit</button>`;
    actions += `<button class="btn btn--sm" data-action="plant-delete" data-id="${p.id}">Hapus</button>`;
  }

  return `
    <div class="plant-card">
      <button type="button" class="plant-card__photo" data-action="plant-detail" data-id="${p.id}">${thumb}</button>
      <div class="plant-card__body">
        <div class="plant-card__name">${escapeHTML(p.name)}</div>
        ${p.latin ? `<div class="plant-card__latin">${escapeHTML(p.latin)}</div>` : ''}
        <div class="plant-card__meta">
          ${p.category ? `<span class="badge badge--sage">${escapeHTML(p.category)}</span>` : ''}
          ${p.location ? `<span class="badge badge--cyan">${escapeHTML(p.location)}</span>` : ''}
        </div>
        <div class="plant-card__actions">${actions}</div>
      </div>
    </div>`;
}

function bindPlantCardButtons(){
  document.querySelectorAll('[data-action="plant-detail"]').forEach(btn=>{
    btn.onclick = () => openPlantDetailModal(btn.dataset.id);
  });
  document.querySelectorAll('[data-action="plant-edit"]').forEach(btn=>{
    btn.onclick = () => openEditPlantModal(btn.dataset.id);
  });
  document.querySelectorAll('[data-action="plant-delete"]').forEach(btn=>{
    btn.onclick = () => deletePlant(btn.dataset.id);
  });
}

async function deletePlant(id){
  if (!confirm('Hapus tanaman ini dari daftar?')) return;
  try {
    await deleteDoc(doc(db, 'tamanPlants', id));
  } catch(err){
    console.error(err);
    showDbError('Gagal menghapus tanaman dari database. Cek koneksi internet.');
  }
}

/* ---------- Modal Tanaman Baru / Edit ---------- */
let newPlantPhotos = [];
let editingPlantId = null;

function openPlantModal(){ document.getElementById('plantModalOverlay').classList.add('is-open'); }

function openEditPlantModal(id){
  const p = tamanPlants.find(x => x.id === id);
  if (!p) return;
  editingPlantId = id;
  document.getElementById('plantName').value = p.name || '';
  document.getElementById('plantLatin').value = p.latin || '';
  document.getElementById('plantCategory').value = p.category || 'Pohon';
  document.getElementById('plantLocation').value = p.location || '';
  document.getElementById('plantDesc').value = p.desc || '';
  newPlantPhotos = getPhotos(p).slice();
  renderPlantPhotoGrid();
  document.getElementById('plantModalTitle').textContent = 'Edit Tanaman';
  document.querySelector('#plantForm button[type="submit"]').textContent = 'Simpan Perubahan';
  openPlantModal();
}

function closePlantModal(){
  document.getElementById('plantModalOverlay').classList.remove('is-open');
  document.getElementById('plantForm').reset();
  newPlantPhotos = [];
  editingPlantId = null;
  document.getElementById('plantPhotoPreviewWrap').innerHTML = '';
  document.getElementById('plantPhotoPreviewWrap').style.display = 'none';
  document.getElementById('plantModalTitle').textContent = 'Tanaman Baru';
  document.querySelector('#plantForm button[type="submit"]').textContent = 'Simpan Tanaman';
}

function renderPlantPhotoGrid(){
  renderPhotoGrid(document.getElementById('plantPhotoPreviewWrap'), newPlantPhotos, (idx)=>{
    newPlantPhotos.splice(idx, 1);
    renderPlantPhotoGrid();
  });
}

async function handlePlantPhotoChange(e){
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files){
    try { newPlantPhotos.push(await compressImageFile(file)); }
    catch(err){ console.error(err); alert('Gagal memproses salah satu foto, foto itu dilewati. Coba pilih foto lain.'); }
  }
  e.target.value = '';
  renderPlantPhotoGrid();
}

function handlePlantFormSubmit(e){
  e.preventDefault();
  const name = document.getElementById('plantName').value.trim();
  const latin = document.getElementById('plantLatin').value.trim();
  const category = document.getElementById('plantCategory').value;
  const location = document.getElementById('plantLocation').value.trim();
  const desc = document.getElementById('plantDesc').value.trim();
  if (!name) return;

  const data = { name, latin, category, location, desc, photos: newPlantPhotos };
  const submitBtn = document.querySelector('#plantForm button[type="submit"]');
  submitBtn.disabled = true;

  const promise = editingPlantId
    ? updateDoc(doc(db, 'tamanPlants', editingPlantId), data)
    : addDoc(colTamanPlants, data);

  promise
    .then(()=>{ closePlantModal(); })
    .catch((err)=>{
      console.error(err);
      showDbError('Gagal menyimpan tanaman ke database. Cek koneksi internet & konfigurasi Firebase.');
    })
    .finally(()=>{ submitBtn.disabled = false; });
}

/* ---------- Modal Detail Tanaman + QR Code ---------- */
let plantDetailCurrentId = null;

function openPlantDetailModal(id){
  const p = tamanPlants.find(x => x.id === id);
  if (!p) return;
  plantDetailCurrentId = id;

  document.getElementById('plantDetailName').textContent = p.name || 'Tanaman';
  const latinEl = document.getElementById('plantDetailLatin');
  latinEl.textContent = p.latin || '';
  latinEl.style.display = p.latin ? 'block' : 'none';
  const catEl = document.getElementById('plantDetailCategory');
  catEl.textContent = p.category || '';
  catEl.style.display = p.category ? 'inline-block' : 'none';
  const locEl = document.getElementById('plantDetailLocation');
  locEl.textContent = p.location || '';
  locEl.style.display = p.location ? 'inline-block' : 'none';
  document.getElementById('plantDetailDesc').textContent = p.desc || 'Belum ada keterangan.';

  const photos = getPhotos(p);
  const photoGrid = document.getElementById('plantDetailPhotoGrid');
  if (photos.length){
    photoGrid.style.display = 'grid';
    photoGrid.innerHTML = photos.map((src, idx) => `
      <button type="button" class="photo-grid__item" data-idx="${idx}" style="border:none; padding:0; cursor:pointer;">
        <img src="${src}" alt="Foto ${escapeHTML(p.name)} ${idx+1}">
      </button>`).join('');
    photoGrid.querySelectorAll('.photo-grid__item').forEach(btn=>{
      btn.onclick = () => openPhotoLightbox(photos, Number(btn.dataset.idx), p.name, p.desc);
    });
  } else {
    photoGrid.style.display = 'none';
    photoGrid.innerHTML = '';
  }

  renderPlantQRCode(p);
  document.getElementById('plantDetailModalOverlay').classList.add('is-open');
}

/* Link permanen ke tanaman ini (dipakai sebagai isi QR Code) — saat
   dipindai, situs otomatis membuka menu Taman & detail tanaman ini. */
function plantPermalink(id){
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('tanaman', id);
  return url.toString();
}

function renderPlantQRCode(p){
  const holder = document.getElementById('plantQRCode');
  holder.innerHTML = '';
  if (typeof QRCode === 'undefined'){
    holder.innerHTML = '<p class="empty-note">Gagal memuat generator QR Code (cek koneksi internet).</p>';
    return;
  }
  // Digenerate di resolusi tinggi (280px) supaya unduhan/cetak label tetap
  // tajam, walau di layar QR ini ditampilkan kecil lewat CSS (.qr-box__code).
  new QRCode(holder, {
    text: plantPermalink(p.id),
    width: 280,
    height: 280,
    colorDark: '#000000',
    colorLight: '#ffffff',
    correctLevel: QRCode.CorrectLevel.M
  });
}

function closePlantDetailModal(){
  document.getElementById('plantDetailModalOverlay').classList.remove('is-open');
  plantDetailCurrentId = null;
}

/* Fitur "Eksplor Website": banyak pengunjung mendarat langsung di detail satu
   tanaman lewat scan QR (lihat handlePlantDeepLink). Tombol ini menutup modal
   tersebut dan membawa mereka ke Dashboard supaya bisa menjelajahi menu lain
   di website kelas (tugas, kalender, kas, taman, dsb). */
function exploreWebsite(){
  closePlantDetailModal();
  setActiveView('dashboard');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getPlantQRDataURL(){
  const holder = document.getElementById('plantQRCode');
  const canvas = holder.querySelector('canvas');
  const img = holder.querySelector('img');
  return canvas ? canvas.toDataURL('image/png') : (img ? img.src : null);
}

function downloadPlantQR(){
  const dataURL = getPlantQRDataURL();
  if (!dataURL) return;
  const p = tamanPlants.find(x => x.id === plantDetailCurrentId);
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `qr-${(p ? p.name : 'tanaman').toLowerCase().replace(/[^a-z0-9]+/g,'-') || 'tanaman'}.png`;
  a.click();
}

function printPlantQR(){
  const dataURL = getPlantQRDataURL();
  if (!dataURL) return;
  const p = tamanPlants.find(x => x.id === plantDetailCurrentId);
  const name = p ? escapeHTML(p.name) : 'Tanaman';
  const latin = p && p.latin ? escapeHTML(p.latin) : '';
  const win = window.open('', '_blank', 'width=420,height=520');
  if (!win){ alert('Popup diblokir browser. Izinkan popup untuk mencetak label QR.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>Label ${name}</title>
    <style>
      body{ font-family:sans-serif; text-align:center; padding:24px; }
      img{ width:220px; height:220px; }
      h2{ margin:14px 0 2px; font-size:16px; }
      p{ margin:0; font-style:italic; color:#555; font-size:12px; }
      @media print{ body{ padding:0; } }
    </style></head><body>
      <img src="${dataURL}" alt="QR ${name}">
      <h2>${name}</h2>
      ${latin ? `<p>${latin}</p>` : ''}
      <script>window.onload = () => window.print();</script>
    </body></html>`);
  win.document.close();
}

function editPlantFromDetail(){
  if (!plantDetailCurrentId) return;
  const id = plantDetailCurrentId;
  closePlantDetailModal();
  openEditPlantModal(id);
}

function deletePlantFromDetail(){
  if (!plantDetailCurrentId) return;
  const id = plantDetailCurrentId;
  closePlantDetailModal();
  deletePlant(id);
}

/* ---------- Kegiatan "Selasa Asri" ---------- */
function subscribeTamanKegiatan(){
  onSnapshot(colTamanKegiatan, (snap)=>{
    selasaAsriList = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0));
    renderSelasaAsriList();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat kegiatan Selasa Asri dari database. Cek koneksi internet.');
  });
}

function renderSelasaAsriList(){
  const list = document.getElementById('selasaAsriList');
  if (!list) return;
  if (!selasaAsriList.length){
    list.innerHTML = `<p class="empty-note">Belum ada dokumentasi kegiatan Selasa Asri.</p>`;
    return;
  }
  list.innerHTML = selasaAsriList.map(k => activityCardHTML(k, 'kegiatan')).join('');
  bindActivityCardButtons('kegiatan', selasaAsriList, 'tamanKegiatan');
}

/* ---------- Piket Harian ---------- */
function subscribeTamanPiket(){
  onSnapshot(colTamanPiket, (snap)=>{
    piketHarianList = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.date||'').localeCompare(a.date||'') || (b.createdAt||0)-(a.createdAt||0));
    renderPiketHarianList();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat data piket harian dari database. Cek koneksi internet.');
  });
}

function renderPiketHarianList(){
  const list = document.getElementById('piketHarianList');
  if (!list) return;
  if (!piketHarianList.length){
    list.innerHTML = `<p class="empty-note">Belum ada catatan piket harian.</p>`;
    return;
  }
  list.innerHTML = piketHarianList.map(k => activityCardHTML(k, 'piket')).join('');
  bindActivityCardButtons('piket', piketHarianList, 'tamanPiket');
}

/* Kartu aktivitas generik dipakai untuk Selasa Asri & Piket Harian. */
function activityCardHTML(item, kind){
  const photos = getPhotos(item);
  const dateLabel = item.date ? item.date.split('-').reverse().join('-') : '-';
  const title = kind === 'kegiatan' ? (item.title || 'Kegiatan Selasa Asri') : 'Piket Harian';

  const photosHTML = photos.length ? `
    <div class="activity-card__photos">
      ${photos.slice(0, 6).map((src, idx) => `
        <button type="button" class="activity-card__photo" data-idx="${idx}" title="Lihat foto">
          <img src="${src}" alt="Foto ${escapeHTML(title)}" loading="lazy">
          ${idx === 5 && photos.length > 6 ? `<span class="activity-card__photo-count">+${photos.length - 6}</span>` : ''}
        </button>`).join('')}
    </div>` : '';

  const actions = isAdmin
    ? `<div class="activity-card__actions"><button class="btn btn--sm" data-action="delete-activity" data-id="${item.id}">Hapus</button></div>`
    : '';

  return `
    <div class="activity-card" data-item-id="${item.id}">
      <div class="activity-card__head">
        <span class="activity-card__date">${dateLabel}</span>
        ${item.petugas ? `<span class="activity-card__petugas">${escapeHTML(item.petugas)}</span>` : ''}
      </div>
      <div class="activity-card__title">${escapeHTML(title)}</div>
      ${item.desc ? `<div class="activity-card__desc">${escapeHTML(item.desc)}</div>` : ''}
      ${photosHTML}
      ${actions}
    </div>`;
}

function bindActivityCardButtons(kind, list, collectionName){
  const containerId = kind === 'kegiatan' ? 'selasaAsriList' : 'piketHarianList';
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.activity-card').forEach(card=>{
    const id = card.dataset.itemId;
    const item = list.find(x => x.id === id);
    if (!item) return;
    const photos = getPhotos(item);
    card.querySelectorAll('.activity-card__photo').forEach(btn=>{
      btn.onclick = () => openPhotoLightbox(photos, Number(btn.dataset.idx), item.title || 'Dokumentasi', item.desc);
    });
    const delBtn = card.querySelector('[data-action="delete-activity"]');
    if (delBtn){
      delBtn.onclick = async () => {
        if (!confirm('Hapus dokumentasi ini?')) return;
        try {
          await deleteDoc(doc(db, collectionName, id));
        } catch(err){
          console.error(err);
          showDbError('Gagal menghapus data dari database. Cek koneksi internet.');
        }
      };
    }
  });
}

/* ---------- Modal Tambah Kegiatan Selasa Asri ---------- */
let newKegiatanPhotos = [];

function openKegiatanModal(){
  document.getElementById('kegiatanDate').value = todayISO();
  document.getElementById('kegiatanModalOverlay').classList.add('is-open');
}
function closeKegiatanModal(){
  document.getElementById('kegiatanModalOverlay').classList.remove('is-open');
  document.getElementById('kegiatanForm').reset();
  newKegiatanPhotos = [];
  document.getElementById('kegiatanPhotoPreviewWrap').innerHTML = '';
  document.getElementById('kegiatanPhotoPreviewWrap').style.display = 'none';
}
function renderKegiatanPhotoGrid(){
  renderPhotoGrid(document.getElementById('kegiatanPhotoPreviewWrap'), newKegiatanPhotos, (idx)=>{
    newKegiatanPhotos.splice(idx, 1);
    renderKegiatanPhotoGrid();
  });
}
async function handleKegiatanPhotoChange(e){
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files){
    try { newKegiatanPhotos.push(await compressImageFile(file)); }
    catch(err){ console.error(err); alert('Gagal memproses salah satu foto, foto itu dilewati. Coba pilih foto lain.'); }
  }
  e.target.value = '';
  renderKegiatanPhotoGrid();
}
function handleKegiatanFormSubmit(e){
  e.preventDefault();
  const date = document.getElementById('kegiatanDate').value;
  const petugas = document.getElementById('kegiatanPetugas').value.trim();
  const title = document.getElementById('kegiatanTitle').value.trim();
  const desc = document.getElementById('kegiatanDesc').value.trim();
  if (!date || !title) return;

  const submitBtn = document.querySelector('#kegiatanForm button[type="submit"]');
  submitBtn.disabled = true;
  addDoc(colTamanKegiatan, { date, petugas, title, desc, photos: newKegiatanPhotos, createdAt: Date.now() })
    .then(()=>{ closeKegiatanModal(); })
    .catch((err)=>{
      console.error(err);
      showDbError('Gagal menyimpan kegiatan Selasa Asri ke database. Cek koneksi internet.');
    })
    .finally(()=>{ submitBtn.disabled = false; });
}

/* ---------- Modal Tambah Piket Harian ---------- */
let newPiketPhotos = [];

function openPiketModal(){
  document.getElementById('piketDate').value = todayISO();
  document.getElementById('piketModalOverlay').classList.add('is-open');
}
function closePiketModal(){
  document.getElementById('piketModalOverlay').classList.remove('is-open');
  document.getElementById('piketForm').reset();
  newPiketPhotos = [];
  document.getElementById('piketPhotoPreviewWrap').innerHTML = '';
  document.getElementById('piketPhotoPreviewWrap').style.display = 'none';
}
function renderPiketPhotoGrid(){
  renderPhotoGrid(document.getElementById('piketPhotoPreviewWrap'), newPiketPhotos, (idx)=>{
    newPiketPhotos.splice(idx, 1);
    renderPiketPhotoGrid();
  });
}
async function handlePiketPhotoChange(e){
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files){
    try { newPiketPhotos.push(await compressImageFile(file)); }
    catch(err){ console.error(err); alert('Gagal memproses salah satu foto, foto itu dilewati. Coba pilih foto lain.'); }
  }
  e.target.value = '';
  renderPiketPhotoGrid();
}
function handlePiketFormSubmit(e){
  e.preventDefault();
  const date = document.getElementById('piketDate').value;
  const petugas = document.getElementById('piketPetugas').value.trim();
  const desc = document.getElementById('piketDesc').value.trim();
  if (!date || !petugas) return;

  const submitBtn = document.querySelector('#piketForm button[type="submit"]');
  submitBtn.disabled = true;
  addDoc(colTamanPiket, { date, petugas, desc, photos: newPiketPhotos, createdAt: Date.now() })
    .then(()=>{ closePiketModal(); })
    .catch((err)=>{
      console.error(err);
      showDbError('Gagal menyimpan piket harian ke database. Cek koneksi internet.');
    })
    .finally(()=>{ submitBtn.disabled = false; });
}

function todayISO(){
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

/* ---------------------------------------------------------------------- */
/* 6. UTIL                                                                 */
/* ---------------------------------------------------------------------- */
function pad(n){ return n.toString().padStart(2,'0'); }
function timeToMinutes(t){ const [h,m] = t.split(':').map(Number); return h*60+m; }
function nowMinutes(d){ return d.getHours()*60 + d.getMinutes(); }

/* Kompres & resize foto di sisi browser sebelum disimpan sebagai data URL
   di Firestore (supaya ukuran dokumen tetap kecil, tanpa perlu setup
   Firebase Storage terpisah). */
function compressImageFile(file, maxDim = 900){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let { width, height } = img;
        if (width > maxDim || height > maxDim){
          if (width > height){ height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        let quality = 0.75;
        let out = canvas.toDataURL('image/jpeg', quality);
        while (out.length > 900000 && quality > 0.3){
          quality -= 0.1;
          out = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(out);
      };
      img.onerror = () => reject(new Error('Gagal membaca gambar.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

function buildDayRows(dayKey, scheduleBlock){
  const slots = TIME_SLOTS[dayKey];
  const dayData = scheduleBlock[dayKey] || [];
  if (!dayData.length) return [];
  const maxJam = Math.max(...dayData.map(b=>b.jamEnd));
  const rows = [];
  let i = 0;
  while (i < slots.length){
    const slot = slots[i];
    if (slot.type !== 'jam'){
      rows.push({ type:slot.type, label:slot.label, start:slot.start, end:slot.end });
      i++; continue;
    }
    if (slot.jam > maxJam) break; // sisa waktu tidak terjadwal untuk blok ini
    const block = dayData.find(b => b.jamStart === slot.jam);
    if (block){
      const endIdx = slots.findIndex(s => s.type==='jam' && s.jam===block.jamEnd);
      const endSlot = slots[endIdx];
      rows.push({
        type:'subject', subject:block.subject, teacher:block.teacher, room:block.room,
        category:block.category, start:slot.start, end:endSlot.end,
        jamLabel: block.jamStart===block.jamEnd ? `Jam ${block.jamStart}` : `Jam ${block.jamStart}–${block.jamEnd}`
      });
      i = endIdx + 1;
    } else {
      i++;
    }
  }
  return rows;
}

function getCurrentDayKey(d){ return JS_DAY_TO_KEY[d.getDay()] || null; }

function findCurrentSubject(blok){
  const now = new Date();
  const dayKey = getCurrentDayKey(now);
  if (!dayKey) return { state:'libur' };
  const rows = buildDayRows(dayKey, SCHEDULES[blok]);
  const mins = nowMinutes(now);
  for (const row of rows){
    const s = timeToMinutes(row.start), e = timeToMinutes(row.end);
    if (mins >= s && mins < e){
      if (row.type === 'subject') return { state:'subject', row };
      return { state: row.type === 'break' ? 'istirahat' : 'khusus', row };
    }
  }
  return { state:'kosong' };
}

/* ---------------------------------------------------------------------- */
/* 7. CLOCK + DASHBOARD STATUS                                             */
/* ---------------------------------------------------------------------- */
function updateGreeting(){
  const h = new Date().getHours();
  let g = 'Selamat malam,';
  if (h < 11) g = 'Selamat pagi,';
  else if (h < 15) g = 'Selamat siang,';
  else if (h < 18) g = 'Selamat sore,';
  document.getElementById('greetText').textContent = g;
}

function updateClock(){
  const now = new Date();
  document.getElementById('clockTime').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('clockDate').textContent =
    now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function updateStatusCard(){
  const info = findCurrentSubject(currentBlok);
  const body = document.getElementById('statusBody');
  const label = document.querySelector('#statusCard .status-card__label');
  if (info.state === 'subject'){
    label.innerHTML = '<span class="ping"></span> sedang berlangsung';
    body.innerHTML = `
      <span class="status-card__subject">${info.row.subject}</span>
      <span class="status-card__meta">${info.row.teacher} · ${info.row.room}</span>
      <span class="status-card__time">${info.row.jamLabel} · ${info.row.start}–${info.row.end} WIB</span>`;
  } else if (info.state === 'istirahat'){
    label.innerHTML = '<span class="ping"></span> jeda';
    body.innerHTML = `<span class="status-card__subject">${info.row.label}</span>
      <span class="status-card__time">${info.row.start}–${info.row.end} WIB</span>`;
  } else if (info.state === 'khusus'){
    label.innerHTML = '<span class="ping"></span> agenda rutin';
    body.innerHTML = `<span class="status-card__subject">${info.row.label}</span>
      <span class="status-card__time">${info.row.start}–${info.row.end} WIB</span>`;
  } else if (info.state === 'libur'){
    label.innerHTML = 'akhir pekan';
    body.innerHTML = `<span class="status-card__subject">Tidak ada jadwal — selamat beristirahat 👋</span>`;
  } else {
    label.innerHTML = 'di luar jam sekolah';
    body.innerHTML = `<span class="status-card__subject">Belum / sudah selesai KBM hari ini</span>`;
  }
}

/* ---------------------------------------------------------------------- */
/* 8. NAVIGASI                                                             */
/* ---------------------------------------------------------------------- */
function setActiveView(target){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('is-active'));
  document.getElementById('view-' + target).classList.add('is-active');
  document.querySelectorAll('.navlink').forEach(n => n.classList.toggle('is-active', n.dataset.target === target));
  document.getElementById('mainNav').classList.remove('is-open');
}

/* ---------------------------------------------------------------------- */
/* 9. TUGAS / KANBAN                                                       */
/* ---------------------------------------------------------------------- */
function daysUntil(iso){
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso + 'T00:00:00');
  return Math.round((d - today) / 86400000);
}

function renderSubjectSelects(){
  const subjects = getAllSubjects();
  const filterSel = document.getElementById('filterSubject');
  const inputSel = document.getElementById('inputSubject');
  filterSel.innerHTML = '<option value="all">Semua Mapel</option>' +
    subjects.map(s => `<option value="${s}">${s}</option>`).join('');
  inputSel.innerHTML = subjects.map(s => `<option value="${s}">${s}</option>`).join('');
}

function renderTasks(){
  const filterSubject = document.getElementById('filterSubject').value;
  const sortMode = document.getElementById('sortDeadline').value;

  let filtered = tasks.filter(t => filterSubject === 'all' || t.subject === filterSubject);
  filtered.sort((a,b) => sortMode === 'deadline-asc'
    ? a.deadline.localeCompare(b.deadline)
    : b.deadline.localeCompare(a.deadline));

  document.getElementById('filterCount').textContent = `${filtered.length} tugas ditampilkan`;

  ['belum','sedang','selesai'].forEach(status=>{
    const list = document.getElementById('list' + cap(status));
    const items = filtered.filter(t => t.status === status);
    document.getElementById('count' + cap(status)).textContent = items.length;
    list.innerHTML = items.length ? items.map(taskCardHTML).join('') : `<p class="empty-note">Tidak ada tugas.</p>`;
  });

  // stat ringkasan di dashboard
  document.getElementById('statBelum').textContent = tasks.filter(t=>t.status==='belum').length;
  document.getElementById('statSedang').textContent = tasks.filter(t=>t.status==='sedang').length;
  document.getElementById('statSelesai').textContent = tasks.filter(t=>t.status==='selesai').length;

  renderUpcomingDeadlines();
  bindTaskActionButtons();
}

function cap(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

const SUBJECT_BADGE_COLOR = { teori:'badge--teori', kejuruan:'badge--kejuruan', olahraga:'badge--olahraga', khusus:'badge--khusus' };
function subjectCategory(name){
  for (const block of [SCHEDULE_UMUM, SCHEDULE_PRODUKTIF]){
    for (const day of Object.values(block)){
      const found = day.find(s => s.subject === name);
      if (found) return found.category;
    }
  }
  return 'teori';
}

function taskCardHTML(t){
  const dleft = daysUntil(t.deadline);
  const soon = dleft <= 2 && t.status !== 'selesai';
  const cat = subjectCategory(t.subject);
  const badgeClass = SUBJECT_BADGE_COLOR[cat] || 'badge--teori';
  const deadlineLabel = t.deadline.split('-').reverse().join('-');
  const dleftLabel = dleft === 0 ? 'hari ini' : dleft > 0 ? `H-${dleft}` : `terlewat ${Math.abs(dleft)} hari`;

  const photos = getTaskPhotos(t);

  let actions = '';
  if (isAdmin){
    if (t.status === 'belum') actions += `<button class="btn btn--sm" data-action="move" data-id="${t.id}" data-to="sedang">Mulai</button>`;
    if (t.status === 'sedang') actions += `<button class="btn btn--sm" data-action="move" data-id="${t.id}" data-to="belum">Batalkan</button><button class="btn btn--sm btn--primary" data-action="move" data-id="${t.id}" data-to="selesai">Selesai</button>`;
    if (t.status === 'selesai') actions += `<button class="btn btn--sm" data-action="move" data-id="${t.id}" data-to="sedang">Buka Lagi</button>`;
    actions += `<button class="btn btn--sm" data-action="edit" data-id="${t.id}">Edit</button>`;
    actions += `<button class="btn btn--sm" data-action="photo" data-id="${t.id}">${photos.length ? `Kelola Foto (${photos.length})` : '+ Foto'}</button>`;
    actions += `<button class="btn btn--sm" data-action="delete" data-id="${t.id}">Hapus</button>`;
  }

  const photoThumb = photos.length
    ? `<button type="button" class="task-card__photo" data-action="viewphoto" data-id="${t.id}" title="Lihat foto tugas / catatan materi">
        <img src="${photos[0]}" alt="Foto tugas ${escapeHTML(t.title)}" loading="lazy">
        ${photos.length > 1 ? `<span class="task-card__photo-count">+${photos.length - 1}</span>` : ''}
      </button>`
    : '';

  return `
    <div class="task-card">
      <div class="task-card__top">
        <span class="task-card__subject ${badgeClass}">${t.subject}</span>
        <span class="task-card__type">${t.type}</span>
      </div>
      <div class="task-card__title">${escapeHTML(t.title)}</div>
      ${photoThumb}
      ${t.desc ? `<div class="task-card__desc">${escapeHTML(t.desc)}</div>` : ''}
      <div class="task-card__deadline ${soon ? 'is-soon' : ''}">deadline ${deadlineLabel} · ${dleftLabel}</div>
      <div class="task-card__actions">${actions}</div>
    </div>`;
}

function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function bindTaskActionButtons(){
  document.querySelectorAll('[data-action="move"]').forEach(btn=>{
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const to = btn.dataset.to;
      try {
        await updateDoc(doc(db, 'tasks', id), { status: to });
      } catch(err){
        console.error(err);
        showDbError('Gagal menyimpan perubahan status tugas ke database. Cek koneksi internet.');
      }
    };
  });
  document.querySelectorAll('[data-action="delete"]').forEach(btn=>{
    btn.onclick = async () => {
      const id = btn.dataset.id;
      try {
        await deleteDoc(doc(db, 'tasks', id));
      } catch(err){
        console.error(err);
        showDbError('Gagal menghapus tugas dari database. Cek koneksi internet.');
      }
    };
  });
  document.querySelectorAll('[data-action="edit"]').forEach(btn=>{
    btn.onclick = () => openEditModal(btn.dataset.id);
  });
  document.querySelectorAll('[data-action="viewphoto"]').forEach(btn=>{
    btn.onclick = () => {
      const t = tasks.find(x => x.id === btn.dataset.id);
      const photos = getTaskPhotos(t);
      if (photos.length) openPhotoLightbox(photos, 0, t.title, t.desc);
    };
  });
  document.querySelectorAll('[data-action="photo"]').forEach(btn=>{
    btn.onclick = () => openTaskPhotoModal(btn.dataset.id);
  });
}

function renderUpcomingDeadlines(){
  const el = document.getElementById('upcomingDeadlines');
  const upcoming = tasks
    .filter(t => t.status !== 'selesai')
    .sort((a,b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);
  el.innerHTML = upcoming.length ? upcoming.map(t => `
    <div class="upcoming-item">
      <span class="upcoming-item__title">${escapeHTML(t.title)}</span>
      <span class="upcoming-item__meta">${t.deadline.split('-').reverse().join('-')}</span>
    </div>`).join('') : `<p class="empty-note">Tidak ada tugas mendatang.</p>`;
}

/* ---------------------------------------------------------------------- */
/* 10. MODAL TAMBAH TUGAS                                                  */
/* ---------------------------------------------------------------------- */
let newTaskPhotos = [];       // foto-foto yang sedang dipilih di form "Tugas Baru"/"Edit Tugas"
let editingTaskId = null;     // null = mode tambah tugas baru, terisi id = mode edit tugas

function openModal(){ document.getElementById('taskModalOverlay').classList.add('is-open'); }

function openEditModal(id){
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  editingTaskId = id;

  document.getElementById('inputSubject').value = t.subject;
  document.getElementById('inputTitle').value = t.title;
  document.getElementById('inputDeadline').value = t.deadline;
  document.getElementById('inputType').value = t.type;
  document.getElementById('inputDesc').value = t.desc || '';

  newTaskPhotos = getTaskPhotos(t).slice();
  renderInputPhotoGrid();

  document.querySelector('#taskModalOverlay h3').textContent = 'Edit Tugas';
  document.querySelector('#taskForm button[type="submit"]').textContent = 'Simpan Perubahan';

  openModal();
}

function closeModal(){
  document.getElementById('taskModalOverlay').classList.remove('is-open');
  document.getElementById('taskForm').reset();
  newTaskPhotos = [];
  editingTaskId = null;
  document.getElementById('inputPhotoPreviewWrap').innerHTML = '';
  document.getElementById('inputPhotoPreviewWrap').style.display = 'none';
  document.querySelector('#taskModalOverlay h3').textContent = 'Tugas Baru';
  document.querySelector('#taskForm button[type="submit"]').textContent = 'Simpan Tugas';
}

function renderInputPhotoGrid(){
  renderPhotoGrid(document.getElementById('inputPhotoPreviewWrap'), newTaskPhotos, (idx)=>{
    newTaskPhotos.splice(idx, 1);
    renderInputPhotoGrid();
  });
}

async function handleInputPhotoChange(e){
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files){
    try {
      const compressed = await compressImageFile(file);
      newTaskPhotos.push(compressed);
    } catch(err){
      console.error(err);
      alert('Gagal memproses salah satu foto, foto itu dilewati. Coba pilih foto lain.');
    }
  }
  e.target.value = ''; // supaya bisa pilih file yang sama lagi nanti kalau perlu
  renderInputPhotoGrid();
}

function handleTaskFormSubmit(e){
  e.preventDefault();
  const subject = document.getElementById('inputSubject').value;
  const title = document.getElementById('inputTitle').value.trim();
  const deadline = document.getElementById('inputDeadline').value;
  const type = document.getElementById('inputType').value;
  const desc = document.getElementById('inputDesc').value.trim();
  if (!title || !deadline) return;

  const data = { subject, title, deadline, type, desc, photos: newTaskPhotos, photoData: null };
  const submitBtn = document.querySelector('#taskForm button[type="submit"]');
  submitBtn.disabled = true;

  const promise = editingTaskId
    ? updateDoc(doc(db, 'tasks', editingTaskId), data)          // mode edit: status tidak diubah
    : addDoc(colTasks, { ...data, status: 'belum' });           // mode tambah tugas baru

  promise
    .then(()=>{ closeModal(); })
    .catch((err)=>{
      console.error(err);
      showDbError('Gagal menyimpan tugas ke database. Cek koneksi internet & konfigurasi Firebase.');
    })
    .finally(()=>{ submitBtn.disabled = false; });
}

/* ---------------------------------------------------------------------- */
/* 10b. MODAL FOTO TUGAS (tambah/ganti/hapus foto pada tugas yang sudah ada) */
/* ---------------------------------------------------------------------- */
let taskPhotoCurrentId = null;
let taskPhotoWorkingList = []; // daftar foto (lama + baru) yang sedang diedit di modal ini

function openTaskPhotoModal(id){
  taskPhotoCurrentId = id;
  document.getElementById('taskPhotoForm').reset();

  const t = tasks.find(x => x.id === id);
  taskPhotoWorkingList = getTaskPhotos(t).slice();
  renderTaskPhotoGrid();

  document.getElementById('taskPhotoModalOverlay').classList.add('is-open');
}

function closeTaskPhotoModal(){
  document.getElementById('taskPhotoModalOverlay').classList.remove('is-open');
  taskPhotoCurrentId = null;
  taskPhotoWorkingList = [];
}

function renderTaskPhotoGrid(){
  renderPhotoGrid(document.getElementById('taskPhotoPreviewWrap'), taskPhotoWorkingList, (idx)=>{
    taskPhotoWorkingList.splice(idx, 1);
    renderTaskPhotoGrid();
  });
}

async function handleTaskPhotoFileChange(e){
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  for (const file of files){
    try {
      const compressed = await compressImageFile(file);
      taskPhotoWorkingList.push(compressed);
    } catch(err){
      console.error(err);
      alert('Gagal memproses salah satu foto, foto itu dilewati. Coba pilih foto lain.');
    }
  }
  e.target.value = '';
  renderTaskPhotoGrid();
}

async function handleTaskPhotoFormSubmit(e){
  e.preventDefault();
  if (!taskPhotoCurrentId) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await updateDoc(doc(db, 'tasks', taskPhotoCurrentId), { photos: taskPhotoWorkingList, photoData: null });
    closeTaskPhotoModal();
  } catch(err){
    console.error(err);
    showDbError('Gagal menyimpan foto tugas ke database. Cek koneksi internet.');
  } finally {
    submitBtn.disabled = false;
  }
}

/* ---------------------------------------------------------------------- */
/* 10c. LIGHTBOX — LIHAT FOTO TUGAS & CATATAN MATERI                       */
/* ---------------------------------------------------------------------- */
let lightboxPhotos = [];  // daftar foto tugas yang sedang dibuka di lightbox
let lightboxIndex = 0;    // foto ke berapa yang sedang ditampilkan

function openPhotoLightbox(photos, startIndex, title, desc){
  lightboxPhotos = photos || [];
  lightboxIndex = startIndex || 0;
  document.getElementById('photoLightboxTitle').textContent = title || 'Foto Tugas';
  document.getElementById('photoLightboxDesc').textContent = desc || '';
  renderLightboxPhoto();
  document.getElementById('photoLightboxOverlay').classList.add('is-open');
}

function renderLightboxPhoto(){
  if (!lightboxPhotos.length) return;
  const dataURL = lightboxPhotos[lightboxIndex];
  const title = document.getElementById('photoLightboxTitle').textContent;

  document.getElementById('photoLightboxImg').src = dataURL;

  const downloadBtn = document.getElementById('downloadPhotoBtn');
  downloadBtn.href = dataURL;
  downloadBtn.download = photoFileName(title, lightboxIndex);

  const nav = document.getElementById('photoLightboxNav');
  const counter = document.getElementById('photoLightboxCounter');
  if (lightboxPhotos.length > 1){
    nav.style.display = 'flex';
    counter.textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  } else {
    nav.style.display = 'none';
  }
}

function showPrevPhoto(){
  if (lightboxPhotos.length < 2) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
  renderLightboxPhoto();
}

function showNextPhoto(){
  if (lightboxPhotos.length < 2) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
  renderLightboxPhoto();
}

function closePhotoLightbox(){
  document.getElementById('photoLightboxOverlay').classList.remove('is-open');
  document.getElementById('photoLightboxImg').src = '';
  document.getElementById('downloadPhotoBtn').href = '#';
  lightboxPhotos = [];
  lightboxIndex = 0;
}

/* Nama file unduhan dari judul tugas, dibersihkan dari karakter yang tidak
   aman untuk nama file, lalu dibubuhi nomor urut & ekstensi .jpg (hasil
   kompresi selalu JPEG). */
function photoFileName(title, index = 0){
  const safe = (title || 'foto-tugas')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // hilangkan diakritik
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'foto-tugas';
  return `${safe}-${index + 1}.jpg`;
}

/* ---------------------------------------------------------------------- */
/* 11. KALENDER AKADEMIK                                                   */
/* ---------------------------------------------------------------------- */
const CAL_DOT_CLASS = {
  'pts':'legend-dot--pts', 'pas':'legend-dot--pas', 'ukk':'legend-dot--ukk',
  'tka':'legend-dot--tka', 'an':'legend-dot--an',
  'libur-semester':'legend-dot--libur-semester', 'libur-nasional':'legend-dot--libur-nasional', 'sekolah':'legend-dot--sekolah',
  'pribadi':'legend-dot--pribadi'
};

function eventsForDate(iso){ return allEvents().filter(e => e.date === iso); }

function renderCalendar(){
  const year = calViewDate.getFullYear();
  const month = calViewDate.getMonth();
  document.getElementById('calMonthLabel').textContent =
    calViewDate.toLocaleDateString('id-ID', { month:'long', year:'numeric' });

  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay(); // 0=Min
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayISO = new Date().toISOString().slice(0,10);
  const grid = document.getElementById('calGrid');
  const cells = [];

  for (let i=0; i<startOffset; i++){
    const dnum = daysInPrevMonth - startOffset + i + 1;
    cells.push({ dnum, outside:true, iso:null });
  }
  for (let d=1; d<=daysInMonth; d++){
    const iso = `${year}-${pad(month+1)}-${pad(d)}`;
    cells.push({ dnum:d, outside:false, iso });
  }
  while (cells.length % 7 !== 0){
    cells.push({ dnum: cells.length - startOffset - daysInMonth + 1, outside:true, iso:null });
  }

  grid.innerHTML = cells.map(c => {
    if (c.outside) return `<div class="cal-cell is-outside"><span class="cal-daynum">${c.dnum}</span></div>`;
    const evs = eventsForDate(c.iso);
    const isToday = c.iso === todayISO;
    const dots = evs.map(e => `<span class="cal-dot ${CAL_DOT_CLASS[e.type]}"></span>`).join('');
    return `<div class="cal-cell ${isToday?'is-today':''} ${evs.length?'has-event':''}" data-iso="${c.iso}">
      <span class="cal-daynum">${c.dnum}</span>
      <span class="cal-dots">${dots}</span>
    </div>`;
  }).join('');

  grid.querySelectorAll('.cal-cell.has-event').forEach(cell=>{
    cell.onclick = () => showCalDetail(cell.dataset.iso);
  });

  renderUpcomingEvents();
}

function showCalDetail(iso){
  const evs = eventsForDate(iso);
  const label = new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('calEventDetail').innerHTML = `<strong>${label}</strong>` +
    evs.map(e => `<div class="cal-event-row">
        <span>${CAL_TYPE_LABEL[e.type]}: ${escapeHTML(e.title)}</span>
        ${(e.custom && isAdmin) ? `<button class="icon-btn icon-btn--tiny" data-action="delete-event" data-id="${e.id}" title="Hapus acara">&times;</button>` : ''}
      </div>`).join('');

  document.querySelectorAll('[data-action="delete-event"]').forEach(btn=>{
    btn.onclick = async () => {
      const id = btn.dataset.id;
      try {
        await deleteDoc(doc(db, 'calendarEvents', id));
        showCalDetail(iso);
      } catch(err){
        console.error(err);
        showDbError('Gagal menghapus acara dari database. Cek koneksi internet.');
      }
    };
  });
}

function renderUpcomingEvents(){
  const todayISO = new Date().toISOString().slice(0,10);
  const upcoming = [...allEvents()]
    .filter(e => e.date >= todayISO)
    .sort((a,b) => a.date.localeCompare(b.date));

  // satu entri per judul unik terdekat
  const seen = new Set();
  const unique = [];
  for (const e of upcoming){
    if (!seen.has(e.title)){ seen.add(e.title); unique.push(e); }
    if (unique.length >= 4) break;
  }

  const el = document.getElementById('upcomingEvents');
  el.innerHTML = unique.length ? unique.map(e => `
    <div class="upcoming-item">
      <span class="upcoming-item__title">${e.title}</span>
      <span class="upcoming-item__meta">${e.date.split('-').reverse().join('-')}</span>
    </div>`).join('') : `<p class="empty-note">Tidak ada agenda mendatang.</p>`;
}

/* ---------- Modal tambah acara kalender ---------- */
function openCalEventModal(){
  const dateInput = document.getElementById('calInputDate');
  if (!dateInput.value){
    const y = calViewDate.getFullYear(), m = calViewDate.getMonth();
    const today = new Date();
    const usableDate = (today.getFullYear()===y && today.getMonth()===m) ? today : new Date(y, m, 1);
    dateInput.value = usableDate.toISOString().slice(0,10);
  }
  document.getElementById('calEventModalOverlay').classList.add('is-open');
}
function closeCalEventModal(){
  document.getElementById('calEventModalOverlay').classList.remove('is-open');
  document.getElementById('calEventForm').reset();
}
function handleCalEventFormSubmit(e){
  e.preventDefault();
  const date = document.getElementById('calInputDate').value;
  const title = document.getElementById('calInputTitle').value.trim();
  const type = document.getElementById('calInputType').value;
  if (!date || !title) return;

  const submitBtn = document.querySelector('#calEventForm button[type="submit"]');
  submitBtn.disabled = true;
  addDoc(colCalEvents, { date, title, type })
    .then(()=>{
      closeCalEventModal();
      const [y,m] = date.split('-').map(Number);
      calViewDate = new Date(y, m-1, 1);
      renderCalendar();
      showCalDetail(date);
    })
    .catch((err)=>{
      console.error(err);
      showDbError('Gagal menyimpan acara ke database. Cek koneksi internet & konfigurasi Firebase.');
    })
    .finally(()=>{ submitBtn.disabled = false; });
}

/* ---------------------------------------------------------------------- */
/* 12. JADWAL PELAJARAN                                                    */
/* ---------------------------------------------------------------------- */
const CATEGORY_BADGE = { teori:'badge--teori', kejuruan:'badge--kejuruan', olahraga:'badge--olahraga', khusus:'badge--khusus' };

function renderJadwal(){
  const scheduleBlock = SCHEDULES[jadwalTabBlok];
  const container = document.getElementById('jadwalDays');
  container.innerHTML = DAY_ORDER.map(dayKey => {
    const rows = buildDayRows(dayKey, scheduleBlock);
    const roomsUsed = [...new Set(rows.filter(r=>r.type==='subject').map(r=>r.room))].join(' · ');
    const rowsHTML = rows.map(r => {
      if (r.type === 'subject'){
        return `<div class="slot-row">
          <span class="slot-time">${r.start}–${r.end}</span>
          <span class="slot-info">
            <span class="slot-subject">${r.subject} <span class="badge ${CATEGORY_BADGE[r.category]}">${r.category}</span></span>
            <span class="slot-teacher">${r.teacher} · ${r.room}</span>
          </span>
          <span class="slot-jam">${r.jamLabel}</span>
        </div>`;
      }
      const cls = r.type === 'special' ? 'is-special' : 'is-break';
      return `<div class="slot-row ${cls}">
        <span class="slot-time">${r.start}–${r.end}</span>
        <span class="slot-info"><span class="slot-subject">${r.label}</span></span>
        <span class="slot-jam"></span>
      </div>`;
    }).join('');

    return `<div class="day-card">
      <div class="day-card__head"><h4>${DAY_LABELS[dayKey]}</h4><span class="day-card__room">${roomsUsed}</span></div>
      <div class="day-card__body">${rowsHTML || '<div class="slot-row"><span class="slot-info">Tidak ada jadwal</span></div>'}</div>
    </div>`;
  }).join('');
}

/* ---------------------------------------------------------------------- */
/* 13. KAS KELAS (iuran bulanan — per siswa)                              */
/* ---------------------------------------------------------------------- */
const KAS_AMOUNT = 10000;           // Rp per bulan
const KAS_START = '2026-08';        // awal tahun ajaran 2026/2027
const KAS_END   = '2027-06';        // akhir tahun ajaran

// Data siswa — XI PPLG A, SMK Negeri 2 Klaten, TP 2025/2026
// (No Induk & Nama sesuai Daftar Hadir Murid Baru)
const STUDENTS = [
  { induk:'25.7.1007-01', nama:'ABDULLAH RIZKI JULIANO', jk:'L' },
  { induk:'25.7.1008-02', nama:'ADIL PAMBUDI', jk:'L' },
  { induk:'25.7.1009-03', nama:'ALMIRA SAFA PERMATA', jk:'P' },
  { induk:'25.7.1010-04', nama:'ALVIANA AYU WULANDARI', jk:'P' },
  { induk:'25.7.1011-05', nama:'ANASTA SEPTRIA AULIYANA', jk:'P' },
  { induk:'25.7.1012-06', nama:'ANNE ELLOK RAHMA MAULIDA', jk:'P' },
  { induk:'25.7.1013-07', nama:'ASHILLA PUTRI ROMADHONI', jk:'P' },
  { induk:'25.7.1014-08', nama:'AZIZAH NASWA NUR ALIVIA', jk:'P' },
  { induk:'25.7.1015-09', nama:'BUNGA CAMELIA SARI', jk:'P' },
  { induk:'25.7.1016-10', nama:'DHANI ARYO MAULANA', jk:'L' },
  { induk:'25.7.1017-11', nama:'DZAKI IBRAR MUKLISIN', jk:'L' },
  { induk:'25.7.1018-12', nama:'FAIZ DAAREN EL FATIH BIN AWALUDIN', jk:'L' },
  { induk:'25.7.1019-13', nama:'FATIN NADA SALSABILA', jk:'P' },
  { induk:'25.7.1020-14', nama:'GALUH CAHYA NINGRUM', jk:'P' },
  { induk:'25.7.1021-15', nama:'JAYINDRA KAKA ATMAJA', jk:'L' },
  { induk:'25.7.1022-16', nama:'KIRANA PARAHITA BILQIS AGTYASTA', jk:'P' },
  { induk:'25.7.1023-17', nama:'LISAN PATTI ARERAM', jk:'L' },
  { induk:'25.7.1024-18', nama:'MADA VOLTA AGATHON', jk:'L' },
  { induk:'25.7.1025-19', nama:'MOHAMMAD BILAL FAWAAZA', jk:'L' },
  { induk:'25.7.1026-20', nama:'MUHAMMAD AINUR ROFIQ', jk:'L' },
  { induk:'25.7.1027-21', nama:'MUHAMMAD FADIL', jk:'L' },
  { induk:'25.7.1028-22', nama:'MUHAMMAD REZA AFFADHIL', jk:'L' },
  { induk:'25.7.1030-23', nama:'NATAKA RADITYA AL FAQIH', jk:'L' },
  { induk:'25.7.1031-24', nama:'NATASHA ARUM WIJAYANTI', jk:'P' },
  { induk:'25.7.1032-25', nama:'PIVEL FAITH WIBAWA', jk:'L' },
  { induk:'25.7.1033-26', nama:'RAAFI YUSRAN', jk:'L' },
  { induk:'25.7.1034-27', nama:'REZA ALVINO OKTAVIANTO', jk:'L' },
  { induk:'25.7.1035-28', nama:'SELVIYATUL SHOLIKAH', jk:'P' },
  { induk:'25.7.1036-29', nama:'SHAFIRA MAULIA', jk:'P' },
  { induk:'25.7.1037-30', nama:'ZAHRA RAMADHANI', jk:'P' },
  { induk:'25.7.1038-31', nama:"ZAHRA' ZA'IIMAH ZAKIYYAH", jk:'P' },
];

function kasMonthRange(startYM, endYM){
  const months = [];
  let [y, m] = startYM.split('-').map(Number);
  const [endY, endM] = endYM.split('-').map(Number);
  while (y < endY || (y === endY && m <= endM)){
    months.push(`${y}-${pad(m)}`);
    m++;
    if (m > 12){ m = 1; y++; }
  }
  return months;
}
const KAS_MONTHS = kasMonthRange(KAS_START, KAS_END);

// kasData: { [noInduk]: { [ym]: { paid:true, paidAt:'YYYY-MM-DD' } } } — disinkron realtime dari Firestore
let kasData = {};
let kasSearchTerm = '';
let kasFilterStatus = 'all';
const kasExpanded = new Set(); // no induk siswa yang sedang dibuka rinciannya

function kasDocId(induk, ym){ return `${induk}_${ym}`; }

function subscribeKas(){
  onSnapshot(colKas, (snap)=>{
    const data = {};
    STUDENTS.forEach(s => { data[s.induk] = {}; });
    snap.docs.forEach(d => {
      const rec = d.data();
      if (!rec || !rec.induk || !rec.ym) return;
      if (!data[rec.induk]) data[rec.induk] = {};
      data[rec.induk][rec.ym] = { paid: !!rec.paid, paidAt: rec.paidAt || null };
    });
    kasData = data;
    renderKas();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat data kas dari database. Cek koneksi internet & konfigurasi Firebase.');
  });
}

async function toggleKasBulan(induk, ym){
  const entry = (kasData[induk] && kasData[induk][ym]) || { paid:false };
  const paid = !entry.paid;
  const paidAt = paid ? new Date().toISOString().slice(0,10) : null;
  try {
    await setDoc(doc(db, 'kasPayments', kasDocId(induk, ym)), { induk, ym, paid, paidAt });
  } catch(err){
    console.error(err);
    showDbError('Gagal menyimpan status kas ke database. Cek koneksi internet.');
  }
}

function kasMonthLabel(ym){
  const [y,m] = ym.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleDateString('id-ID', { month:'long', year:'numeric' });
}
function kasMonthShort(ym){
  const [y,m] = ym.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleDateString('id-ID', { month:'short' });
}
function formatRupiah(n){ return 'Rp' + n.toLocaleString('id-ID'); }

function kasStudentSummary(induk, currentYM){
  const records = kasData[induk] || {};
  const paidCount = KAS_MONTHS.filter(ym => records[ym] && records[ym].paid).length;
  const dueSoFar = KAS_MONTHS.filter(ym => ym <= currentYM).length;
  const unpaidSoFar = Math.max(dueSoFar - paidCount, 0);
  const paidThisMonth = !!(records[currentYM] && records[currentYM].paid);
  return { paidCount, unpaidSoFar, paidThisMonth, totalCollected: paidCount * KAS_AMOUNT };
}

function renderKas(){
  const currentYM = `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}`;

  // ringkasan seluruh kelas
  let totalCollectedAll = 0, lunasBulanIni = 0, totalTunggakanAll = 0;
  STUDENTS.forEach(s=>{
    const sum = kasStudentSummary(s.induk, currentYM);
    totalCollectedAll += sum.totalCollected;
    totalTunggakanAll += sum.unpaidSoFar;
    if (sum.paidThisMonth) lunasBulanIni++;
  });

  document.getElementById('kasTotalTerkumpul').textContent = formatRupiah(totalCollectedAll);
  document.getElementById('kasLunasCount').textContent = `${lunasBulanIni} / ${STUDENTS.length} siswa`;
  document.getElementById('kasTunggakanCount').textContent = `${totalTunggakanAll} bulan`;

  // filter & pencarian
  const term = kasSearchTerm.trim().toLowerCase();
  let filtered = STUDENTS.filter(s=>{
    if (term && !(s.nama.toLowerCase().includes(term) || s.induk.toLowerCase().includes(term))) return false;
    const sum = kasStudentSummary(s.induk, currentYM);
    if (kasFilterStatus === 'lunas' && !sum.paidThisMonth) return false;
    if (kasFilterStatus === 'tunggakan' && sum.unpaidSoFar === 0) return false;
    return true;
  });

  const countEl = document.getElementById('kasFilterCount');
  if (countEl) countEl.textContent = `${filtered.length} siswa`;

  const list = document.getElementById('kasList');
  if (!filtered.length){
    list.innerHTML = `<div class="kas-empty">Tidak ada siswa yang cocok.</div>`;
    return;
  }

  list.innerHTML = filtered.map(s=>{
    const sum = kasStudentSummary(s.induk, currentYM);
    const isExpanded = kasExpanded.has(s.induk);
    const statusClass = sum.paidThisMonth ? 'is-paid' : (sum.unpaidSoFar > 0 ? 'is-overdue' : 'is-pending');
    const statusLabel = sum.paidThisMonth ? 'Lunas bulan ini' : (sum.unpaidSoFar > 0 ? `Menunggak ${sum.unpaidSoFar} bln` : 'Belum bayar bulan ini');

    const monthsHTML = KAS_MONTHS.map(ym=>{
      const rec = kasData[s.induk] && kasData[s.induk][ym];
      const paid = !!(rec && rec.paid);
      const isCurrent = ym === currentYM;
      const isPast = ym < currentYM;
      const overdue = !paid && isPast;
      let mClass = paid ? 'is-paid' : (overdue ? 'is-overdue' : 'is-pending');
      const tip = `${kasMonthLabel(ym)} — ${paid ? 'Lunas' + (rec.paidAt ? ' · dibayar ' + rec.paidAt.split('-').reverse().join('-') : '') : 'Belum bayar'}`;
      if (!isAdmin){
        return `<span class="kas-month-btn ${mClass} ${isCurrent ? 'is-current' : ''}" title="${tip}">${kasMonthShort(ym)}</span>`;
      }
      return `<button type="button" class="kas-month-btn ${mClass} ${isCurrent ? 'is-current' : ''}"
        data-kas-toggle="${s.induk}" data-kas-ym="${ym}"
        title="${tip}">
        ${kasMonthShort(ym)}
      </button>`;
    }).join('');

    return `<div class="kas-row ${statusClass} ${isExpanded ? 'is-expanded' : ''}">
      <button type="button" class="kas-row__head" data-kas-expand="${s.induk}">
        <span class="kas-row__chevron">${isExpanded ? '▾' : '▸'}</span>
        <div class="kas-row__info">
          <span class="kas-row__month">${s.nama} <span class="kas-row__tag kas-row__jk">${s.jk}</span></span>
          <span class="kas-row__meta">No. Induk ${s.induk} · ${sum.paidCount}/${KAS_MONTHS.length} bulan · ${formatRupiah(sum.totalCollected)} terkumpul</span>
        </div>
        <span class="kas-row__status">${statusLabel}</span>
      </button>
      ${isExpanded ? `<div class="kas-months">${monthsHTML}</div>` : ''}
    </div>`;
  }).join('');
}

/* ---------------------------------------------------------------------- */
/* 13b. BUKU KAS — PEMASUKAN & PENGELUARAN (di luar iuran bulanan)         */
/*      Firestore collection 'kasTransactions': { type, date, amount,     */
/*      desc, createdAt }. Saldo = total iuran terkumpul + pemasukan lain */
/*      - pengeluaran.                                                    */
/* ---------------------------------------------------------------------- */
let kasTransactions = []; // disinkron realtime dari Firestore

function subscribeKasTx(){
  onSnapshot(colKasTx, (snap)=>{
    kasTransactions = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt||0) - (a.createdAt||0));
    renderKasTx();
  }, (err)=>{
    console.error(err);
    showDbError('Gagal memuat data pemasukan/pengeluaran kas dari database. Cek koneksi internet.');
  });
}

function renderKasTx(){
  const saldoEl = document.getElementById('kasSaldo');
  const masukEl = document.getElementById('kasTotalMasuk');
  const keluarEl = document.getElementById('kasTotalKeluar');
  const list = document.getElementById('kasTxList');
  if (!saldoEl || !masukEl || !keluarEl || !list) return; // view belum dirender

  const totalMasuk = kasTransactions.filter(t => t.type === 'masuk').reduce((sum,t) => sum + Number(t.amount || 0), 0);
  const totalKeluar = kasTransactions.filter(t => t.type === 'keluar').reduce((sum,t) => sum + Number(t.amount || 0), 0);

  const currentYM = `${new Date().getFullYear()}-${pad(new Date().getMonth()+1)}`;
  let totalIuran = 0;
  STUDENTS.forEach(s => { totalIuran += kasStudentSummary(s.induk, currentYM).totalCollected; });

  const saldo = totalIuran + totalMasuk - totalKeluar;
  saldoEl.textContent = formatRupiah(saldo);
  masukEl.textContent = formatRupiah(totalMasuk);
  keluarEl.textContent = formatRupiah(totalKeluar);

  if (!kasTransactions.length){
    list.innerHTML = `<div class="kas-empty">Belum ada pemasukan lain atau pengeluaran yang dicatat.</div>`;
    return;
  }

  list.innerHTML = kasTransactions.map(t => {
    const isMasuk = t.type === 'masuk';
    const dateLabel = (t.date || '').split('-').reverse().join('-');
    return `<div class="kas-tx-row">
      <span class="kas-tx-row__badge ${isMasuk ? 'is-masuk' : 'is-keluar'}">${isMasuk ? 'Pemasukan' : 'Pengeluaran'}</span>
      <div class="kas-tx-row__info">
        <span class="kas-tx-row__desc">${escapeHTML(t.desc || '-')}</span>
        <span class="kas-tx-row__date">${dateLabel}</span>
      </div>
      <span class="kas-tx-row__amount ${isMasuk ? 'is-masuk' : 'is-keluar'}">${isMasuk ? '+' : '−'}${formatRupiah(Number(t.amount || 0))}</span>
      ${isAdmin ? `<button type="button" class="btn btn--sm" data-action="deletetx" data-id="${t.id}">Hapus</button>` : ''}
    </div>`;
  }).join('');

  if (isAdmin){
    document.querySelectorAll('[data-action="deletetx"]').forEach(btn=>{
      btn.onclick = async () => {
        try {
          await deleteDoc(doc(db, 'kasTransactions', btn.dataset.id));
        } catch(err){
          console.error(err);
          showDbError('Gagal menghapus transaksi kas dari database. Cek koneksi internet.');
        }
      };
    });
  }
}

function openKasTxModal(){
  document.getElementById('kasTxForm').reset();
  document.getElementById('txDate').value = new Date().toISOString().slice(0,10);
  document.getElementById('kasTxModalOverlay').classList.add('is-open');
}
function closeKasTxModal(){
  document.getElementById('kasTxModalOverlay').classList.remove('is-open');
  document.getElementById('kasTxForm').reset();
}

function handleKasTxFormSubmit(e){
  e.preventDefault();
  const type = document.getElementById('txType').value;
  const date = document.getElementById('txDate').value;
  const amount = Number(document.getElementById('txAmount').value);
  const desc = document.getElementById('txDesc').value.trim();
  if (!date || !amount || !desc) return;

  const submitBtn = document.querySelector('#kasTxForm button[type="submit"]');
  submitBtn.disabled = true;
  addDoc(colKasTx, { type, date, amount, desc, createdAt: Date.now() })
    .then(()=>{ closeKasTxModal(); })
    .catch((err)=>{
      console.error(err);
      showDbError('Gagal menyimpan transaksi kas ke database. Cek koneksi internet & konfigurasi Firebase.');
    })
    .finally(()=>{ submitBtn.disabled = false; });
}

/* ---------------------------------------------------------------------- */
/* 14. TEMA                                                                 */
/* ---------------------------------------------------------------------- */
function applyTheme(theme){
  document.body.dataset.theme = theme;
  document.getElementById('iconSun').style.display = theme === 'light' ? 'none' : 'block';
  document.getElementById('iconMoon').style.display = theme === 'light' ? 'block' : 'none';
  if (HAS_STORAGE) localStorage.setItem(STORAGE_KEY_THEME, theme);
}

function toggleTheme(){
  const isLight = document.body.dataset.theme === 'light';
  applyTheme(isLight ? 'dark' : 'light');
}

/* ---------------------------------------------------------------------- */
/* 15. INIT                                                                 */
/* ---------------------------------------------------------------------- */
function init(){
  showStorageWarning();

  // Navigasi
  document.querySelectorAll('.navlink').forEach(btn=>{
    btn.addEventListener('click', () => setActiveView(btn.dataset.target));
  });
  document.getElementById('navBurger').addEventListener('click', () => {
    document.getElementById('mainNav').classList.toggle('is-open');
  });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  if (HAS_STORAGE){
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    if (savedTheme) applyTheme(savedTheme);
  }

  // Blok aktif (dimuat sebelum status pertama kali dihitung)
  const blokSelect = document.getElementById('blokAktifSelect');
  if (HAS_STORAGE){
    const savedBlok = localStorage.getItem(STORAGE_KEY_BLOK);
    if (savedBlok === 'umum' || savedBlok === 'produktif'){
      currentBlok = savedBlok;
      blokSelect.value = savedBlok;
    }
  }
  blokSelect.addEventListener('change', (e)=>{
    currentBlok = e.target.value;
    if (HAS_STORAGE) localStorage.setItem(STORAGE_KEY_BLOK, currentBlok);
    updateStatusCard();
  });

  // Jam & status
  updateGreeting();
  updateClock();
  updateStatusCard();
  setInterval(updateClock, 1000);
  setInterval(updateStatusCard, 15000);
  setInterval(updateGreeting, 60000);

  // Login Admin
  document.getElementById('adminBadge').addEventListener('click', ()=>{
    if (isAdmin){
      signOut(auth).catch(err=>console.error(err));
    } else {
      openAdminModal();
    }
  });
  document.getElementById('closeAdminModal').addEventListener('click', closeAdminModal);
  document.getElementById('adminModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'adminModalOverlay') closeAdminModal();
  });
  document.getElementById('adminForm').addEventListener('submit', handleAdminFormSubmit);

  // Tugas
  renderSubjectSelects();
  renderTasks(); // render awal (kosong) sebelum data Firestore masuk
  seedDefaultTasksIfEmpty().catch(err=>console.error(err));
  subscribeTasks();
  document.getElementById('filterSubject').addEventListener('change', renderTasks);
  document.getElementById('sortDeadline').addEventListener('change', renderTasks);
  document.getElementById('openTaskModal').addEventListener('click', openModal);
  document.getElementById('closeTaskModal').addEventListener('click', closeModal);
  document.getElementById('taskModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'taskModalOverlay') closeModal();
  });
  document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);
  document.getElementById('inputPhoto').addEventListener('change', handleInputPhotoChange);

  // Foto tugas (tambah/hapus per-foto pada tugas yang sudah ada) + lightbox
  document.getElementById('closeTaskPhotoModal').addEventListener('click', closeTaskPhotoModal);
  document.getElementById('taskPhotoModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'taskPhotoModalOverlay') closeTaskPhotoModal();
  });
  document.getElementById('taskPhotoFile').addEventListener('change', handleTaskPhotoFileChange);
  document.getElementById('taskPhotoForm').addEventListener('submit', handleTaskPhotoFormSubmit);

  document.getElementById('closePhotoLightbox').addEventListener('click', closePhotoLightbox);
  document.getElementById('photoLightboxOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'photoLightboxOverlay') closePhotoLightbox();
  });
  document.getElementById('prevPhotoBtn').addEventListener('click', showPrevPhoto);
  document.getElementById('nextPhotoBtn').addEventListener('click', showNextPhoto);

  // Kalender
  renderCalendar();
  subscribeCalEvents();
  document.getElementById('calPrev').addEventListener('click', ()=>{
    calViewDate.setMonth(calViewDate.getMonth()-1); renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', ()=>{
    calViewDate.setMonth(calViewDate.getMonth()+1); renderCalendar();
  });

  // Jadwal
  if (HAS_STORAGE){
    const savedJadwalBlok = localStorage.getItem(STORAGE_KEY_JADWAL_BLOK);
    if (savedJadwalBlok === 'umum' || savedJadwalBlok === 'produktif'){
      jadwalTabBlok = savedJadwalBlok;
      document.querySelectorAll('.blok-btn').forEach(b=>{
        b.classList.toggle('is-active', b.dataset.blok === savedJadwalBlok);
      });
    }
  }
  renderJadwal();
  document.querySelectorAll('.blok-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.blok-btn').forEach(b=>b.classList.remove('is-active'));
      btn.classList.add('is-active');
      jadwalTabBlok = btn.dataset.blok;
      if (HAS_STORAGE) localStorage.setItem(STORAGE_KEY_JADWAL_BLOK, jadwalTabBlok);
      renderJadwal();
    });
  });

  // Kas
  renderKas(); // render awal (kosong) sebelum data Firestore masuk
  subscribeKas();
  document.getElementById('kasSearch').addEventListener('input', (e)=>{
    kasSearchTerm = e.target.value;
    renderKas();
  });
  document.getElementById('kasFilterStatus').addEventListener('change', (e)=>{
    kasFilterStatus = e.target.value;
    renderKas();
  });
  document.getElementById('kasList').addEventListener('click', (e)=>{
    const expandBtn = e.target.closest('[data-kas-expand]');
    if (expandBtn){
      const induk = expandBtn.dataset.kasExpand;
      if (kasExpanded.has(induk)) kasExpanded.delete(induk);
      else kasExpanded.add(induk);
      renderKas();
      return;
    }
    const btn = e.target.closest('[data-kas-toggle]');
    if (!btn) return;
    toggleKasBulan(btn.dataset.kasToggle, btn.dataset.kasYm);
  });

  // Buku kas: pemasukan & pengeluaran
  renderKasTx(); // render awal (kosong) sebelum data Firestore masuk
  subscribeKasTx();
  document.getElementById('openKasTxModal').addEventListener('click', openKasTxModal);
  document.getElementById('closeKasTxModal').addEventListener('click', closeKasTxModal);
  document.getElementById('kasTxModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'kasTxModalOverlay') closeKasTxModal();
  });
  document.getElementById('kasTxForm').addEventListener('submit', handleKasTxFormSubmit);

  // Tambah acara kalender
  document.getElementById('openCalEventModal').addEventListener('click', openCalEventModal);
  document.getElementById('closeCalEventModal').addEventListener('click', closeCalEventModal);
  document.getElementById('calEventModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'calEventModalOverlay') closeCalEventModal();
  });
  document.getElementById('calEventForm').addEventListener('submit', handleCalEventFormSubmit);

  // ============ TAMAN ============
  // Sambutan
  renderTamanSambutan();
  subscribeTamanSettings();
  document.getElementById('editSambutanBtn').addEventListener('click', openSambutanModal);
  document.getElementById('closeSambutanModal').addEventListener('click', closeSambutanModal);
  document.getElementById('sambutanModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'sambutanModalOverlay') closeSambutanModal();
  });
  document.getElementById('sambutanForm').addEventListener('submit', handleSambutanFormSubmit);
  document.getElementById('sambutanPhoto').addEventListener('change', handleSambutanPhotoChange);

  // Daftar Tanaman
  renderPlantGrid(); // render awal (kosong) sebelum data Firestore masuk
  subscribeTamanPlants();
  document.getElementById('openPlantModal').addEventListener('click', openPlantModal);
  document.getElementById('closePlantModal').addEventListener('click', closePlantModal);
  document.getElementById('plantModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'plantModalOverlay') closePlantModal();
  });
  document.getElementById('plantForm').addEventListener('submit', handlePlantFormSubmit);
  document.getElementById('plantPhoto').addEventListener('change', handlePlantPhotoChange);

  // Detail tanaman + QR
  document.getElementById('closePlantDetailModal').addEventListener('click', closePlantDetailModal);
  document.getElementById('plantDetailModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'plantDetailModalOverlay') closePlantDetailModal();
  });
  document.getElementById('downloadPlantQR').addEventListener('click', downloadPlantQR);
  document.getElementById('printPlantQR').addEventListener('click', printPlantQR);
  document.getElementById('editPlantFromDetail').addEventListener('click', editPlantFromDetail);
  document.getElementById('deletePlantFromDetail').addEventListener('click', deletePlantFromDetail);
  document.getElementById('exploreWebsiteBtn').addEventListener('click', exploreWebsite);

  // Kegiatan Selasa Asri
  renderSelasaAsriList(); // render awal (kosong) sebelum data Firestore masuk
  subscribeTamanKegiatan();
  document.getElementById('openKegiatanModal').addEventListener('click', openKegiatanModal);
  document.getElementById('closeKegiatanModal').addEventListener('click', closeKegiatanModal);
  document.getElementById('kegiatanModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'kegiatanModalOverlay') closeKegiatanModal();
  });
  document.getElementById('kegiatanForm').addEventListener('submit', handleKegiatanFormSubmit);
  document.getElementById('kegiatanPhoto').addEventListener('change', handleKegiatanPhotoChange);

  // Piket Harian
  renderPiketHarianList(); // render awal (kosong) sebelum data Firestore masuk
  subscribeTamanPiket();
  document.getElementById('openPiketModal').addEventListener('click', openPiketModal);
  document.getElementById('closePiketModal').addEventListener('click', closePiketModal);
  document.getElementById('piketModalOverlay').addEventListener('click', (e)=>{
    if (e.target.id === 'piketModalOverlay') closePiketModal();
  });
  document.getElementById('piketForm').addEventListener('submit', handlePiketFormSubmit);
  document.getElementById('piketPhoto').addEventListener('change', handlePiketPhotoChange);
}

document.addEventListener('DOMContentLoaded', init);
