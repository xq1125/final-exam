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
  var ageButtons = $$('.age');
  var ageCaps = $$('.agecap > span');
  var guide = $('#ageGuide');
  var curAge = 3;

  /* centre the dot under whichever number is active, whatever the width */
  function placeGuide(btn) {
    if (!guide) return;
    if (!btn) { guide.style.opacity = '0'; return; }
    var rail = btn.parentNode;
    var r = rail.getBoundingClientRect();
    var b = btn.getBoundingClientRect();
    if (!b.width || !r.width) return;
    guide.style.opacity = '1';
    guide.style.left = (b.left - r.left + b.width / 2) + 'px';
  }

  function setAge(a) {
    curAge = String(a);
    var active = null;
    ageButtons.forEach(function (b) {
      var on = b.dataset.age === String(a);
      b.setAttribute('aria-pressed', String(on));
      if (on) active = b;
    });
    ageCaps.forEach(function (c) { c.classList.toggle('on', c.dataset.cap === String(a)); });
    placeGuide(active);
  }
  ageButtons.forEach(function (b) {
    b.addEventListener('click', function () { setAge(b.dataset.age); });
  });
  window.addEventListener('resize', function () { placeGuide($('.age[aria-pressed="true"]')); });
  window.addEventListener('load', function () { placeGuide($('.age[aria-pressed="true"]')); });

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
  /* n = spreads you can read; off = which image file the first spread is;
     cover = the book starts shut, with image 1's left half as its cover */
  var BOOKS = {
    b1: { n: 8, ar: 3, prefix: 'b1', off: 2, cover: true, ends: true, name: { en: 'Volume I', zh: '第一册' } },
    b2: { n: 8, ar: 3, prefix: 'b2', off: 2, cover: true, ends: true, name: { en: 'Volume II', zh: '第二册' } },
    b3: { n: 8, ar: 3, prefix: 'b3', off: 2, cover: true, ends: true, name: { en: 'Volume III', zh: '第三册' } },
    hb: { n: 3, ar: 2.82, prefix: 'hbs', off: 1, cover: false, ends: false, name: { en: 'Parent handbook', zh: '家长手册' } }
  };

  var bkStage = $('#bookStage');
  var bkLeft = $('#bkLeftImg');
  var bkRight = $('#bkRightImg');
  var bkLeaf = $('#bkLeaf');
  var bkLeafImg = $('#bkLeafImg');
  var bkLeafBackImg = $('#bkLeafBackImg');
  var bkPrev = $('#bkPrev');
  var bkNext = $('#bkNext');
  var bkCount = $('#bkCount');
  var bkBar = $('#bkBar');
  var bkThumbs = $('#bkThumbs');
  var bkNow = $('#bkNow');
  var bookEl = $('#book');
  var bkBook = 'b1';
  var bkPage = 1;
  var bkClosed = true;
  var bkEnded = false;
  var bkBusy = false;
  var bkPending = null;
  var bkTimer = null;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function bkFile(book, img) {
    var p = 'assets/book/' + BOOKS[book].prefix + '-' + pad2(img) + '.jpg';
    return (window.__BOOK_IMGS && window.__BOOK_IMGS[p]) || p;
  }
  /* spread 1 is the first readable spread, not necessarily image 1 */
  function bkSrc(book, page) { return bkFile(book, page - 1 + BOOKS[book].off); }
  /* image 1 holds the whole jacket: its left half is the front cover */
  function bkCover(book) { return bkFile(book, 1); }
  function bkThumb(book, page) {
    var p = 'assets/book/th/' + BOOKS[book].prefix + '-' + pad2(page - 1 + BOOKS[book].off) + '.jpg';
    return (window.__BOOK_IMGS && window.__BOOK_IMGS[p]) || p;
  }

  function bkNowLabel() {
    if (!bkNow) return;
    var nm = BOOKS[bkBook].name;
    bkNow.innerHTML = '<span lang="en">' + nm.en + '</span><span lang="zh">' + nm.zh + '</span>';
  }

  /* counter, progress, arrows, thumbs, neighbour preload */
  function bkMeta() {
    var b = BOOKS[bkBook];
    var shut = bkClosed && b.cover;
    var ended = bkEnded && b.ends;
    if (bkCount) {
      if (shut) bkCount.innerHTML = '<span lang="en">Cover</span><span lang="zh">封面</span>';
      else if (ended) bkCount.innerHTML = '<span lang="en">Back cover</span><span lang="zh">封底</span>';
      else bkCount.textContent = bkPage + ' / ' + b.n;
    }
    if (bkBar) bkBar.style.width = (shut ? 0 : ended ? 100 : (bkPage / b.n) * 100).toFixed(2) + '%';
    if (bkPrev) bkPrev.disabled = shut;
    if (bkNext) bkNext.disabled = ended || (!shut && !b.ends && bkPage >= b.n);
    if (bookEl) bookEl.classList.toggle('is-closed', shut);
    if (bkThumbs) {
      Array.prototype.forEach.call(bkThumbs.children, function (el) {
        el.setAttribute('aria-pressed', String(!shut && Number(el.dataset.p) === bkPage));
      });
    }
    [bkPage - 1, bkPage + 1].forEach(function (p) {
      if (p >= 1 && p <= b.n) { var im = new Image(); im.src = bkSrc(bkBook, p); }
    });
  }

  /* show a spread on both halves, the shut book, or the shut book seen from the back */
  function bkPaint() {
    var b = BOOKS[bkBook];
    var shut = bkClosed && b.cover;
    var ended = bkEnded && b.ends;
    var src = bkSrc(bkBook, bkPage);
    if (bkStage) {
      bkStage.style.setProperty('--ar', b.ar);
      bkStage.classList.toggle('closed', shut);
      bkStage.classList.toggle('ended', ended);
      bkStage.classList.remove('bk-lhid');
    }
    if (bkLeft) { bkLeft.src = src; bkLeft.alt = b.name.zh + '，左页'; }
    if (bkRight) {
      bkRight.src = (shut || ended) ? bkCover(bkBook) : src;
      bkRight.alt = b.name.zh + (shut ? '，封面' : ended ? '，封底' : '，右页');
    }
    if (bkLeaf) bkLeaf.className = 'bk-leaf';
    bkMeta();
  }

  function bkBuildThumbs() {
    if (!bkThumbs) return;
    bkThumbs.innerHTML = '';
    var n = BOOKS[bkBook].n;
    for (var i = 1; i <= n; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.p = String(i);
      b.setAttribute('aria-label', '第 ' + i + ' 跨页');
      b.style.backgroundImage = 'url("' + bkThumb(bkBook, i) + '")';
      b.addEventListener('click', (function (page) {
        return function () { bkGo(page, page < bkPage ? 'prev' : 'next'); };
      })(i));
      bkThumbs.appendChild(b);
    }
  }

  /* settle whichever turn is running — always repaint from state, so the
     halves, the classes and the counter can never disagree */
  function bkFinish() {
    window.clearTimeout(bkTimer);
    var mode = bkPending;
    bkPending = null;
    bkBusy = false;
    if (mode === 'close') bkClosed = true;
    else if (mode) bkClosed = false;
    bkPaint();
  }

  function bkSwing(mode) {
    bkBusy = true;
    bkPending = mode;
    if (!bkLeaf) { bkFinish(); return; }
    bkLeaf.className = 'bk-leaf';
    var started = false;
    function start() {
      if (started) return;
      started = true;
      void bkLeaf.offsetWidth;
      bkLeaf.className = 'bk-leaf on ' + (mode === 'close' ? 'bwd' : 'fwd') + (mode === 'turn' ? '' : ' from-cover');
      window.clearTimeout(bkTimer);
      bkTimer = window.setTimeout(bkFinish, 950);
    }
    /* decode both faces first — otherwise the back of the leaf shows blank for a frame */
    var jobs = [];
    [bkLeafImg, bkLeafBackImg].forEach(function (im) {
      if (im && im.decode) jobs.push(im.decode().catch(function () {}));
    });
    window.clearTimeout(bkTimer);
    bkTimer = window.setTimeout(start, 150);
    if (jobs.length) {
      Promise.all(jobs).then(function () { window.requestAnimationFrame(start); });
    } else {
      window.requestAnimationFrame(start);
    }
  }

  /* after the last spread: the book closes and you see its back cover */
  function bkEnd() {
    var b = BOOKS[bkBook];
    if (!b.ends || bkEnded || bkBusy) return;
    bkEnded = true;
    if (bkStage) bkStage.classList.add('fading');
    window.setTimeout(function () {
      bkPaint();
      if (bkStage) bkStage.classList.remove('fading');
    }, 180);
  }

  /* shut book -> first spread: the cover swings across, showing the next page on its back */
  function bkOpen() {
    var b = BOOKS[bkBook];
    if (!b.cover || !bkClosed || bkBusy) return;
    var first = bkSrc(bkBook, 1);
    if (reduce || !bkLeaf) { bkClosed = false; bkPage = 1; bkPaint(); return; }
    bkPage = 1;
    if (bkStage) { bkStage.classList.remove('closed'); bkStage.classList.add('bk-lhid'); }
    if (bkLeafImg) bkLeafImg.src = bkCover(bkBook);
    if (bkLeafBackImg) bkLeafBackImg.src = first;
    if (bkRight) bkRight.src = first;
    if (bkLeft) bkLeft.src = first;
    bkSwing('open');
  }

  function bkClose() {
    var b = BOOKS[bkBook];
    if (!b.cover || bkClosed || bkBusy) return;
    if (reduce || !bkLeaf) { bkClosed = true; bkPaint(); return; }
    if (bkStage) bkStage.classList.add('bk-lhid');
    if (bkLeafImg) bkLeafImg.src = bkCover(bkBook);
    if (bkLeafBackImg) bkLeafBackImg.src = bkSrc(bkBook, bkPage);
    bkSwing('close');
  }

  function bkGo(page, dir) {
    if (!bkLeft || !bkRight) return;
    var b = BOOKS[bkBook];
    if (bkEnded) { bkEnded = false; bkPaint(); return; }
    if (bkClosed && b.cover) { if (dir !== 'prev') bkOpen(); return; }
    if (dir !== 'prev' && dir !== 'next') dir = page > bkPage ? 'next' : 'prev';
    if (dir === 'next' && page > b.n) { if (b.ends) bkEnd(); return; }
    if (page < 1 || page > b.n || page === bkPage || bkBusy) return;
    if (dir === 'prev' && page === 1 && b.cover) { bkClose(); return; }

    var curSrc = bkSrc(bkBook, bkPage);
    var newSrc = bkSrc(bkBook, page);
    bkPage = page;
    if (bkStage) bkStage.style.setProperty('--ar', b.ar);

    if (reduce || !bkLeaf) {
      bkLeft.src = newSrc;
      bkRight.src = newSrc;
      bkBusy = false;
      bkMeta();
      return;
    }

    /* front = the page that moves, back = the page that lands underneath */
    if (bkLeafImg) bkLeafImg.src = dir === 'next' ? curSrc : newSrc;
    if (bkLeafBackImg) bkLeafBackImg.src = dir === 'next' ? newSrc : curSrc;
    bkMeta();
    bkSwing('turn');
  }

  if (bkLeaf) bkLeaf.addEventListener('animationend', bkFinish);

  if (bkStage) bkStage.addEventListener('click', function () {
    if (bkClosed && BOOKS[bkBook].cover) bkOpen();
  });

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
      bkPending = null;
      bkEnded = false;
      bkClosed = !!BOOKS[bkBook].cover;
      $$('.rtab').forEach(function (o) { o.setAttribute('aria-pressed', String(o === t)); });
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

  /* ---------- 12. document reader (statement, essays, cv) ---------- */
  var docModal = $('#docModal');
  var docBody = $('#docBody');
  var docTitle = $('#docTitle');
  var docKicker = $('#docKicker');
  var docMeta = $('#docMeta');
  var docStore = $('.docstore');
  var docLastFocus = null;

  function docSpan(el, en, zh, tag) {
    el.innerHTML = '';
    var a = document.createElement(tag || 'span');
    a.setAttribute('lang', 'en');
    a.textContent = en || '';
    var b = document.createElement(tag || 'span');
    b.setAttribute('lang', 'zh');
    b.textContent = zh || '';
    el.appendChild(a);
    el.appendChild(b);
  }

  function openDoc(id, trigger) {
    if (!docStore || !docModal) return;
    var art = docStore.querySelector('[data-doc="' + id + '"]');
    if (!art) return;
    docLastFocus = trigger || document.activeElement;
    docBody.innerHTML = art.innerHTML;
    docBody.scrollTop = 0;
    docSpan(docKicker, 'Document', '文档');
    docSpan(docTitle, art.dataset.tEn, art.dataset.tZh);
    docSpan(docMeta, art.dataset.mEn, art.dataset.mZh);
    docModal.hidden = false;
    docModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    $('#docClose').focus();
  }

  function closeDoc() {
    if (!docModal) return;
    docModal.classList.remove('open');
    docModal.hidden = true;
    document.body.style.overflow = '';
    if (docLastFocus && docLastFocus.focus) docLastFocus.focus();
  }

  $$('[data-doc]').forEach(function (b) {
    b.addEventListener('click', function () { openDoc(b.dataset.doc, b); });
  });

  if (docModal) {
    docModal.addEventListener('click', function (e) {
      if (e.target.classList.contains('docmodal-backdrop') || e.target.id === 'docClose') closeDoc();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !docModal.hidden) { e.preventDefault(); closeDoc(); }
    });
  }

  /* ---------- 13. cv reader ---------- */
  var cvModal = $('#cvModal');
  var cvOpenBtn = $('#cvOpen');
  var cvLastFocus = null;

  function openCv() {
    if (!cvModal) return;
    cvLastFocus = document.activeElement;
    cvModal.hidden = false;
    cvModal.classList.add('open');
    document.body.style.overflow = 'hidden';
    var c = $('#cvClose');
    if (c) c.focus();
  }
  function closeCv() {
    if (!cvModal) return;
    cvModal.classList.remove('open');
    cvModal.hidden = true;
    document.body.style.overflow = '';
    if (cvLastFocus && cvLastFocus.focus) cvLastFocus.focus();
  }
  if (cvOpenBtn) cvOpenBtn.addEventListener('click', openCv);
  if (cvModal) {
    cvModal.addEventListener('click', function (e) {
      if (e.target.classList.contains('cvmodal-backdrop') || e.target.id === 'cvClose') closeCv();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !cvModal.hidden) { e.preventDefault(); closeCv(); }
    });
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
