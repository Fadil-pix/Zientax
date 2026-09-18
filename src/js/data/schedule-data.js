/* ==========================================================================
   DATA: JADWAL PELAJARAN
   Data statis murni (tidak ada akses DOM / Firebase) — struktur jam
   pelajaran per hari, jadwal Blok Umum, dan jadwal Blok Produktif PPLG.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 1. STRUKTUR JAM PELAJARAN (per hari)                                    */
/* ---------------------------------------------------------------------- */
export const TIME_SLOTS = {
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

export const DAY_LABELS = { senin:'Senin', selasa:'Selasa', rabu:'Rabu', kamis:'Kamis', jumat:'Jumat' };
export const DAY_ORDER = ['senin','selasa','rabu','kamis','jumat'];
export const JS_DAY_TO_KEY = { 1:'senin', 2:'selasa', 3:'rabu', 4:'kamis', 5:'jumat' }; // 0=Min,6=Sab -> libur

/* ---------------------------------------------------------------------- */
/* 2. JADWAL BLOK UMUM (Ruang 3)                                          */
/* ---------------------------------------------------------------------- */
export const SCHEDULE_UMUM = {
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
export const SCHEDULE_PRODUKTIF = {
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

export const SCHEDULES = { umum: SCHEDULE_UMUM, produktif: SCHEDULE_PRODUKTIF };

/* Daftar mapel unik (untuk form tugas & filter) */
export function getAllSubjects(){
  const set = new Set();
  [SCHEDULE_UMUM, SCHEDULE_PRODUKTIF].forEach(block=>{
    Object.values(block).forEach(day=> day.forEach(s=> set.add(s.subject)));
  });
  return Array.from(set).sort();
}
