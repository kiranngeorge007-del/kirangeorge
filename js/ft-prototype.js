// FairTradeScore case study: the retailer app as a prototype with two modes.
//  - Tour: auto-plays real screens; a finger taps the control named in the script and the
//    screen's own logic reacts.
//  - Live: visitors click and tap through all 48 app screens themselves. Links between screens
//    are handled here (screens post a "nav" message) so they slide in like a native app.
(function () {
  var root = document.querySelector('[data-proto]');
  if (!root) return;

  var BASE = 'fairtradescore/screens/';
  var W = 390, H = 844;
  var START = 'a1-welcome.html';
  var CHAPTERS = ['Sign up', 'Earn a score', 'Share it', 'Credits', 'Stay in control'];
  var LIVE_HINT = 'Tap anything on the phone. Tap an empty spot to see what’s clickable.';

  // src, chapter, caption, taps (wait ms, then tap the control with this text), hold ms at the end
  var SCENES = [
    { src: 'a1-welcome.html', ch: 0, caption: 'A supplier invites the shop. The welcome screen sums up the payoff in three lines.', steps: [{ wait: 2400, tap: 'Get started' }] },
    { src: 'a2-phone.html', ch: 0, caption: 'Mobile number and a one-time code, read from the SMS automatically.', steps: [{ wait: 2200, tap: 'Verify' }] },
    { src: 'a3-business.html', ch: 0, caption: 'The GSTIN fills in the shop’s details, so there are no long forms.', steps: [{ wait: 2600, tap: 'Continue with DigiLocker' }] },
    { src: 'a4-bank.html', ch: 0, caption: 'Read-only bank access through RBI’s Account Aggregator. It can never move money.', steps: [{ wait: 2600, tap: 'State Bank of India' }] },
    { src: 'a5-consent.html', ch: 0, caption: 'Consent in plain words: what is read, for how long, and how to stop it.', steps: [{ wait: 3200, tap: 'I’ve already approved it' }] },
    { src: 'a7-generating.html', ch: 0, caption: 'The profile is set up in under a minute, one step at a time.', steps: [{ wait: 5400, tap: 'Go to my profile' }] },
    { src: 'b0-building.html', ch: 1, caption: 'Day one: no number yet. Just honest progress toward a first score.', hold: 3400 },
    { src: 'b1-home.html', ch: 1, fx: 'fade', badge: 'A few months later', caption: 'As suppliers verify credits, the score settles: 72, Good, with how sure it is.', steps: [{ wait: 3000, tap: 'See why' }] },
    { src: 'b2-factor.html', ch: 1, caption: 'Every factor explains itself, down to how it’s calculated.', steps: [{ wait: 2000, tap: 'How it’s calculated' }], hold: 2800 },
    { src: 'b3-improve.html', ch: 1, caption: 'And there’s always a next step, with the points it could add.', hold: 3600 },
    { src: 'b4-share.html?stage=established', ch: 2, caption: 'Sharing is a link or QR code that expires, and every view is logged.', steps: [{ wait: 1800, tap: '30 days' }, { wait: 1300, tap: 'Show QR code' }, { wait: 1800, tap: 'Copy link' }], hold: 2200 },
    { src: 'g1-notifications.html', ch: 3, caption: 'A supplier records a new credit, and the retailer is notified.', steps: [{ wait: 2400, tap: 'New credit from Mehta' }] },
    { src: 'd3-confirm-credit.html', ch: 3, fx: 'up', caption: 'Both sides confirm every credit, so the score rests on agreed facts.', steps: [{ wait: 2400, tap: 'Yes, it’s correct' }], hold: 2600 },
    { src: 'd1-payments.html', ch: 3, caption: 'All credits in one place, with what’s due next.', steps: [{ wait: 2600, tap: 'Ravi Distributors' }] },
    { src: 'd2-credit.html', ch: 3, caption: 'Paid outside the app? Mark it as paid.', steps: [{ wait: 2200, tap: 'Mark as paid' }] },
    { src: 'd4-mark-paid.html', ch: 3, caption: 'Add how it was paid and a screenshot. The supplier confirms it.', steps: [{ wait: 1600, tap: 'Bank transfer' }, { wait: 1300, tap: 'Attach a screenshot' }, { wait: 1300, tap: 'Send to Ravi to confirm' }], hold: 2800 },
    { src: 'c1-trust.html', ch: 4, caption: 'Trust shows who can see the score, and until when.', steps: [{ wait: 2600, tap: 'Review' }] },
    { src: 'c2-approve.html?stage=established', ch: 4, fx: 'up', caption: 'Each request says exactly what the supplier will see. Access always ends.', steps: [{ wait: 2000, tap: '30 days' }, { wait: 1600, tap: 'Approve for' }] },
    { src: 'c3-access-log.html', ch: 4, caption: 'And every view of the score is on record.', hold: 3800 }
  ];

  var screen = root.querySelector('.ft-proto__screen');
  var finger = root.querySelector('.ft-proto__finger');
  var badge = root.querySelector('.ft-proto__badge');
  var hots = root.querySelector('.ft-proto__hots');
  var captionEl = root.querySelector('[data-proto-caption]');
  var hintEl = root.querySelector('[data-proto-hint]');
  var counterEl = root.querySelector('[data-proto-counter]');
  var playBtn = root.querySelector('[data-proto-play]');
  var backBtn = root.querySelector('[data-proto-back]');
  var chapterList = root.querySelector('[data-proto-chapters]');
  var modeBtns = root.querySelectorAll('[data-proto-mode]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var mode = reduce ? 'live' : 'tour';
  var wantPlay = true;      // the visitor's choice (play/pause) in tour mode
  var visible = false;      // the tour only runs while on screen
  var started = false;
  var runToken = 0;
  var current = 0;          // tour scene index
  var scale = 1;
  var layer = null;         // the screen currently shown
  var history = [];         // live mode: screens to go back to
  var CANCEL = {};

  function playing() { return mode === 'tour' && wantPlay && visible && !document.hidden; }
  function srcOf(l) { return l ? l.getAttribute('data-src') : null; }
  // the canvas's stage switcher on home screens is a design-tool helper, not part of the app;
  // proto=1 tells the screen to talk to this page with postMessage
  function withProps(src) { return src + (src.indexOf('?') > -1 ? '&' : '?') + 'showStage=false&proto=1'; }

  // ---------- messages to and from the screens ----------
  // (postMessage works even when the site is opened from disk, where frames are isolated)
  function send(l, msg) {
    var f = l && l.querySelector('iframe');
    if (f && f.contentWindow) f.contentWindow.postMessage(msg, '*');
  }
  function layerFor(win) {
    var ls = screen.querySelectorAll('.ft-proto__layer');
    for (var i = 0; i < ls.length; i++) if (ls[i].querySelector('iframe').contentWindow === win) return ls[i];
    return null;
  }
  var pending = {}, nextId = 1;
  function ask(l, msg, timeout) {
    return new Promise(function (resolve) {
      var id = nextId++;
      pending[id] = resolve;
      msg.id = id;
      send(l, msg);
      setTimeout(function () { if (pending[id]) { delete pending[id]; resolve(null); } }, timeout || 800);
    });
  }
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || !d.ft) return;
    var l = layerFor(e.source);
    if (!l) return;
    if (d.ft === 'ready') {
      l.setAttribute('data-title', d.title || '');
      if (d.sheet) l.setAttribute('data-sheet', '');
      if (l.__onReady) l.__onReady();
    } else if (d.ft === 'found') {
      if (pending[d.id]) { pending[d.id](d.rect); delete pending[d.id]; }
    } else if (d.ft === 'hots') {
      if (l === layer) flashHotspots(d.rects || []);
    } else if (d.ft === 'nav') {
      if (l === layer) protoNav(d.href, { back: d.back });
    }
  });

  // ---------- chapter buttons ----------
  var chapterBtns = CHAPTERS.map(function (name, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="ft-proto__n">0' + (i + 1) + '</span><span class="ft-proto__t">' + name + '</span><span class="ft-proto__bar"><i></i></span>';
    b.addEventListener('click', function () {
      var first = 0;
      for (var s = 0; s < SCENES.length; s++) if (SCENES[s].ch === i) { first = s; break; }
      if (mode === 'tour') goTo(first);
      else { history = []; liveGo(SCENES[first].src, 'fade', i); }
    });
    li.appendChild(b);
    chapterList.appendChild(li);
    return b;
  });

  function markChapter(ch, fill) {
    chapterBtns.forEach(function (b, c) {
      b.setAttribute('aria-current', c === ch ? 'step' : 'false');
      var f = c < ch ? 1 : c > ch ? 0 : fill;
      b.querySelector('i').style.width = (f * 100) + '%';
    });
  }

  function tourChrome(i) {
    var sc = SCENES[i];
    captionEl.textContent = sc.caption;
    counterEl.textContent = 'Screen ' + (i + 1) + ' of ' + SCENES.length;
    var inCh = SCENES.filter(function (s) { return s.ch === sc.ch; });
    markChapter(sc.ch, (inCh.indexOf(sc) + 1) / inCh.length);
  }

  // live mode: name the screen and light up the chapter it belongs to
  var CHAPTER_OF = { a: 0, b: 1, d: 3, g: 3, p: 3, c: 4, e: 4, l: 0 };
  function liveChrome() {
    var src = srcOf(layer) || '';
    var title = (layer && layer.getAttribute('data-title')) || 'FairTradeScore';
    captionEl.textContent = title.charAt(0).toUpperCase() + title.slice(1);
    var ch = /^b4-/.test(src) ? 2 : CHAPTER_OF[src.charAt(0)];
    markChapter(ch == null ? -1 : ch, 1);
    backBtn.disabled = !history.length;
  }

  // ---------- timing that respects pause and jumps ----------
  function wait(ms, token) {
    return new Promise(function (resolve, reject) {
      var left = ms, last = performance.now();
      (function tick() {
        if (token !== runToken) return reject(CANCEL);
        var now = performance.now();
        if (playing()) left -= now - last;
        last = now;
        if (left <= 0) resolve(); else setTimeout(tick, 40);
      })();
    });
  }

  // ---------- scaling ----------
  function fit() {
    scale = screen.clientWidth / W;
    screen.querySelectorAll('iframe').forEach(function (f) { f.style.transform = 'scale(' + scale + ')'; });
  }
  if (window.ResizeObserver) new ResizeObserver(fit).observe(screen);
  window.addEventListener('resize', fit);

  // ---------- screens ----------
  // fx: 'push' | 'back' | 'up' (sheet rises) | 'down' (sheet drops away) | 'fade', or a function(doc) => fx
  function showScreen(src, fx, token, badgeText) {
    return new Promise(function (resolve, reject) {
      var next = document.createElement('div');
      next.className = 'ft-proto__layer is-loading';
      next.setAttribute('data-src', src);
      var f = document.createElement('iframe');
      f.width = W; f.height = H;
      f.style.transform = 'scale(' + scale + ')';
      setFrameAccess(f, src);
      next.appendChild(f);
      screen.insertBefore(next, finger);

      var done = false;
      function reveal() {
        if (done) return;
        done = true;
        if (token !== runToken) { next.remove(); return reject(CANCEL); }
        var sheet = next.hasAttribute('data-sheet');
        var kind = typeof fx === 'function' ? fx(sheet) : fx;
        if (reduce) kind = 'fade';
        send(next, { ft: 'mode', live: mode === 'live' });
        var old = layer;
        layer = next;
        next.classList.remove('is-loading');
        next.classList.add('is-in-' + kind);
        if (old) old.classList.add('is-out-' + kind);
        void next.offsetWidth;
        requestAnimationFrame(function () {
          next.classList.remove('is-in-' + kind);
          if (old) setTimeout(function () { old.remove(); }, 620);
          if (badgeText) flashBadge(badgeText);
          setTimeout(resolve, reduce ? 150 : 520);
        });
      }
      // the screen posts "ready" once rendered with its web font (fallback: its load event)
      next.__onReady = reveal;
      f.addEventListener('load', function () { setTimeout(reveal, 1500); });
      setTimeout(reveal, 6000);
      f.src = BASE + withProps(src);
    });
  }

  function setFrameAccess(f, src) {
    var live = mode === 'live';
    f.tabIndex = live ? 0 : -1;
    f.title = live ? 'FairTradeScore app prototype' : '';
    if (live) f.removeAttribute('aria-hidden'); else f.setAttribute('aria-hidden', 'true');
  }

  // hotspot hints: rectangles (in screen pixels) of everything that can be tapped
  function flashHotspots(rects) {
    hots.innerHTML = '';
    rects.forEach(function (r) {
      if (r[2] < 4 || r[3] < 4 || r[1] + r[3] < 0 || r[1] > H) return;
      var d = document.createElement('span');
      d.style.left = r[0] * scale + 'px';
      d.style.top = r[1] * scale + 'px';
      d.style.width = r[2] * scale + 'px';
      d.style.height = r[3] * scale + 'px';
      hots.appendChild(d);
    });
    hots.classList.remove('is-on');
    void hots.offsetWidth;
    hots.classList.add('is-on');
  }

  function flashBadge(text) {
    badge.textContent = text;
    badge.classList.add('is-on');
    setTimeout(function () { badge.classList.remove('is-on'); }, 2000);
  }

  // ---------- the finger (tour) ----------
  function moveFinger(x, y) { finger.style.transform = 'translate(' + x + 'px, ' + y + 'px)'; }

  function tap(text, token) {
    var l = layer;
    return ask(l, { ft: 'find', text: text }).then(function (r) {
      if (token !== runToken) throw CANCEL;
      if (!r) return wait(300, token);
      var x = (r[0] + r[2] / 2) * scale, y = (r[1] + r[3] / 2) * scale;
      if (!finger.classList.contains('is-on')) {
        finger.style.transition = 'none';
        moveFinger(x + 30 * scale, y + 120 * scale);
        void finger.offsetWidth;
        finger.style.transition = '';
        finger.classList.add('is-on');
      }
      moveFinger(x, y);
      return wait(reduce ? 150 : 650, token).then(function () {
        finger.classList.add('is-press');
        return wait(220, token);
      }).then(function () {
        send(l, { ft: 'click', text: text });
        finger.classList.remove('is-press');
        return wait(380, token);
      });
    });
  }

  function hideFinger() { finger.classList.remove('is-on', 'is-press'); }

  // ---------- tour ----------
  function playScene(i, token) {
    var sc = SCENES[i];
    current = i;
    tourChrome(i);
    hideFinger();
    var p = showScreen(sc.src, sc.fx || 'push', token, sc.badge);
    (sc.steps || []).forEach(function (st) {
      p = p.then(function () { return wait(st.wait, token); }).then(function () { return tap(st.tap, token); });
    });
    return p.then(function () { return wait(sc.hold || 500, token); });
  }

  function runFrom(i) {
    var token = ++runToken;
    var loop = function (k) {
      return playScene(k, token).then(function () { return loop((k + 1) % SCENES.length); });
    };
    loop(i).catch(function (e) { if (e !== CANCEL) console.warn(e); });
  }

  function goTo(i) {
    started = true;
    runFrom((i + SCENES.length) % SCENES.length);
  }

  // ---------- live prototype ----------
  function liveGo(src, fx, chapter) {
    var token = ++runToken;
    return showScreen(src, fx, token).then(liveChrome, function () { /* replaced by a newer tap */ });
  }

  // a link inside the current screen was tapped (dc-lite posts a "nav" message)
  function protoNav(href, opts) {
    if (mode !== 'live') return;
    var from = srcOf(layer);
    var fromSheet = layer && layer.hasAttribute('data-sheet');
    var back = opts && opts.back;
    var last = history[history.length - 1];
    if (back || (last && last === href)) history.pop();
    else if (from) history.push(from);
    liveGo(href, function (sheet) {
      if (sheet && !fromSheet) return 'up';
      if (fromSheet && !sheet) return 'down';
      return back || (last && last === href) ? 'back' : 'push';
    });
  };

  function setMode(m) {
    mode = m;
    root.classList.toggle('is-live', m === 'live');
    modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-proto-mode') === m ? 'true' : 'false'); });
    hintEl.textContent = m === 'live' ? LIVE_HINT : '';
    hideFinger();
    screen.querySelectorAll(".ft-proto__layer").forEach(function (l) { setFrameAccess(l.querySelector("iframe")); send(l, { ft: "mode", live: m === "live" }); });
    if (m === 'live') {
      runToken++;               // stops the tour where it is
      started = true;
      history = [];
      screen.removeAttribute('role');
      screen.removeAttribute('aria-label');
      if (layer) liveChrome(); else liveGo(START, 'fade');
    } else {
      screen.setAttribute('role', 'img');
      screen.setAttribute('aria-label', 'Walkthrough of the FairTradeScore retailer app, described in the caption beside it');
      setPlay(true);
      goTo(current);
    }
  }

  // ---------- controls ----------
  function setPlay(on) {
    wantPlay = on;
    playBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    playBtn.setAttribute('aria-label', on ? 'Pause walkthrough' : 'Play walkthrough');
    root.classList.toggle('is-paused', !on);
  }
  playBtn.addEventListener('click', function () { setPlay(!wantPlay); });
  root.querySelector('[data-proto-prev]').addEventListener('click', function () { goTo(current - 1); });
  root.querySelector('[data-proto-next]').addEventListener('click', function () { goTo(current + 1); });
  backBtn.addEventListener('click', function () {
    if (!history.length) return;
    protoNav(history[history.length - 1], { back: true });
  });
  root.querySelector('[data-proto-restart]').addEventListener('click', function () {
    history = [];
    liveGo(START, 'fade');
  });
  modeBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-proto-mode');
      if (m !== mode) setMode(m);
    });
  });
  // tapping the phone during the tour hands it over to the visitor
  screen.addEventListener('click', function () {
    if (mode !== 'tour') return;
    setMode('live');
    send(layer, { ft: "hots" });
  });
  setPlay(true);

  // start the tour (and keep it playing) only while it's on screen
  var start = function () {
    if (started) return;
    started = true;
    if (mode === 'tour') runFrom(0); else setMode('live');
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0.35 }).observe(screen);
  } else {
    visible = true;
    start();
  }
  if (mode === 'live') { root.classList.add('is-live'); }
  fit();
})();
