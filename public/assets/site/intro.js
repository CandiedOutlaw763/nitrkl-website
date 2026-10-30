/* NIT Rourkela homepage: opening sequence (see intro.css).
   1. Assemble: the seal's components (seal.js: ribbon, banner, gear, compass, torch, set square,
      lightning) fly in from different directions and lock into place.
   2. Load: the gear turns once as the page loads, with a percentage counting to 100.
   3. Zoom: the camera is pulled into the gear's centre; the emblem rushes past, the hole opens onto
      the homepage and the page settles from slightly enlarged to its real size.
   Everything is drawn from vector paths at the screen's pixel density, so it stays sharp at any
   size. Loaded right after its markup so it starts before the rest of the page has parsed. */
(function () {
  'use strict';

  var root = document.documentElement;
  var veil = document.getElementById('intro');
  var skipBtn = document.getElementById('introSkip');
  if (!veil) return;
  if (!root.classList.contains('intro-on') || !window.NITRKL_SEAL || !window.Path2D) { // not playing
    root.classList.remove('intro-on');
    veil.remove();
    if (skipBtn) skipBtn.remove();
    return;
  }

  var SEAL = window.NITRKL_SEAL;
  var GEAR = SEAL.gear;
  // The seal's visible extent in its own 1200-unit space, used to place and size it.
  var BOX = { x0: 58, y0: 103, x1: 1150, y1: 1152 };

  // Timing, ms.
  var ASSEMBLE = 2000;   // components flying in
  var TURN_MIN = 1500;   // the gear's turn to 100% takes at least this long
  var HOLD = 250;        // a beat at 100% before the zoom
  var MAX_WAIT = 7500;   // zoom regardless after this; the page keeps loading underneath
  var DIVE = 1600, QUICK_DIVE = 700;

  // How each component arrives: start offset (seal units), turn (radians), scale, and when.
  var FLIGHT = {
    ribbon:    { dx: 0,     dy: 760,  rot: 0,     s: 0.86, at: 120,  len: 1050 },
    banner:    { dx: 0,     dy: 900,  rot: 0,     s: 1,    at: 260,  len: 950 },
    gear:      { dx: 0,     dy: 0,    rot: -2.2,  s: 0.35, at: 0,    len: 1300 },
    compass:   { dx: -950,  dy: -650, rot: -1.6,  s: 1.4,  at: 520,  len: 1000 },
    torch:     { dx: 120,   dy: -980, rot: 0.9,   s: 1.3,  at: 660,  len: 1000 },
    setsquare: { dx: 1050,  dy: 380,  rot: 1.4,   s: 1.5,  at: 800,  len: 1000 },
    lightning: { dx: -1300, dy: 120,  rot: -0.35, s: 1.1,  at: 1250, len: 650 }
  };
  var EMBLEM = { compass: 1, torch: 1, setsquare: 1, lightning: 1 };

  var PAPER = getComputedStyle(root).getPropertyValue('--white').trim() || '#fff';
  var canvas = veil.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  // The emblem fades out as one piece during the zoom: drawn here first, so overlapping parts
  // don't show through each other.
  var group = document.createElement('canvas');
  var gctx = group.getContext('2d');
  var readout = veil.querySelector('.intro-percent');

  try { sessionStorage.setItem('nitrkl-intro', '1'); } catch (e) { /* private mode: plays again next time */ }

  // ---- easing -------------------------------------------------------------------------------
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function outQuart(q) { return 1 - Math.pow(1 - q, 4); }
  function outCubic(q) { return 1 - Math.pow(1 - q, 3); }
  function outExpo(q) { return q >= 1 ? 1 : 1 - Math.pow(2, -10 * q); }
  function smooth(a, b, v) { var q = clamp((v - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); }

  // ---- the seal as Path2D objects ----------------------------------------------------------------
  var parts = SEAL.parts.map(function (p) {
    return {
      id: p.id,
      pivot: p.pivot,
      flight: FLIGHT[p.id] || { dx: 0, dy: 600, rot: 0, s: 1, at: 0, len: 900 },
      layers: p.layers.map(function (L) {
        return { path: new Path2D(L.d), fill: L.fill, stroke: L.stroke, width: L.width, rule: L.rule || 'nonzero', join: L.join || 'round' };
      })
    };
  });

  // ---- layout --------------------------------------------------------------------------------
  var W, H, dpr, k, X0, Y0;
  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = group.width = Math.round(W * dpr); canvas.height = group.height = Math.round(H * dpr);
    var size = clamp(Math.min(W * 0.8, H * 0.5), 200, 400); // the seal's width on screen
    k = size / (BOX.x1 - BOX.x0);
    // Centre the seal's box at 43% of the height; X0, Y0 is the gear's centre on screen.
    X0 = W / 2 + (GEAR.cx - (BOX.x0 + BOX.x1) / 2) * k;
    Y0 = H * 0.43 + (GEAR.cy - (BOX.y0 + BOX.y1) / 2) * k;
    veil.style.setProperty('--name-top', Math.round(H * 0.43 + (BOX.y1 - BOX.y0) / 2 * k + 24) + 'px');
  }
  layout();
  window.addEventListener('resize', layout);

  // ---- load progress ------------------------------------------------------------------------
  var loaded = document.readyState === 'complete';
  window.addEventListener('load', function () { loaded = true; });
  function loadTarget() {
    if (loaded) return 1;
    var imgs = document.images, total = 0, done = 0;
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].loading === 'lazy') continue; // these wait for scrolling, not for us
      total++; if (imgs[i].complete) done++;
    }
    var dom = document.readyState === 'loading' ? 0.25 : 0.6;
    return Math.min(0.95, dom * 0.5 + (total ? done / total : 1) * 0.5);
  }

  // ---- the page underneath ------------------------------------------------------------------
  var page = [];
  function collectPage() {
    page = Array.prototype.filter.call(document.body.children, function (el) {
      if (el === veil || el === skipBtn || el.tagName === 'SCRIPT') return false;
      var r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= H || !r.height) return false; // only what is on screen
      el.style.transformOrigin = (X0 - r.left) + 'px ' + (Y0 - r.top) + 'px';
      el.style.willChange = 'transform';
      return true;
    });
  }
  function setPageScale(s) {
    for (var i = 0; i < page.length; i++) page[i].style.transform = s === 1 ? '' : 'scale(' + s + ')';
  }

  // ---- input while the veil is up: no scrolling the hidden page -----------------------------
  var SCROLL_KEYS = { ' ': 1, PageUp: 1, PageDown: 1, End: 1, Home: 1, ArrowUp: 1, ArrowDown: 1 };
  function block(e) { e.preventDefault(); }
  function onKey(e) {
    if (e.key === 'Escape') { skip(); return; }
    if (SCROLL_KEYS[e.key] && e.target !== skipBtn) e.preventDefault();
  }
  window.addEventListener('wheel', block, { passive: false });
  window.addEventListener('touchmove', block, { passive: false });
  window.addEventListener('keydown', onKey);
  if (skipBtn) skipBtn.addEventListener('click', skip);

  // ---- state --------------------------------------------------------------------------------
  var t0 = performance.now();
  var turnAt = 0, turned = 0, fullAt = 0;            // the gear's loading turn
  var diveAt = 0, diveLen = DIVE, zoomMax = 1, named = false, finished = false;

  function skip() { if (!diveAt) startDive(QUICK_DIVE); }
  function startDive(len) {
    diveAt = performance.now(); diveLen = len;
    veil.classList.add('is-diving');
    if (skipBtn) skipBtn.classList.add('is-gone');
    // Zoom until the hole reaches the farthest corner of the screen.
    var far = Math.hypot(Math.max(X0, W - X0), Math.max(Y0, H - Y0));
    zoomMax = far * 1.08 / (GEAR.hole * k);
    collectPage();
  }

  function finish() {
    if (finished) return;
    finished = true;
    window.removeEventListener('wheel', block);
    window.removeEventListener('touchmove', block);
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', layout);
    page.forEach(function (el) { el.style.transform = el.style.transformOrigin = el.style.willChange = ''; });
    var hadFocus = skipBtn && document.activeElement === skipBtn;
    veil.remove();
    if (skipBtn) skipBtn.remove();
    root.classList.remove('intro-on');
    if (hadFocus) { var main = document.getElementById('main'); if (main) { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); } }
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    document.dispatchEvent(new CustomEvent('nitrkl:intro-done'));
  }

  // ---- drawing ------------------------------------------------------------------------------
  // Draw one component. Its own motion (offset in seal units, turn and scale about its pivot) is
  // applied inside the camera (scale `cam` about the gear's centre).
  // `g` is the context to draw on (the main canvas unless given).
  function drawPart(p, dx, dy, rot, s, alpha, cam, g) {
    if (alpha <= 0.01) return;
    g = g || ctx;
    g.save();
    g.globalAlpha = alpha;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate(X0, Y0);
    g.scale(k * cam, k * cam);
    g.translate(-GEAR.cx, -GEAR.cy);
    g.translate(p.pivot[0] + dx, p.pivot[1] + dy);
    if (rot) g.rotate(rot);
    if (s !== 1) g.scale(s, s);
    g.translate(-p.pivot[0], -p.pivot[1]);
    for (var i = 0; i < p.layers.length; i++) {
      var L = p.layers[i];
      if (L.fill) { g.fillStyle = L.fill; g.fill(L.path, L.rule); }
      if (L.stroke) {
        g.strokeStyle = L.stroke; g.lineWidth = L.width;
        g.lineJoin = L.join; g.miterLimit = 12;
        g.stroke(L.path);
      }
    }
    g.restore();
  }

  function frame(now) {
    if (finished) return;
    try {
      var t = now - t0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      if (!veil.classList.contains('is-live')) veil.classList.add('is-live');

      if (!diveAt) {
        // 2. The loading turn: after assembly the gear turns once, in step with the page loading,
        // never faster than one turn per TURN_MIN.
        if (t >= ASSEMBLE) {
          if (!turnAt) turnAt = now;
          var target = t >= MAX_WAIT ? 1 : loadTarget();
          var cap = (now - turnAt) / TURN_MIN;
          // Ease towards what has loaded, never backwards, never faster than one turn per TURN_MIN.
          var goal = Math.min(target, cap);
          turned = Math.max(turned, Math.min(goal, turned + Math.max(0.002, (goal - turned) * 0.12)));
          if (turned >= 0.999) { turned = 1; if (!fullAt) fullAt = now; }
          readout.textContent = Math.round(turned * 100) + '%';
        }
        // The gear and the number read the same value: 50% is exactly half a turn.
        var gearTurn = Math.PI * 2 * turned;

        // 1. Assembly: each component on its own flight path.
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], f = p.flight;
          var q = clamp((t - f.at) / f.len, 0, 1);
          var e = p.id === 'lightning' ? outExpo(q) : outQuart(q);
          var rot = f.rot * (1 - e) + (p.id === 'gear' ? gearTurn : 0);
          drawPart(p, f.dx * (1 - e), f.dy * (1 - e), rot, f.s + (1 - f.s) * e, clamp(q * 3, 0, 1), 1);
        }
        if (!named && t > ASSEMBLE * 0.55) { named = true; veil.classList.add('is-named'); }
        if (fullAt && now - fullAt >= HOLD) startDive(DIVE);
      } else {
        // 3. The zoom: being pulled into the gear's centre. Zooming in log space reads as flying at
        // a steady pace; squaring u makes it start gently and accelerate through the hole.
        var u = clamp((now - diveAt) / diveLen, 0, 1);
        var cam = Math.pow(zoomMax, u * u);
        var spin = Math.PI * 2 * turned; // where the gear stopped (a full turn = rest)
        var emblemAlpha = 1 - smooth(0.04, 0.3, u);
        if (emblemAlpha > 0.01) {
          gctx.setTransform(1, 0, 0, 1, 0, 0);
          gctx.clearRect(0, 0, group.width, group.height);
        }
        for (var j = 0; j < parts.length; j++) {
          var pj = parts[j];
          if (EMBLEM[pj.id]) {
            // The emblem sits in front of the hole: it rushes at the viewer and is gone first.
            if (emblemAlpha > 0.01) drawPart(pj, 0, 0, 0, 1 + 1.6 * smooth(0, 0.4, u), 1, cam, gctx);
          } else {
            var out = pj.id === 'gear' ? 1 : 1 + 0.5 * u * u; // ribbon and banner leave a little faster
            drawPart(pj, 0, 0, pj.id === 'gear' ? spin : 0, out, 1 - smooth(0.75, 1, u), cam);
          }
        }
        if (emblemAlpha > 0.01) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = emblemAlpha;
          ctx.drawImage(group, 0, 0);
          ctx.globalAlpha = 1;
        }
        // The hole opens from the centre like an iris, then grows with the gear.
        var r = GEAR.hole * k * cam * smooth(0.05, 0.4, u);
        if (r > 0.5) {
          var rim = ctx.createRadialGradient(X0, Y0, r * 0.92, X0, Y0, r);
          rim.addColorStop(0, 'rgba(0,0,0,1)');
          rim.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = rim;
          ctx.beginPath();
          ctx.arc(X0, Y0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
        }
        // The page comes forward more slowly than the seal: depth.
        setPageScale(1 + 0.14 * (1 - outCubic(u)));
        if (u >= 1 || r > Math.hypot(W, H)) { finish(); return; }
      }
    } catch (err) {
      finish();
      return;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
