/* ==========================================================================
   DATA: KALENDER AKADEMIK
   Data statis murni (tidak ada akses DOM / Firebase) — sumber: Kalender
   Pendidikan SMK Negeri 2 Klaten, Tahun Pelajaran 2025/2026.
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 4. KALENDER AKADEMIK (data contoh — sesuaikan kalender resmi sekolah)   */
/* ---------------------------------------------------------------------- */
export function expandRange(startISO, endISO, title, type){
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
export const CALENDAR_EVENTS = [
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

export const CAL_TYPE_LABEL = {
  'pts':'Penilaian Sumatif Tengah Semester', 'pas':'Penilaian Sumatif Akhir Semester/Jenjang/Tahun',
  'tka':'Tes Kemampuan Akademik (TKA)', 'an':'Asesmen Nasional (AN)', 'ukk':'Uji Kompetensi Keahlian',
  'libur-semester':'Libur Semester', 'libur-nasional':'Libur Umum / Nasional', 'sekolah':'Kegiatan Sekolah',
  'pribadi':'Acara Kelas / Pribadi'
};
