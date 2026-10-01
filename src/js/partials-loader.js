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
    // Penanda untuk script yang telat dimuat (mis. main.js yang harus
    // mengunduh Firebase dulu) supaya tidak ketinggalan event di bawah.
    window.__partialsReady = true;
    document.dispatchEvent(new CustomEvent('partials:ready'));
  });
})();


/* ==========================================================================
   ACCORDION — buka/tutup sub menu.
   Header .acc__head diklik -> toggle .is-open di .acc terdekat.
   Klik pada tombol/input di dalam .acc__actions TIDAK ikut membuka/menutup.
   Badge jumlah: <span class="acc__count" data-count-for="idElemen"> diisi
   otomatis dan ikut update tiap isi list berubah.
   ========================================================================== */
(function () {
  const toggle = (acc) => acc.classList.toggle('is-open');
  const syncAria = (acc) => {
    const head = acc.querySelector(':scope > .acc__head');
    if (head) head.setAttribute('aria-expanded', acc.classList.contains('is-open'));
  };

  document.addEventListener('click', (e) => {
    const head = e.target.closest('.acc__head');
    if (!head || e.target.closest('.acc__actions')) return;
    const acc = head.parentElement;
    toggle(acc);
    syncAria(acc);
  });

  document.addEventListener('keydown', (e) => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.classList.contains('acc__head')) return;
    e.preventDefault();
    const acc = e.target.parentElement;
    toggle(acc);
    syncAria(acc);
  });

  const countItems = (el) =>
    Array.from(el.children).filter((c) => !/empty/.test(c.className)).length;

  const wireCounts = () => {
    document.querySelectorAll('.acc__count[data-count-for]').forEach((badge) => {
      const target = document.getElementById(badge.dataset.countFor);
      if (!target || badge.dataset.wired) return;
      badge.dataset.wired = '1';
      const update = () => { badge.textContent = countItems(target); };
      update();
      new MutationObserver(update).observe(target, { childList: true });
    });
    document.querySelectorAll('.acc__head').forEach((h) => {
      if (!h.hasAttribute('aria-expanded')) syncAria(h.parentElement);
    });
  };

  document.addEventListener('partials:ready', wireCounts);
})();
