/* =====================================================================
   GITA GANGSA — KATALOG DIGITAL (fungsi interaktif)
   Tiada perkara perlu diubah di sini untuk kemaskini kandungan.
   Maklumat hubungan: js/config.js
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.GG_CONFIG || {};
  var $ = function (s, root) { return (root || document).querySelector(s); };
  var $$ = function (s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); };

  /* ---------- Utiliti ---------- */
  var waNumber = String(cfg.whatsapp || "").replace(/[^\d]/g, "");
  var hasWa = /^\d{9,15}$/.test(waNumber) && String(cfg.whatsapp).indexOf("X") === -1;
  var hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cfg.email || "");

  function waLink(message) {
    return "https://wa.me/" + waNumber + (message ? "?text=" + encodeURIComponent(message) : "");
  }
  function prettyUrl(u) { return String(u).replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""); }
  function waDisplay() {
    if (cfg.whatsappDisplay) return cfg.whatsappDisplay;
    return "+" + waNumber.slice(0, 2) + " " + waNumber.slice(2);
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4800);
  }

  /* ---------- 0. Baris hubungan untuk versi cetak (ganti butang) ---------- */
  $$(".perf__cta, .pkg-cta, .checklist").forEach(function (box) {
    var p = document.createElement("p");
    p.className = "print-only cta-print";
    p.innerHTML = '<svg><use href="#i-wa"/></svg><span>Pertanyaan &amp; Sebut Harga</span> <span data-contact="whatsapp"></span>';
    box.appendChild(p);
  });

  /* ---------- 1. Maklumat hubungan daripada config.js ---------- */
  var labels = {
    whatsapp: "Nombor WhatsApp", email: "E-mel rasmi", instagram: "Instagram",
    facebook: "Facebook", tiktok: "TikTok", website: "Website rasmi"
  };

  function contactHTML(key) {
    var v = cfg[key];
    if (key === "whatsapp") {
      return hasWa ? '<a href="' + waLink(cfg.whatsappGreeting) + '" target="_blank" rel="noopener">' + waDisplay() + "</a>" : null;
    }
    if (key === "email") {
      return hasEmail ? '<a href="mailto:' + v + '">' + v + "</a>" : null;
    }
    if (v && /^https?:\/\//.test(v)) {
      return '<a href="' + v + '" target="_blank" rel="noopener">' + prettyUrl(v) + "</a>";
    }
    return null;
  }

  $$("[data-contact]").forEach(function (el) {
    var key = el.getAttribute("data-contact");
    var html = contactHTML(key);
    el.innerHTML = html || '<span class="placeholder-val">[ ' + (labels[key] || key) + " ]</span>";
  });
  $$("[data-cfg]").forEach(function (el) {
    var v = cfg[el.getAttribute("data-cfg")];
    if (v) el.textContent = v;
  });

  /* ---------- 2. Butang WhatsApp ---------- */
  $$("[data-wa]").forEach(function (a) {
    if (hasWa) {
      a.href = waLink(cfg.whatsappGreeting);
      a.target = "_blank";
      a.rel = "noopener";
    } else {
      a.href = "#hubungi";
      a.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Nombor WhatsApp belum ditetapkan. Kemaskini nilai \"whatsapp\" dalam js/config.js.");
      });
    }
  });

  /* ---------- 3. Ruang gambar (placeholder automatik) ---------- */
  function markEmpty(img) {
    var ph = img.closest(".ph");
    if (!ph || ph.classList.contains("is-empty")) return;
    ph.classList.add("is-empty");
    var icon = ph.getAttribute("data-icon") || "star";
    var file = img.getAttribute("src") || "";
    var info = document.createElement("div");
    info.className = "ph__info";
    info.setAttribute("aria-hidden", "true");
    info.innerHTML =
      '<svg><use href="#i-' + icon + '"/></svg>' +
      '<span class="ph__label">Ruang Gambar</span>' +
      '<span class="ph__desc">' + (img.getAttribute("alt") || "") + "</span>" +
      '<span class="ph__file">' + file + "</span>";
    ph.appendChild(info);
  }
  $$(".ph img").forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markEmpty(img);
    img.addEventListener("error", function () { markEmpty(img); });
    img.addEventListener("load", function () {
      var ph = img.closest(".ph");
      if (ph && img.naturalWidth > 0) {
        ph.classList.remove("is-empty");
        var i = ph.querySelector(".ph__info"); if (i) i.remove();
      }
    });
  });

  /* ---------- 4. Kandungan & penunjuk halaman ---------- */
  var pages = $$(".page[data-nav]");
  var list = $("#contents-list");
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };

  pages.forEach(function (p, i) {
    var li = document.createElement("li");
    li.innerHTML = '<a href="#' + p.id + '"><span>' + pad(i + 1) + "</span>" + p.getAttribute("data-nav") + "</a>";
    list.appendChild(li);
  });

  var contents = $("#contents");
  var menuBtn = $('[data-action="menu"]');
  function openMenu() {
    contents.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    var cur = $('a[aria-current="true"]', contents) || $("a", contents);
    if (cur) cur.focus({ preventScroll: true });
  }
  function closeMenu() {
    contents.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }
  menuBtn.addEventListener("click", function () { contents.hidden ? openMenu() : closeMenu(); });
  $('[data-action="menu-close"]').addEventListener("click", closeMenu);
  contents.addEventListener("click", function (e) {
    if (e.target.closest("a, button[data-quote], button[data-action='print']")) closeMenu();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !contents.hidden) closeMenu();
  });

  var nowNo = $(".topbar__now-no"), nowTitle = $(".topbar__now-title");
  if ("IntersectionObserver" in window) {
    var pageIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var idx = pages.indexOf(en.target);
        nowNo.textContent = pad(idx + 1);
        nowTitle.textContent = en.target.getAttribute("data-nav").replace(/&amp;/g, "&");
        $$("a", list).forEach(function (a, i) { a.setAttribute("aria-current", i === idx ? "true" : "false"); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    pages.forEach(function (p) { pageIO.observe(p); });
  }

  var bar = $("#progress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 5. Animasi muncul ---------- */
  var reveals = $$(".rv");
  function revealAll() { reveals.forEach(function (el) { el.classList.add("is-in"); }); }
  if ("IntersectionObserver" in window && document.documentElement.classList.contains("js-anim")) {
    var rvIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); rvIO.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (el) { rvIO.observe(el); });
  } else {
    revealAll();
  }

  /* ---------- 6. Cetak / Simpan PDF ---------- */
  function preparePrint() {
    revealAll();
    closeMenu();
    $$("dialog[open]").forEach(function (d) { d.close(); });
  }
  window.addEventListener("beforeprint", preparePrint);
  $$('[data-action="print"]').forEach(function (b) {
    b.addEventListener("click", function () {
      preparePrint();
      setTimeout(function () { window.print(); }, 150);
    });
  });

  /* ---------- 7. Borang sebut harga ---------- */
  var quote = $("#quote"), form = $("#quote-form"), err = $("#quote-error");

  function openQuote(preselect) {
    $$('input[name="persembahan"]', form).forEach(function (c) {
      if (preselect) c.checked = c.value === preselect;
    });
    err.hidden = true;
    $$(".field.is-invalid", form).forEach(function (f) { f.classList.remove("is-invalid"); });
    if (typeof quote.showModal === "function") quote.showModal(); else quote.setAttribute("open", "");
    setTimeout(function () { form.elements.nama.focus(); }, 60);
  }
  function closeQuote() { if (quote.open) quote.close(); }

  $$("[data-quote]").forEach(function (b) {
    b.addEventListener("click", function () { openQuote(b.getAttribute("data-quote")); });
  });
  $('[data-action="quote-close"]').addEventListener("click", closeQuote);
  quote.addEventListener("click", function (e) { if (e.target === quote) closeQuote(); });

  function formatDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || "");
    return m ? m[3] + "/" + m[2] + "/" + m[1] : v;
  }
  function buildMessage() {
    var f = form.elements;
    var picks = $$('input[name="persembahan"]:checked', form).map(function (c) { return c.value; });
    var lines = [
      "Assalamualaikum / Salam sejahtera Gita Gangsa,",
      "Saya ingin memohon cadangan pakej dan sebut harga persembahan.",
      "",
      "Nama: " + f.nama.value.trim()
    ];
    if (f.organisasi.value.trim()) lines.push("Organisasi: " + f.organisasi.value.trim());
    lines.push("Jenis Majlis: " + f.majlis.value);
    if (f.tarikh.value) lines.push("Tarikh Majlis: " + formatDate(f.tarikh.value));
    if (f.lokasi.value.trim()) lines.push("Lokasi: " + f.lokasi.value.trim());
    lines.push("Persembahan Diminati: " + (picks.length ? picks.join(", ") : "Mohon cadangan"));
    lines.push("Pilihan Pakej: " + (f.pakej.value || "Belum pasti"));
    if (f.tempoh.value.trim()) lines.push("Anggaran Tempoh: " + f.tempoh.value.trim());
    if (f.catatan.value.trim()) lines.push("Catatan: " + f.catatan.value.trim());
    lines.push("", "Terima kasih.");
    return lines.join("\n");
  }
  function validate() {
    var ok = true;
    ["nama", "majlis"].forEach(function (n) {
      var el = form.elements[n], field = el.closest(".field");
      var bad = !el.value.trim();
      field.classList.toggle("is-invalid", bad);
      if (bad) ok = false;
    });
    err.hidden = ok;
    return ok;
  }
  $$("[data-send]", form).forEach(function (b) {
    b.addEventListener("click", function () {
      if (!validate()) return;
      var msg = buildMessage();
      if (b.getAttribute("data-send") === "wa") {
        if (!hasWa) { toast("Nombor WhatsApp belum ditetapkan. Kemaskini nilai \"whatsapp\" dalam js/config.js."); return; }
        window.open(waLink(msg), "_blank", "noopener");
      } else {
        if (!hasEmail) { toast("E-mel rasmi belum ditetapkan. Kemaskini nilai \"email\" dalam js/config.js."); return; }
        window.location.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent(cfg.emailSubject || "Sebut Harga") + "&body=" + encodeURIComponent(msg);
      }
      closeQuote();
    });
  });

  /* ---------- 8. Media sosial ---------- */
  $$('[data-action="social"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var target = $("#media-sosial");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.remove("is-flash"); void target.offsetWidth; target.classList.add("is-flash");
    });
  });

  /* ---------- 9. Lightbox galeri ---------- */
  var lb = $("#lightbox"), stage = $("#lb-stage"), lbCap = $("#lb-cap");
  var zooms = $$(".zoom");
  var cur = 0;

  function captionFor(el) {
    var cap = el.querySelector(".cap");
    if (cap) {
      return $$(".cap__type, .cap__event", cap).map(function (n) { return n.textContent.trim(); }).join(" — ");
    }
    var fc = el.querySelector("figcaption");
    var img = el.querySelector("img");
    return (fc && fc.textContent.trim()) || (img && img.alt) || "";
  }
  function show(i) {
    cur = (i + zooms.length) % zooms.length;
    var el = zooms[cur];
    var ph = el.classList.contains("ph") ? el : el.querySelector(".ph");
    var img = ph && ph.querySelector("img");
    stage.innerHTML = "";
    if (ph && !ph.classList.contains("is-empty") && img) {
      var big = new Image();
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      stage.appendChild(big);
    } else if (ph) {
      var clone = ph.cloneNode(true);
      clone.classList.remove("zoom");
      var fc = clone.querySelector("figcaption"); if (fc) fc.remove();
      stage.appendChild(clone);
    }
    lbCap.textContent = captionFor(el);
  }
  zooms.forEach(function (el, i) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Besarkan gambar: " + captionFor(el));
    function open() { show(i); if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", ""); }
    el.addEventListener("click", open);
    el.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  $('[data-action="lb-close"]').addEventListener("click", function () { lb.close(); });
  $('[data-action="lb-prev"]').addEventListener("click", function () { show(cur - 1); });
  $('[data-action="lb-next"]').addEventListener("click", function () { show(cur + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target === stage) lb.close(); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") show(cur - 1);
    if (e.key === "ArrowRight") show(cur + 1);
  });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1));
    tx = null;
  });
})();
