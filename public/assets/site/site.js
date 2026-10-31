/* NIT Rourkela homepage: interaction and motion layer.
   Content is complete in the HTML; everything here enhances it.
   (Achievements: achievements.js. Chatbot: chat.js. Opening sequence: intro.js.) */
(function () {
  'use strict';

  var doc = document;
  var $ = function (sel, ctx) { return (ctx || doc).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var staticMode = /[?&]static\b/.test(location.search);
  var animate = !reduced && !staticMode && typeof window.gsap !== 'undefined';
  if (animate && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  var inr = new Intl.NumberFormat('en-IN');
  function fmt(n, decimals) { return decimals ? Number(n).toFixed(decimals) : inr.format(Math.round(n)); }

  /* Run a callback once an element first scrolls into view. */
  function onEnter(el, cb, margin) {
    if (!el) return;
    if (!('IntersectionObserver' in window) || staticMode) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { rootMargin: margin || '0px 0px -12% 0px' });
    io.observe(el);
  }

  /* ---------------------------------------------------------------
     Navigation
     --------------------------------------------------------------- */
  var nav = $('#navigation1');
  var masthead = $('.masthead');
  if (nav && masthead && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      nav.classList.toggle('is-stuck', !entries[0].isIntersecting);
      paintNav();
    }).observe(masthead);
  }

  var navItems = $$('.nav-menu > li.has-mega, .nav-menu > li.has-drop');
  function closeAll(except) {
    navItems.forEach(function (li) {
      if (li === except) return;
      li.classList.remove('is-open');
      var b = $('.nav-top', li);
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  }
  navItems.forEach(function (li) {
    var btn = $('.nav-top', li);
    btn.addEventListener('click', function () {
      var open = !li.classList.contains('is-open');
      closeAll(li);
      li.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    li.addEventListener('mouseleave', function () {
      if (window.innerWidth > 1100) { li.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  });
  doc.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-menu')) closeAll();
    if (!e.target.closest('.lang')) toggleLang(false);
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = $('.nav-menu > li.is-open');
    closeAll();
    if (open) $('.nav-top', open).focus();
    if (doc.body.classList.contains('nav-open')) toggleMobileNav(false);
    if (langBtn && langBtn.getAttribute('aria-expanded') === 'true') { toggleLang(false); langBtn.focus(); }
  });

  var navToggle = $('.nav-toggle');
  function toggleMobileNav(force) {
    var open = typeof force === 'boolean' ? force : !doc.body.classList.contains('nav-open');
    if (open) nav.style.setProperty('--nav-top', nav.getBoundingClientRect().bottom + 'px');
    doc.body.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
    $('.nav-toggle-text', navToggle).textContent = open ? 'Close' : 'Menu';
  }
  if (navToggle) navToggle.addEventListener('click', function () { toggleMobileNav(); });

  /* The sticky bar takes the colour of the chapter passing beneath it. */
  var CHAPTER = {
    dark: ['#150202', '#fff'], terra: ['#a72626', '#fff'], white: ['#fff', '#150202'], paper: ['#ebeaea', '#150202'],
    gold: ['#fcdada', '#150202'], teal: ['#150202', '#fff'], plum: ['#150202', '#fff'], cinnamon: ['#771d1d', '#fff']
  };
  var chapters = $$('[data-chapter]');
  var lastChapter = null;
  function paintNav() {
    if (!nav) return;
    var probe = nav.getBoundingClientRect().bottom + 1;
    var current = null;
    if (nav.classList.contains('is-stuck')) {
      for (var i = 0; i < chapters.length; i++) {
        var r = chapters[i].getBoundingClientRect();
        if (r.top <= probe && r.bottom > probe) { current = chapters[i].getAttribute('data-chapter'); break; }
      }
    }
    if (current === lastChapter) return;
    lastChapter = current;
    if (current && CHAPTER[current]) {
      var light = CHAPTER[current][1] !== '#fff';
      nav.style.setProperty('--nav-bg', CHAPTER[current][0]);
      nav.style.setProperty('--nav-fg', CHAPTER[current][1]);
      nav.style.setProperty('--accent', light ? '#a72626' : '#faaaaa');
      nav.style.setProperty('--focus', light ? '#a72626' : '#fff');
    } else {
      ['--nav-bg', '--nav-fg', '--accent', '--focus'].forEach(function (p) { nav.style.removeProperty(p); });
    }
  }

  /* ---------------------------------------------------------------
     The seal's gear, turning with the scroll (About, Director)
     --------------------------------------------------------------- */
  var gears = $$('[data-spin]');
  function spinGears() {
    if (!animate) return;
    var vh = window.innerHeight;
    gears.forEach(function (g, i) {
      var r = g.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var p = (vh - r.top) / (vh + r.height); // 0 entering at the bottom, 1 leaving at the top
      var dir = i % 2 ? -1 : 1;
      g.style.transform = 'rotate(' + (dir * (p - .5) * 90).toFixed(2) + 'deg)';
    });
  }

  /* ---------------------------------------------------------------
     Scroll-driven updates (progress bar, nav colour, gears)
     --------------------------------------------------------------- */
  var bar = $('.scroll-progress span');
  var ticking = false;
  function onScroll() {
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
    paintNav();
    spinGears();
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------------------------------------------------------
     Language selection (अ | A), backed by Google Translate
     --------------------------------------------------------------- */
  var langBtn = $('.lang-btn'), langMenu = $('#langMenu');
  function toggleLang(force) {
    if (!langBtn) return;
    var open = typeof force === 'boolean' ? force : langBtn.getAttribute('aria-expanded') !== 'true';
    langBtn.setAttribute('aria-expanded', String(open));
    langMenu.hidden = !open;
    if (open) { var first = $('button', langMenu); if (first) first.focus(); }
  }
  if (langBtn) {
    langBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleLang(); });
    var current = (doc.cookie.match(/googtrans=\/en\/(\w+)/) || [])[1] || 'en';
    $$('[data-lang]', langMenu).forEach(function (b) {
      if (b.dataset.lang === current) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', function () {
        var code = b.dataset.lang;
        // Choosing Hindi or Odia, under the note in this menu, is consent to the Google Translate cookie
        if (code !== 'en') saveConsent(true, true);
        var combo = $('.goog-te-combo');
        if (combo) {
          combo.value = code === 'en' ? '' : code;
          combo.dispatchEvent(new Event('change'));
          if (code === 'en') { doc.cookie = 'googtrans=/en/en;path=/'; location.reload(); }
        } else {
          doc.cookie = 'googtrans=/en/' + code + ';path=/';
          location.reload();
        }
        $$('[data-lang]', langMenu).forEach(function (x) { x.toggleAttribute('aria-current', x === b); });
        toggleLang(false);
      });
    });
  }

  /* ---------------------------------------------------------------
     Cookie consent (DBIM v3.0 7.6, DPDP Act 2023). Essential storage
     is always on; Google Translate (functional) loads only with consent.
     --------------------------------------------------------------- */
  var CONSENT_KEY = 'nitrkl-consent';
  var consentEl = $('#consent'), consentPrefs = $('#consentPrefs');
  var translateLoaded = false;
  function readConsent() { try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch (e) { return null; } }
  function loadTranslate() {
    if (translateLoaded) return;
    translateLoaded = true;
    var s = doc.createElement('script');
    s.async = true;
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    doc.body.appendChild(s);
  }
  function clearTranslate() {
    ['', ';domain=' + location.hostname, ';domain=.' + location.hostname].forEach(function (d) {
      doc.cookie = 'googtrans=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/' + d;
    });
  }
  function showConsent(open, withPrefs) {
    if (!consentEl) return;
    consentEl.hidden = !open;
    doc.body.classList.toggle('has-consent', open);
    if (!open) return;
    measureConsent();
    var c = readConsent();
    if (consentPrefs) consentPrefs.elements.functional.checked = !!(c && c.functional);
    togglePrefs(!!withPrefs);
  }
  function measureConsent() {
    doc.documentElement.style.setProperty('--consent-h', consentEl.offsetHeight + 'px');
  }
  function togglePrefs(open) {
    if (!consentPrefs) return;
    consentPrefs.hidden = !open;
    measureConsent();
    var btn = $('[data-consent="customise"]', consentEl);
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }
  function saveConsent(functional, keepOpen) {
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ functional: functional, date: new Date().toISOString().slice(0, 10) })); } catch (e) {}
    if (functional) loadTranslate(); else clearTranslate();
    if (!keepOpen) showConsent(false);
  }
  if (consentEl) {
    var given = readConsent();
    if (!given) showConsent(true);
    else if (given.functional) loadTranslate();
    else clearTranslate();
    consentEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-consent]');
      if (!b) return;
      var act = b.getAttribute('data-consent');
      if (act === 'accept') saveConsent(true);
      else if (act === 'reject') saveConsent(false);
      else togglePrefs(consentPrefs.hidden);
    });
    consentPrefs.addEventListener('submit', function (e) {
      e.preventDefault();
      saveConsent(consentPrefs.elements.functional.checked);
    });
    window.addEventListener('resize', function () { if (!consentEl.hidden) measureConsent(); });
    $$('[data-consent-open]').forEach(function (b) {
      b.addEventListener('click', function () { showConsent(true, true); $('h2', consentEl).setAttribute('tabindex', '-1'); $('h2', consentEl).focus(); });
    });
  }

  /* Accessibility controls in the header (DBIM 5.4) open the same panel as the floating button. */
  var accBtn = $('.uc-acc');
  if (accBtn) {
    accBtn.addEventListener('click', function () {
      var t = $('.nitrkl-acc-trigger');
      if (t) t.click();
    });
    var card = $('#nitrkl-accessibility-card');
    if (card && 'MutationObserver' in window) {
      new MutationObserver(function () { accBtn.setAttribute('aria-expanded', String(card.classList.contains('open'))); })
        .observe(card, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------------------------------------------------------------
     Hero: the campus film and the banners. Each banner sits in one
     .hero-media layer, and only that layer moves. Pauses on hover and focus;
     no autoplay with reduced motion.
     --------------------------------------------------------------- */
  (function hero() {
    var stage = $('#heroStage');
    if (!stage) return;
    var root = stage.closest('.hero');
    var slides = $$('.hero-slide', stage);
    var thumbs = $$('#heroThumbs button');
    var pauseBtn = $('[data-hero="pause"]');
    var cap = { count: $('.hero-count'), title: $('.hero-title'), kind: $('.hero-kind') };
    var current = 0, timer = null, busy = false, progTween = null;
    var paused = reduced || staticMode, held = false, started = false;

    function setPauseUI() {
      if (!pauseBtn) return;
      pauseBtn.setAttribute('aria-pressed', String(paused));
      pauseBtn.setAttribute('aria-label', paused ? 'Play slideshow' : 'Pause slideshow');
      $('use', pauseBtn).setAttribute('href', paused ? '#i-play-arrow' : '#i-pause');
    }
    function caption(i) {
      var s = slides[i];
      if (cap.count) cap.count.textContent = (i + 1) + ' / ' + slides.length;
      if (cap.title) cap.title.textContent = s.dataset.title || '';
      if (cap.kind) cap.kind.textContent = s.dataset.kind || '';
      if (animate) gsap.fromTo([cap.title, cap.kind], { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .06, ease: 'expo.out', clearProps: 'transform,opacity' });
    }
    function progress(i, ms) {
      thumbs.forEach(function (t, k) {
        var p = $('.hero-prog', t);
        if (window.gsap) gsap.killTweensOf(p);
        p.style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')';
      });
      if (paused || held || !ms || !window.gsap || reduced) return;
      progTween = gsap.fromTo($('.hero-prog', thumbs[i]), { scaleX: 0 }, { scaleX: 1, duration: ms / 1000, ease: 'none' });
    }
    function schedule() {
      clearTimeout(timer);
      var ms = parseInt(slides[current].getAttribute('data-interval'), 10) || 6000;
      progress(current, ms);
      if (!paused && !held) timer = setTimeout(function () { go(current + 1, 1); }, ms);
    }
    function setVideo(slide, play) {
      var v = $('video', slide);
      if (!v) return;
      if (play && !paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
      else v.pause();
    }
    function go(next, dir) {
      if (busy) return;
      next = (next + slides.length) % slides.length;
      if (next === current) return;
      var from = slides[current], to = slides[next];
      var fromMedia = $('.hero-media', from), toMedia = $('.hero-media', to);
      thumbs[current].classList.remove('is-active');
      thumbs[next].classList.add('is-active');
      slides.forEach(function (s, k) { s.setAttribute('aria-hidden', String(k !== next)); });
      $$('img, video', to).forEach(function (m) { if (m.loading === 'lazy') m.loading = 'eager'; });
      var v = $('video', to); if (v) v.currentTime = 0;
      setVideo(to, true);
      caption(next);
      if (animate) {
        busy = true;
        to.classList.add('is-entering');
        from.classList.add('is-leaving');
        gsap.timeline({
          defaults: { ease: 'expo.inOut' },
          onComplete: function () {
            from.classList.remove('is-active', 'is-leaving'); to.classList.add('is-active'); to.classList.remove('is-entering');
            gsap.set(to, { clearProps: 'clipPath' }); gsap.set([fromMedia, toMedia], { clearProps: 'transform' });
            setVideo(from, false); busy = false;
          }
        })
          // The incoming slide is wiped in while its media layer settles;
          // the outgoing layer drifts the other way. One duration and one curve for both.
          .fromTo(to, { clipPath: dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1 }, 0)
          .fromTo(toMedia, { xPercent: dir * 12, scale: 1.06 }, { xPercent: 0, scale: 1, duration: 1.1 }, 0)
          .to(fromMedia, { xPercent: dir * -12, duration: 1.1 }, 0);
      } else {
        from.classList.remove('is-active'); to.classList.add('is-active'); setVideo(from, false);
      }
      current = next;
      held = shouldHold();
      schedule();
    }
    // The pointer holds a banner so it can be read; the film plays on regardless. Keyboard focus in the
    // carousel holds the timer on any slide. Nothing here stops the film: only the pause button does.
    var hovering = false, focused = false;
    function shouldHold() { return focused || (hovering && !$('video', slides[current])); }
    function hold() {
      var on = shouldHold();
      if (held === on) return;
      held = on;
      if (on) { clearTimeout(timer); if (progTween) progTween.pause(); }
      else if (!paused) schedule();
    }

    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { go(i, i > current ? 1 : -1); }); });
    $$('[data-hero="prev"]').forEach(function (b) { b.addEventListener('click', function () { go(current - 1, -1); }); });
    $$('[data-hero="next"]').forEach(function (b) { b.addEventListener('click', function () { go(current + 1, 1); }); });
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      paused = !paused;
      setPauseUI();
      setVideo(slides[current], !paused);
      if (paused) { clearTimeout(timer); progress(current, 0); } else schedule();
    });
    root.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hovering = true; hold(); } });
    root.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hovering = false; hold(); } });
    root.addEventListener('focusin', function () { focused = true; hold(); });
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) { focused = false; hold(); } });

    var sx = null;
    stage.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') sx = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    function start() {
      if (started) return;
      started = true;
      if (!paused) { setVideo(slides[0], true); schedule(); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (paused) return;
        if (!en[0].isIntersecting) { clearTimeout(timer); if (progTween) progTween.pause(); setVideo(slides[current], false); }
        else if (!started) start();
        else { setVideo(slides[current], true); if (!held) schedule(); }
      }).observe(stage);
    }
    slides.forEach(function (s, k) { s.setAttribute('aria-hidden', String(k !== 0)); });
    setPauseUI();
    // While the opening sequence plays, wait for it so the film starts as the view arrives.
    if (doc.documentElement.classList.contains('intro-on')) doc.addEventListener('nitrkl:intro-done', start, { once: true });
    else start();

    if (animate) {
      gsap.to('#heroStage .hero-media', {
        yPercent: 7, ease: 'none', scrollTrigger: { trigger: stage, start: 'top top', end: 'bottom top', scrub: true }
      });
    }
  })();

  /* ---------------------------------------------------------------
     Tabs (notices, events, intellectual property)
     --------------------------------------------------------------- */
  function tablist(list, hoverActivates) {
    if (!list) return;
    var tabs = $$('[role="tab"]', list);
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = doc.getElementById(t.getAttribute('aria-controls'));
        if (!panel) return;
        panel.hidden = !on;
        panel.classList.toggle('is-active', on);
        if (on && animate) gsap.fromTo(panel.children, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .55, stagger: .04, ease: 'expo.out', clearProps: 'transform,opacity' });
      });
      // a section link that belongs to one tab ("View ALL" events, "All Seminars") shows with it
      var home = list.closest('section');
      if (home) $$('[data-for]', home).forEach(function (l) { l.hidden = l.getAttribute('data-for') !== tab.getAttribute('aria-controls'); });
      if (focus) tab.focus();
      onScroll();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { if (!t.classList.contains('is-active')) select(t); });
      if (hoverActivates) t.addEventListener('mouseenter', function () {
        if (window.matchMedia('(hover: hover)').matches && !t.classList.contains('is-active')) select(t);
      });
      t.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        if (k === 'ArrowLeft' || k === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (k === 'Home') n = tabs[0];
        if (k === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });
  }
  $$('.bigtabs').forEach(function (l) { tablist(l); });
  tablist($('.agenda-tabs'));
  tablist($('.ip-index'), true);

  /* ---------------------------------------------------------------
     Incubations: one startup open at a time (pointer, click or keyboard)
     --------------------------------------------------------------- */
  (function incubations() {
    var strip = $('#incStrip');
    if (!strip) return;
    var items = $$('.inc', strip), hoverTimer = null;
    var wide = window.matchMedia('(min-width: 1101px)');
    function open(item) {
      items.forEach(function (it) {
        var on = it === item;
        it.classList.toggle('is-open', on);
        $('.inc-toggle', it).setAttribute('aria-expanded', String(on));
      });
    }
    items.forEach(function (it) {
      var toggle = $('.inc-toggle', it);
      toggle.addEventListener('click', function () {
        clearTimeout(hoverTimer);
        open(it);
        // The strip hides the button of the open startup, so focus moves on to its link.
        if (wide.matches) $('.btn', it).focus({ preventScroll: true });
        else toggle.scrollIntoView({ block: 'nearest' });
      });
      it.addEventListener('mouseenter', function () {
        if (!wide.matches || !window.matchMedia('(hover: hover)').matches) return;
        var active = doc.activeElement;
        if (active && strip.contains(active) && active.matches(':focus-visible')) return;  // never pull the panel from under keyboard focus
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { open(it); }, 200);  // a pause, so sweeping across doesn't flicker
      });
      it.addEventListener('mouseleave', function () { clearTimeout(hoverTimer); });
    });
  })();

  /* ---------------------------------------------------------------
     Study @ NITR: the programme list drives the reading stage
     --------------------------------------------------------------- */
  (function study() {
    var items = $$('.san-nav-item'), panes = $$('.san-pane');
    if (!items.length) return;
    var hoverTimer = null, current = 0;
    function select(i, focus) {
      current = i;
      items.forEach(function (it, k) {
        var on = k === i;
        it.classList.toggle('active', on);
        it.setAttribute('aria-selected', String(on));
        it.tabIndex = on ? 0 : -1;
      });
      panes.forEach(function (p, k) {
        var on = k === i;
        p.classList.toggle('active', on);
        p.setAttribute('aria-hidden', String(!on));
        if (on) { var card = $('.san-content-card', p); if (card) card.scrollTop = 0; }
      });
      if (focus) items[i].focus();
    }
    items.forEach(function (it, i) {
      it.addEventListener('mouseenter', function () {
        if (!window.matchMedia('(hover: hover)').matches) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { select(i); }, 60);
      });
      it.addEventListener('mouseleave', function () { clearTimeout(hoverTimer); });
      it.addEventListener('click', function () { clearTimeout(hoverTimer); select(i); });
      it.addEventListener('keydown', function (e) {
        var k = e.key, n = null;
        if (k === 'Enter' || k === ' ') { e.preventDefault(); select(i); return; }
        if (k === 'ArrowDown' || k === 'ArrowRight') n = (current + 1) % items.length;
        if (k === 'ArrowUp' || k === 'ArrowLeft') n = (current - 1 + items.length) % items.length;
        if (k === 'Home') n = 0;
        if (k === 'End') n = items.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0);

    // A pane that covers several programmes (Postgraduate) shows one programme at a time, chosen
    // from a row of buttons, so its text fits the reading panel without scrolling. Built from the
    // pane's own headings; without script the pane shows all of them as before.
    $$('.san-content-card').forEach(function (card, n) {
      var subs = $$('.san-content-subtitle', card);
      if (subs.length < 3) return;
      var title = $('.san-content-title', card);
      var bar = doc.createElement('div');
      bar.className = 'san-subtabs';
      bar.setAttribute('role', 'tablist');
      bar.setAttribute('aria-label', (title ? title.textContent : 'Programme') + ' programmes');
      subs.forEach(function (h, i) {
        var panel = doc.createElement('div');
        panel.className = 'san-subpanel' + (i ? '' : ' is-active');
        panel.id = 'san-sub-' + n + '-' + i;
        panel.setAttribute('role', 'tabpanel');
        panel.hidden = i > 0;
        h.parentNode.insertBefore(panel, h);
        for (var el = h; el && (el === h || !el.classList.contains('san-content-subtitle')) && !el.classList.contains('san-pane-footer');) {
          var next = el.nextElementSibling; panel.appendChild(el); el = next;
        }
        var b = doc.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'tab');
        b.id = panel.id + '-tab'; b.setAttribute('aria-controls', panel.id);
        b.setAttribute('aria-selected', String(!i)); b.tabIndex = i ? -1 : 0;
        if (!i) b.classList.add('is-active');
        b.textContent = h.textContent.trim();
        panel.setAttribute('aria-labelledby', b.id);
        bar.appendChild(b);
      });
      if (title) title.after(bar); else card.prepend(bar);
      tablist(bar);
    });
  })();

  /* ---------------------------------------------------------------
     Placement statistics (Annual Placement Report 2025-26)
     --------------------------------------------------------------- */
  var P = {
    dept: [
      ['BM', '20.5'], ['BT', '23.5'], ['CR', '35.00'], ['CE', '70.00'], ['CH', '32.57'], ['CS', '131.00'],
      ['EC', '81.14'], ['EI', '44.02'], ['EE', '62.74'], ['ME', '35.13'], ['ID', '50.00'], ['FP', '22.00'],
      ['SM', '9.00'], ['MN', '20.5'], ['MM', '31.00'], ['PH', '16.00'], ['CY', '10.00'], ['MA', '24.00'],
      ['MC', '10.00'], ['HS', '5.00'], ['ER', '9.00'], ['LS', '22.5'], ['PA', '20.1'], ['AG', '16.45']
    ],
    school: [
      ['Engineering', '131.0'], ['Planning & Architecture', '20.1'], ['General Sciences', '24.0'],
      ['Humanities & Social Sciences', '5.0'], ['School of Management', '9.0']
    ],
    avg: [['BTech', '15.40'], ['MTech', '11.74'], ['Int MSc', '9.24'], ['Dual Degree', '9.58']],
    intern: [
      { name: 'Internship', pct: 31, hi: 'Highest - 1 LPM', c: '#771d1d' },
      { name: '6Month + FTE', pct: 25.2, hi: 'Highest - 1 LPM', c: '#d75151' },
      { name: '6 Month + PPO', pct: 43.8, hi: 'Highest - 2.5 LPM', c: '#faaaaa' }
    ],
    sector: [
      ['Software IT', 16.6], ['Power and Heavy', 13.9], ['BFSI', 11.8], ['Electronics, Semiconductor and VLSI', 8.5],
      ['Education', 7.7], ['Oil and Gas', 7.7], ['Automobile', 3.5], ['Construction', 2.2],
      ['Biotechnology', 0.5], ['Robotics', 0.2]
    ],
    sectorOther: ['Not itemised in the report', 27.4]
  };

  function rows(tbody, data) {
    if (!tbody) return;
    tbody.innerHTML = data.map(function (r) {
      return '<tr>' + r.map(function (c, i) { return i ? '<td>' + c + '</td>' : '<th scope="row">' + c + '</th>'; }).join('') + '</tr>';
    }).join('');
  }
  rows($('#tblDept'), P.dept);
  rows($('#tblSchool'), P.school);
  rows($('#tblAvg'), P.avg);
  rows($('#tblIntern'), P.intern.map(function (d) { return [d.name, d.pct + '%', d.hi]; }));
  rows($('#tblSector'), P.sector.concat([P.sectorOther]).map(function (d) { return [d[0], d[1] + '%']; }));

  function grow(els, axis, opts) {
    if (!animate || !els.length) return;
    var from = {}; from[axis] = 0;
    gsap.set(els, from);
    onEnter(els[0].closest('figure, ul, div'), function () {
      var to = { duration: 1.1, ease: 'expo.out', stagger: (opts && opts.stagger) || .04 }; to[axis] = 1;
      gsap.to(els, to);
    });
  }

  (function deptChart() {
    var chart = $('#deptChart');
    if (!chart) return;
    var keyEl = $('#readoutKey'), valEl = $('#readoutVal');
    var view = 'dept', sort = 'desc';
    function data() {
      var d = (view === 'dept' ? P.dept : P.school).slice();
      if (sort === 'desc') d.sort(function (a, b) { return parseFloat(b[1]) - parseFloat(a[1]); });
      return d;
    }
    function peak(d) { return d.reduce(function (m, r) { return parseFloat(r[1]) > parseFloat(m[1]) ? r : m; }, d[0]); }
    function readout(r, instant) {
      keyEl.textContent = r[0];
      if (animate && !instant) {
        var o = { v: parseFloat(valEl.textContent) || 0 };
        var dec = (r[1].split('.')[1] || '').length;
        gsap.to(o, { v: parseFloat(r[1]), duration: .4, ease: 'power3.out', onUpdate: function () { valEl.textContent = o.v.toFixed(dec); } });
      } else valEl.textContent = r[1];
    }
    function build(animateIn) {
      var d = data(), top = peak(d);
      chart.classList.toggle('is-school', view === 'school');
      chart.style.setProperty('--max', 131);
      chart.innerHTML = d.map(function (r) {
        return '<button type="button" class="hrow' + (r === top ? ' is-peak' : '') + '" data-k="' + r[0] + '" data-v="' + r[1] +
          '" style="--v:' + parseFloat(r[1]) + '" aria-label="' + r[0] + ': ' + r[1] + ' LPA">' +
          '<span class="hrow-key">' + r[0] + '</span><span class="hrow-track"><span class="hrow-fill"></span></span><span class="hrow-val">' + r[1] + '</span></button>';
      }).join('');
      readout(top, !animateIn);
      if (animateIn && animate) gsap.fromTo($$('.hrow-fill', chart), { scaleX: 0 }, { scaleX: 1, duration: 1, ease: 'expo.out', stagger: .025 });
    }
    function show(c) { readout([c.dataset.k, c.dataset.v]); }
    chart.addEventListener('pointerover', function (e) { var c = e.target.closest('.hrow'); if (c) show(c); });
    chart.addEventListener('pointerleave', function () { if (!$('.hrow.is-hot', chart)) readout(peak(data())); });
    chart.addEventListener('focusin', function (e) { var c = e.target.closest('.hrow'); if (c) { chart.classList.add('has-focus'); show(c); } });
    chart.addEventListener('focusout', function () { chart.classList.remove('has-focus'); });
    chart.addEventListener('click', function (e) {
      var c = e.target.closest('.hrow'); if (!c) return;
      $$('.hrow.is-hot', chart).forEach(function (x) { x.classList.remove('is-hot'); });
      c.classList.add('is-hot'); show(c);
    });
    function setPressed(group, attr, val) {
      $$('[' + attr + ']', group).forEach(function (b) {
        var on = b.getAttribute(attr) === val;
        b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on));
      });
    }
    $$('[data-view]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (view === b.dataset.view) return;
        view = b.dataset.view;
        setPressed(b.parentNode, 'data-view', view);
        $('#dept-title').textContent = view === 'dept' ? 'Highest CTC (LPA) across department' : 'Sector-wise highest CTC';
        build(true);
      });
    });
    $$('[data-sort]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (sort === b.dataset.sort) return;
        sort = b.dataset.sort;
        setPressed(b.parentNode, 'data-sort', sort);
        var before = {};
        $$('.hrow', chart).forEach(function (c) { before[c.dataset.k] = c.getBoundingClientRect().top; });
        data().forEach(function (r) { chart.appendChild($('.hrow[data-k="' + CSS.escape(r[0]) + '"]', chart)); });
        if (animate) $$('.hrow', chart).forEach(function (c) {
          var dy = before[c.dataset.k] - c.getBoundingClientRect().top;
          if (dy) gsap.fromTo(c, { y: dy }, { y: 0, duration: .8, ease: 'expo.inOut' });
        });
      });
    });
    build(false);
    grow($$('.hrow-fill', chart), 'scaleX', { stagger: .03 });
  })();

  (function avg() {
    var list = $('#avgChart');
    if (!list) return;
    list.innerHTML = P.avg.map(function (r) {
      return '<li><span class="avg-label">' + r[0] + '</span><span class="avg-val">' + r[1] + '</span>' +
        '<span class="avg-track"><span class="avg-fill" style="--w:' + (parseFloat(r[1]) / 16 * 100).toFixed(1) + '%"></span></span></li>';
    }).join('');
    grow($$('.avg-fill', list), 'scaleX', { stagger: .08 });
  })();

  (function sectors() {
    var list = $('#sectorChart');
    if (!list) return;
    var all = P.sector.concat([P.sectorOther]);
    list.innerHTML = all.map(function (r, i) {
      return '<li' + (i === P.sector.length ? ' class="is-other"' : '') + '><span class="bars-label">' + r[0] + '</span>' +
        '<span class="bars-track"><span class="bars-fill" style="--w:' + (r[1] / 28 * 100).toFixed(2) + '%"></span></span><span class="bars-val">' + r[1] + '%</span></li>';
    }).join('');
    grow($$('.bars-fill', list), 'scaleX', { stagger: .05 });
  })();

  (function waffle() {
    var w = $('#internWaffle'), legend = $('#internLegend');
    if (!w) return;
    var counts = [31, 25, 44]; // 31% · 25.2% · 43.8% rounded to whole cells of 100
    var html = '';
    counts.forEach(function (n, i) { for (var k = 0; k < n; k++) html += '<i data-i="' + i + '" style="--c:' + P.intern[i].c + '"></i>'; });
    w.innerHTML = html;
    legend.innerHTML = P.intern.map(function (d, i) {
      return '<li data-i="' + i + '" tabindex="0" style="--c:' + d.c + '"><span class="sw"></span><span class="pct">' + d.pct +
        '%</span><b>' + d.name + '</b><span class="hi">(' + d.hi + ')</span></li>';
    }).join('');
    function hot(i) {
      w.classList.toggle('has-hot', i !== null);
      $$('i', w).forEach(function (c) { c.classList.toggle('is-hot', c.dataset.i === String(i)); });
      $$('li', legend).forEach(function (l) { l.classList.toggle('is-hot', l.dataset.i === String(i)); });
    }
    [w, legend].forEach(function (root) {
      root.addEventListener('pointerover', function (e) { var t = e.target.closest('[data-i]'); if (t) hot(t.dataset.i); });
      root.addEventListener('pointerleave', function () { hot(null); });
    });
    legend.addEventListener('focusin', function (e) { var t = e.target.closest('[data-i]'); if (t) hot(t.dataset.i); });
    legend.addEventListener('focusout', function () { hot(null); });
    if (animate) {
      var cells = $$('i', w);
      gsap.set(cells, { opacity: 0, scale: .4 });
      onEnter(w, function () { gsap.to(cells, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(2)', stagger: { each: .008, from: 'start' }, clearProps: 'opacity,transform' }); });
    }
  })();

  var tblBtn = $('.pl-tables-btn');
  if (tblBtn) tblBtn.addEventListener('click', function () {
    var open = tblBtn.getAttribute('aria-expanded') !== 'true';
    tblBtn.setAttribute('aria-expanded', String(open));
    doc.getElementById(tblBtn.getAttribute('aria-controls')).hidden = !open;
  });

  /* ---------------------------------------------------------------
     Count-up figures
     --------------------------------------------------------------- */
  $$('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    el.textContent = fmt(target, dec);
    if (!animate) return;
    // Hold the final number's width while it counts, so the digits (and any "+" or "%" after them)
    // never push the layout around. Kept in em, so it follows the type when the window resizes.
    // Measured again once the web fonts are in and as the count starts (no paint in between).
    el.style.display = 'inline-block';
    function reserve() {
      var shown = el.textContent;
      el.style.minWidth = '';
      el.textContent = fmt(target, dec);
      el.style.minWidth = (el.getBoundingClientRect().width / (parseFloat(getComputedStyle(el).fontSize) || 16)).toFixed(3) + 'em';
      el.textContent = shown;
    }
    reserve();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(reserve);
    var o = { v: 0 };
    el.textContent = fmt(0, dec);
    onEnter(el, function () {
      reserve();
      gsap.to(o, { v: target, duration: target > 1000 ? 2 : 1.4, ease: 'power3.out', onUpdate: function () { el.textContent = fmt(o.v, dec); } });
    }, '0px 0px -8% 0px');
  });

  /* ---------------------------------------------------------------
     NIRF rank tracks
     --------------------------------------------------------------- */
  $$('#nirfList li').forEach(function (li, i) {
    var dot = $('.nirf-track i', li);
    li.style.setProperty('--r', li.dataset.rank);
    if (animate) {
      gsap.set(dot, { left: 0 });
      onEnter(li, function () {
        gsap.to(dot, { left: ((li.dataset.rank - 1) / 49 * 100) + '%', duration: 1.4, delay: i * .08, ease: 'expo.out', clearProps: 'left' });
      });
    }
  });

  /* ---------------------------------------------------------------
     Latest news: quick view in a native dialog
     --------------------------------------------------------------- */
  (function newsDialog() {
    var sheet = $('#newsSheet'), dlg = $('#storyDialog');
    if (!sheet || !dlg || typeof dlg.showModal !== 'function') return;
    var stories = $$('[data-story]', sheet).map(function (el) {
      return { title: $('h3', el).textContent.trim(), tag: el.dataset.tag, img: el.dataset.img, link: el.dataset.link, summary: el.dataset.summary };
    });
    var cur = 0, opener = null;
    var f = { img: $('#storyImg'), tag: $('#storyTag'), count: $('#storyCount'), title: $('#storyTitle'), summary: $('#storySummary'), link: $('#storyLink') };
    function fill(i) {
      cur = (i + stories.length) % stories.length;
      var s = stories[cur];
      f.img.src = s.img; f.img.alt = s.title; f.tag.textContent = s.tag; f.count.textContent = (cur + 1) + ' of ' + stories.length;
      f.title.textContent = s.title; f.summary.textContent = s.summary; f.link.href = s.link;
      if (animate && dlg.open) gsap.fromTo([f.img, f.title, f.summary], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .45, stagger: .05, ease: 'expo.out', clearProps: 'transform,opacity' });
    }
    sheet.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open]');
      if (!t) return;
      opener = t;
      fill(parseInt(t.dataset.open, 10));
      dlg.showModal();
      doc.body.style.overflow = 'hidden';
    });
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
      var step = e.target.closest('[data-step]');
      if (step) fill(cur + parseInt(step.dataset.step, 10));
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') fill(cur + 1);
      if (e.key === 'ArrowLeft') fill(cur - 1);
    });
    dlg.addEventListener('close', function () { doc.body.style.overflow = ''; if (opener) opener.focus(); });
  })();

  /* ---------------------------------------------------------------
     Research reel: arrows, progress and drag on desktop
     --------------------------------------------------------------- */
  (function reel() {
    var r = $('#researchReel');
    if (!r) return;
    var prog = $('.reel-progress span'), btns = $$('[data-reel]');
    function update() {
      var max = r.scrollWidth - r.clientWidth;
      var share = r.clientWidth / r.scrollWidth;
      if (prog) {
        prog.style.setProperty('--w', (share * 100).toFixed(1) + '%');
        prog.style.setProperty('--x', (max > 0 ? r.scrollLeft / max * (1 / share - 1) * 100 : 0).toFixed(1) + '%');
      }
      btns.forEach(function (b) {
        var d = parseInt(b.dataset.reel, 10);
        b.disabled = d < 0 ? r.scrollLeft < 8 : r.scrollLeft > max - 8;
      });
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var card = $('li', r);
        var step = card ? card.getBoundingClientRect().width + 12 : r.clientWidth * .8;
        r.scrollBy({ left: parseInt(b.dataset.reel, 10) * step, behavior: reduced ? 'auto' : 'smooth' });
      });
    });
    r.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    // Drag with the mouse (touch and trackpads scroll natively)
    var down = false, startX = 0, startL = 0, moved = false;
    r.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; startX = e.clientX; startL = r.scrollLeft; r.style.scrollSnapType = 'none';
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      r.scrollLeft = startL - dx;
    });
    window.addEventListener('pointerup', function () { if (!down) return; down = false; r.style.scrollSnapType = ''; });
    r.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    update();
  })();

  /* ---------------------------------------------------------------
     Publications composition bar
     --------------------------------------------------------------- */
  (function pubs() {
    var barEl = $('#pubBar'), legend = $('#pubLegend');
    if (!barEl) return;
    var btns = $$('button', barEl), keys = $$('div', legend);
    var total = btns.reduce(function (s, b) { return s + parseFloat(b.dataset.v); }, 0);
    var colours = ['#771d1d', '#a72626', '#d75151', '#faaaaa'];
    btns.forEach(function (b, i) {
      b.style.setProperty('--w', 'calc((100% - ' + (btns.length - 1) * 2 + 'px) * ' + (b.dataset.v / total).toFixed(4) + ')');
      b.style.setProperty('--c', colours[i]);
      keys[i].style.setProperty('--c', colours[i]);
      b.setAttribute('aria-label', b.title.trim() + ': ' + inr.format(b.dataset.v) + ' (' + (b.dataset.v / total * 100).toFixed(1) + '%)');
    });
    function hot(i) {
      btns.forEach(function (b, k) { b.classList.toggle('is-hot', k === i); });
      keys.forEach(function (d, k) { d.classList.toggle('is-hot', k === i); });
    }
    btns.concat(keys).forEach(function (el) {
      var i = btns.indexOf(el) > -1 ? btns.indexOf(el) : keys.indexOf(el);
      el.addEventListener('pointerenter', function () { hot(i); });
      el.addEventListener('pointerleave', function () { hot(-1); });
      el.addEventListener('focus', function () { hot(i); });
      el.addEventListener('blur', function () { hot(-1); });
    });
    grow($$('.pubbar-fill', barEl), 'scaleX', { stagger: .12 });
  })();

  /* ---------------------------------------------------------------
     GIGW: links that leave the institute's websites say so and ask first.
     Subdomains of nitrkl.ac.in are the institute's own. layout.js already
     asks for links marked .outside-link; every other outside link, the
     chatbot's source links included, is handled here.
     --------------------------------------------------------------- */
  (function outsideLinks() {
    var NOTICE = 'This link shall take you to a page/website outside this website. For any query regarding the contents of the linked page/website, please contact the administrator of the concerned website.';
    var NOTE = ' (external website, opens in a new tab)';
    function outside(a) {
      if (!/^https?:$/.test(a.protocol)) return false;
      var h = a.hostname.toLowerCase();
      return h !== location.hostname && h !== 'nitrkl.ac.in' && !/\.nitrkl\.ac\.in$/.test(h);
    }
    function mark(a) {
      if (a.dataset.outside || !outside(a)) return;
      a.dataset.outside = '1';
      if (a.target !== '_blank') return;
      var label = a.getAttribute('aria-label');
      if (label) a.setAttribute('aria-label', label + NOTE);
      else { var n = doc.createElement('span'); n.className = 'visually-hidden'; n.textContent = NOTE; a.appendChild(n); }
    }
    $$('a[href]').forEach(mark);
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.classList.contains('outside-link') || !outside(a)) return;
      if (!window.confirm(NOTICE)) e.preventDefault();
    }, true);
  })();

  /* ---------------------------------------------------------------
     Footer photo strip: open the photos full size (Fancybox when present)
     --------------------------------------------------------------- */
  if (window.jQuery && window.jQuery.fancybox) {
    window.jQuery('[data-fancybox="footer-gallery"]').fancybox({ loop: true, buttons: ['zoom', 'slideShow', 'fullScreen', 'thumbs', 'close'] });
  }

  /* ---------------------------------------------------------------
     Last updated (DBIM footer). The server should write the real date.
     --------------------------------------------------------------- */
  (function lastUpdated() {
    var el = $('#lastUpdated');
    var d = new Date(doc.lastModified);
    if (!el || isNaN(d)) return;
    el.dateTime = d.toISOString().slice(0, 10);
    el.textContent = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  /* ---------------------------------------------------------------
     Entrances and scroll-linked motion
     --------------------------------------------------------------- */
  if (animate) {
    $$('[data-reveal]').forEach(function (el) {
      var parts = Array.prototype.slice.call(el.children);
      if (!parts.length || el.matches('h2, h3, p, li, article')) parts = [el];
      if (parts.length > 8) parts = parts.slice(0, 8);
      gsap.set(parts, { y: 28, opacity: 0 });
      // A block laid out with display: contents has no box to watch; its parent arrives instead
      var watch = getComputedStyle(el).display === 'contents' ? el.parentElement : el;
      onEnter(watch, function () {
        gsap.to(parts, { y: 0, opacity: 1, duration: .9, stagger: .07, ease: 'expo.out', clearProps: 'transform,opacity' });
      });
    });

    // Section titles rise line by line as their chapter arrives
    $$('.chapter .title').forEach(function (t) {
      if (t.closest('[data-reveal]')) return;
      gsap.set(t, { yPercent: 40, opacity: 0 });
      onEnter(t, function () { gsap.to(t, { yPercent: 0, opacity: 1, duration: 1, ease: 'expo.out', clearProps: 'transform,opacity' }); });
    });

    // The giant name at the foot of the page slides in as the footer arrives
    var fname = $('.f-name');
    if (fname) gsap.fromTo(fname, { xPercent: -6 }, { xPercent: 0, ease: 'none', scrollTrigger: { trigger: fname, start: 'top bottom', end: 'bottom bottom', scrub: true } });

    // Layout settles after web fonts and images; re-measure every trigger then.
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
