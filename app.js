/* ============================================================
   Zheng Kaiyu · "A Soft Space"
   Interaction layer — no dependencies, works from file://
   ============================================================ */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. language ---------- */
  var SPEC_LABELS = {
    en: ['Only personal taste', 'Diderot, 18th century', 'Baudelaire & Zola, 19th century', 'Greenberg, 20th century', 'Institutional critique, 21st century'],
    zh: ['纯凭个人喜好', '狄德罗，18世纪', '波德莱尔与左拉，19世纪', '格林伯格，20世纪', '机构批判，21世纪']
  };

  var langButtons = $$('[data-setlang]');

  function setLang(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
    langButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setlang === lang));
    });
    try { localStorage.setItem('zky-lang', lang); } catch (e) { }
    paintSpectrumLabel();
  }

  langButtons.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.setlang); });
  });

  var saved = null;
  try { saved = localStorage.getItem('zky-lang'); } catch (e) { }

  /* default language comes from the page itself; ?lang=en|zh overrides everything */
  var pageDefault = document.documentElement.getAttribute('data-default-lang') || 'en';
  var forced = null;
  try { forced = new URLSearchParams(window.location.search).get('lang'); } catch (e) { }
  var initialLang = (forced === 'zh' || forced === 'en') ? forced : (saved || pageDefault);

  /* ---------- 2. scroll: progress, nav state, active section ---------- */
  var nav = $('#nav');
  var bar = $('#bar');
  var sections = ['artist', 'portfolio', 'learnings'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var navLinks = $$('.navlinks a');

  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? Math.min(100, (y / h) * 100) : 0) + '%';
    if (nav) nav.classList.toggle('solid', y > 40);

    var current = null;
    sections.forEach(function (s) {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.42) current = s.id;
    });
    navLinks.forEach(function (a) {
      a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + current));
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  /* ---------- 3. reveal on scroll ---------- */
  var revealables = $$('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    revealables.forEach(function (el) { io.observe(el); });

    /* safety net: if nothing revealed (e.g. observer never fires), show everything */
    window.setTimeout(function () {
      if (!document.querySelector('.reveal.in')) {
        revealables.forEach(function (el) { el.classList.add('in'); });
      }
    }, 900);
  }

  /* ---------- 4. portfolio filters ---------- */
  var works = $$('.work');
  $$('[data-filter]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var f = btn.dataset.filter;
      $$('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      works.forEach(function (w) {
        var show = f === 'all' || w.dataset.tag === f;
        w.classList.toggle('is-hidden', !show);
      });
    });
  });

  /* ---------- 5. lightbox ---------- */
  var lb = $('#lightbox');
  var lbImg = $('#lbImg');
  var lbTitle = $('#lbTitle');
  var lbCount = $('#lbCount');
  var lbList = [];
  var lbIndex = 0;
  var lastFocus = null;

  function collectShots() {
    lbList = $$('.shot[data-img]').filter(function (s) {
      return !s.closest('.work.is-hidden');
    });
  }

  function openLightbox(shot) {
    collectShots();
    lbIndex = Math.max(0, lbList.indexOf(shot));
    lastFocus = shot;
    lb.hidden = false;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    renderLightbox();
    $('#lbClose').focus();
  }

  function closeLightbox() {
    lb.classList.remove('open');
    lb.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  function renderLightbox() {
    var shot = lbList[lbIndex];
    if (!shot) return;
    var img = $('img', shot);
    var work = shot.closest('.work');
    lbImg.src = shot.dataset.img;
    lbImg.alt = img ? img.alt : '';
    lbTitle.textContent = work && work.dataset.title ? work.dataset.title : '';
    lbCount.textContent = (lbIndex + 1) + ' / ' + lbList.length;
    var many = lbList.length > 1;
    $('#lbPrev').style.display = many ? '' : 'none';
    $('#lbNext').style.display = many ? '' : 'none';
  }

  function step(dir) {
    if (!lbList.length) return;
    lbIndex = (lbIndex + dir + lbList.length) % lbList.length;
    renderLightbox();
  }

  $$('.shot[data-img]').forEach(function (shot) {
    shot.addEventListener('click', function () { openLightbox(shot); });
    shot.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        openLightbox(shot);
      }
    });
  });

  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', function () { step(-1); });
  $('#lbNext').addEventListener('click', function () { step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) closeLightbox(); });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLightbox(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  /* ---------- 6. age rail ---------- */
  var AGE_X = { 3: 16.5, 4: 35.4, 5: 57.6, 6: 80.5 };
  var ageButtons = $$('.age');
  var ageCaps = $$('.agecap > span');
  var guide = $('#ageGuide');

  function setAge(a) {
    ageButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.age === String(a))); });
    ageCaps.forEach(function (c) { c.classList.toggle('on', c.dataset.cap === String(a)); });
    if (guide) guide.style.left = (AGE_X[a] || 50) + '%';
  }
  ageButtons.forEach(function (b) {
    b.addEventListener('click', function () { setAge(b.dataset.age); });
  });

  /* ---------- 7. rhetoric pillars ---------- */
  var pillars = $$('.pillar');
  var pdets = $$('#pillarPanel [data-detail]');
  pillars.forEach(function (p) {
    p.addEventListener('click', function () {
      var key = p.dataset.pillar;
      pillars.forEach(function (o) { o.setAttribute('aria-pressed', String(o === p)); });
      pdets.forEach(function (d) { d.hidden = d.dataset.detail !== key; });
    });
  });

  /* ---------- 8. criticism spectrum ---------- */
  var spec = $('#spec');
  var specStops = $$('[data-i]');
  var sdetails = $$('.sdetail');
  var specLbl = $('#specLbl');

  function paintSpectrumLabel() {
    if (!specLbl) return;
    var i = spec ? Number(spec.value) : 2;
    var lang = document.documentElement.getAttribute('data-lang') === 'zh' ? 'zh' : 'en';
    var en = specLbl.querySelector('[lang="en"]');
    var zh = specLbl.querySelector('[lang="zh"]');
    if (en) en.textContent = SPEC_LABELS.en[i];
    if (zh) zh.textContent = SPEC_LABELS.zh[i];
  }

  function setSpec(i) {
    i = Math.max(0, Math.min(4, Number(i)));
    if (spec) spec.value = String(i);
    specStops.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i)); });
    sdetails.forEach(function (d) {
      if (d.classList.contains('sdetail')) d.hidden = Number(d.dataset.spec) !== i;
    });
    paintSpectrumLabel();
  }

  if (spec) {
    spec.addEventListener('input', function () { setSpec(spec.value); });
    spec.addEventListener('change', function () { setSpec(spec.value); });
  }
  specStops.forEach(function (b) {
    b.addEventListener('click', function () { setSpec(b.dataset.i); });
  });

  /* ---------- 9. before / after ---------- */
  $$('.fliprow').forEach(function (row) {
    row.addEventListener('click', function () {
      var on = row.classList.toggle('on');
      row.setAttribute('aria-pressed', String(on));
    });
  });

  /* ---------- 10. print ---------- */
  var printBtn = $('#printBtn');
  var reopened = [];
  if (printBtn) printBtn.addEventListener('click', function () { window.print(); });

  window.addEventListener('beforeprint', function () {
    reopened = [];
    $$('details.st').forEach(function (d) {
      if (!d.open) { d.open = true; reopened.push(d); }
    });
  });
  window.addEventListener('afterprint', function () {
    reopened.forEach(function (d) { d.open = false; });
    reopened = [];
  });

  /* ---------- 11. picture-book reader ---------- */
  var BOOKS = {
    b1: { n: 9, name: { en: 'Volume I', zh: '第一册' } },
    b2: { n: 9, name: { en: 'Volume II', zh: '第二册' } },
    b3: { n: 9, name: { en: 'Volume III', zh: '第三册' } },
    hb: { n: 6, name: { en: 'Parent handbook', zh: '家长手册' } }
  };

  var bkImg = $('#bkImg');
  var bkStage = $('#bookStage');
  var bkTurner = $('#bkTurner');
  var bkTurnerImg = $('#bkTurnerImg');
  var bkPrev = $('#bkPrev');
  var bkNext = $('#bkNext');
  var bkCount = $('#bkCount');
  var bkBar = $('#bkBar');
  var bkThumbs = $('#bkThumbs');
  var bkNow = $('#bkNow');
  var bookEl = $('#book');
  var bkBook = 'b1';
  var bkPage = 1;
  var bkBusy = false;
  var bkTimer = null;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* the single-file build injects window.__BOOK_IMGS so it needs no external files */
  function bkSrc(book, page) {
    var p = 'assets/book/' + book + '-' + pad2(page) + '.jpg';
    return (window.__BOOK_IMGS && window.__BOOK_IMGS[p]) || p;
  }
  function bkThumb(book, page) {
    var p = 'assets/book/th/' + book + '-' + pad2(page) + '.jpg';
    return (window.__BOOK_IMGS && window.__BOOK_IMGS[p]) || p;
  }

  function bkNowLabel() {
    if (!bkNow) return;
    var nm = BOOKS[bkBook].name;
    bkNow.innerHTML = '<span lang="en">' + nm.en + '</span><span lang="zh">' + nm.zh + '</span>';
  }

  function bkPaint() {
    var n = BOOKS[bkBook].n;
    if (bkCount) bkCount.textContent = bkPage + ' / ' + n;
    if (bkBar) bkBar.style.width = ((bkPage / n) * 100).toFixed(2) + '%';
    if (bkPrev) bkPrev.disabled = bkPage <= 1;
    if (bkNext) bkNext.disabled = bkPage >= n;
    if (bkImg) {
      var nm = BOOKS[bkBook].name;
      bkImg.alt = nm.zh + ' 第 ' + bkPage + ' 页';
    }
    if (bkThumbs) {
      Array.prototype.forEach.call(bkThumbs.children, function (b) {
        b.setAttribute('aria-pressed', String(Number(b.dataset.p) === bkPage));
      });
    }
    /* warm the neighbours */
    [bkPage - 1, bkPage + 1].forEach(function (p) {
      if (p >= 1 && p <= n) { var im = new Image(); im.src = bkSrc(bkBook, p); }
    });
  }

  function bkBuildThumbs() {
    if (!bkThumbs) return;
    bkThumbs.innerHTML = '';
    var n = BOOKS[bkBook].n;
    for (var i = 1; i <= n; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.p = String(i);
      b.setAttribute('aria-label', '第 ' + i + ' 页');
      b.style.backgroundImage = 'url("' + bkThumb(bkBook, i) + '")';
      b.addEventListener('click', (function (page) {
        return function () { bkGo(page, page < bkPage ? 'prev' : 'next'); };
      })(i));
      bkThumbs.appendChild(b);
    }
  }

  function bkStopTurn() {
    if (bkTurner) bkTurner.className = 'bk-turner';
    bkBusy = false;
  }

  function bkGo(page, dir) {
    if (!bkImg) return;
    var n = BOOKS[bkBook].n;
    if (page < 1 || page > n || page === bkPage || bkBusy) return;
    if (dir !== 'prev' && dir !== 'next') dir = page > bkPage ? 'next' : 'prev';

    var oldSrc = bkImg.getAttribute('src');
    var newSrc = bkSrc(bkBook, page);

    bkPage = page;
    bkBusy = true;
    bkImg.src = newSrc;
    bkPaint();

    if (reduce || !bkTurner) { bkBusy = false; return; }

    bkTurnerImg.src = dir === 'prev' ? newSrc : oldSrc;
    bkTurner.className = 'bk-turner';
    void bkTurner.offsetWidth;
    bkTurner.className = 'bk-turner on ' + dir;

    window.clearTimeout(bkTimer);
    bkTimer = window.setTimeout(bkStopTurn, 900);
  }

  if (bkTurner) bkTurner.addEventListener('animationend', bkStopTurn);

  if (bkPrev && bkNext) {
    bkPrev.addEventListener('click', function () { bkGo(bkPage - 1, 'prev'); });
    bkNext.addEventListener('click', function () { bkGo(bkPage + 1, 'next'); });
  }

  $$('.rtab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.book === bkBook) return;
      bkBook = t.dataset.book;
      bkPage = 1;
      bkBusy = false;
      $$('.rtab').forEach(function (o) { o.setAttribute('aria-pressed', String(o === t)); });
      bkImg.src = bkSrc(bkBook, 1);
      bkNowLabel();
      bkBuildThumbs();
      bkPaint();
    });
  });

  if (bookEl) {
    bookEl.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); bkGo(bkPage + 1, 'next'); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); bkGo(bkPage - 1, 'prev'); }
    });
  }

  if (bkStage) {
    var swipeX = null;
    bkStage.addEventListener('pointerdown', function (e) { swipeX = e.clientX; });
    bkStage.addEventListener('pointerup', function (e) {
      if (swipeX === null) return;
      var dx = e.clientX - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 40) {
        bkGo(bkPage + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
      }
    });
    bkStage.addEventListener('pointercancel', function () { swipeX = null; });
  }

  /* ---------- init ---------- */
  setLang(initialLang === 'zh' ? 'zh' : 'en');
  setSpec(spec ? spec.value : 2);
  setAge(3);
  bkNowLabel();
  bkBuildThumbs();
  bkPaint();
  onScroll();
})();
