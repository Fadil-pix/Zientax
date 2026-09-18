/* ==========================================================================
   PARTIALS LOADER
   Mencari semua elemen [data-include="path/ke/file.html"], mengambil isinya
   lewat fetch(), lalu menyuntikkan HTML-nya ke elemen tsb.

   Setelah SEMUA partial selesai dimuat, script ini menembakkan custom
   event "partials:ready" di document. main.js menunggu event ini sebelum
   menjalankan init() aplikasi, supaya elemen (getElementById, dst) sudah
   pasti ada di DOM.

   CATATAN: fetch() ke file lokal butuh dijalankan lewat web server
   (http://...), tidak bisa dibuka langsung sebagai file:// karena
   browser akan memblokirnya (CORS pada protokol file).
   ========================================================================== */

(function () {
  const includeNodes = Array.from(document.querySelectorAll('[data-include]'));

  const loadOne = (node) => {
    const url = node.getAttribute('data-include');
    return fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`Gagal memuat partial: ${url} (${res.status})`);
        return res.text();
      })
      .then((html) => {
        node.innerHTML = html;
      })
      .catch((err) => {
        console.error(err);
        node.innerHTML = `<!-- gagal memuat ${url} -->`;
      });
  };

  Promise.all(includeNodes.map(loadOne)).then(() => {
    document.dispatchEvent(new CustomEvent('partials:ready'));
  });
})();
