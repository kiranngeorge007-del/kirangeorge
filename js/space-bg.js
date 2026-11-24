// Space background for the case-study pages: the same sky as the home page, minus the
// fly-through. One fixed canvas behind the page: twinkling stars in three depths that
// drift with scroll and the mouse, a faint haze, shooting stars and slow little comets.
(function () {
  var canvas = document.getElementById('sp-canvas');
  if (!canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, DPR = 1;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  /* ---------- stars: x/y in 0..1, z = depth (near stars move more) ---------- */
  var stars = [];
  var makeStars = function () {
    var count = Math.round(clamp(W * H / 1700, 260, 900));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random(), y: Math.random(),
        z: Math.pow(Math.random(), 1.6),   // most stars far away
        s: rand(0.4, 1.25),
        tw: rand(0.6, 2.2), ph: rand(0, Math.PI * 2),
        warm: Math.random() < 0.15
      });
    }
  };

  /* ---------- faint haze, drawn once ---------- */
  var haze = document.createElement('canvas');
  var makeHaze = function () {
    haze.width = Math.max(1, Math.round(W / 2));
    haze.height = Math.max(1, Math.round(H / 2));
    var h = haze.getContext('2d');
    h.clearRect(0, 0, haze.width, haze.height);
    [[0.8, 0.2, 0.55, 'rgba(150,160,190,0.06)'], [0.12, 0.75, 0.5, 'rgba(120,130,160,0.045)'], [0.5, 0.95, 0.4, 'rgba(170,165,180,0.035)']].forEach(function (b) {
      var r = b[2] * Math.max(haze.width, haze.height);
      var g = h.createRadialGradient(b[0] * haze.width, b[1] * haze.height, 0, b[0] * haze.width, b[1] * haze.height, r);
      g.addColorStop(0, b[3]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      h.fillStyle = g;
      h.fillRect(0, 0, haze.width, haze.height);
    });
  };

  /* ---------- shooting stars and comets ---------- */
  var streaks = [];
  var nextShooting = 2.5, nextComet = 6;
  var spawnShooting = function () {
    var ang = rand(2.4, 2.9);
    streaks.push({ x: rand(W * 0.3, W * 1.05), y: rand(-H * 0.05, H * 0.45), vx: Math.cos(ang), vy: Math.sin(ang),
      speed: rand(900, 1500), len: rand(110, 220), life: rand(0.5, 0.9), age: 0, width: rand(0.8, 1.4), comet: false });
  };
  var spawnComet = function () {
    var fromLeft = Math.random() < 0.5;
    var ang = fromLeft ? rand(0.15, 0.45) : rand(Math.PI - 0.45, Math.PI - 0.15);
    streaks.push({ x: fromLeft ? rand(-W * 0.05, W * 0.3) : rand(W * 0.7, W * 1.05), y: rand(H * 0.05, H * 0.6), vx: Math.cos(ang), vy: Math.sin(ang),
      speed: rand(60, 120), len: rand(35, 70), life: rand(7, 11), age: 0, width: rand(1, 1.6), comet: true });
  };
  var drawStreaks = function (dt) {
    for (var i = streaks.length - 1; i >= 0; i--) {
      var s = streaks[i];
      s.age += dt;
      s.x += s.vx * s.speed * dt;
      s.y += s.vy * s.speed * dt;
      if (s.age > s.life) { streaks.splice(i, 1); continue; }
      var t = s.age / s.life;
      var fade = s.comet ? Math.sin(t * Math.PI) : (t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8);
      var tx = s.x - s.vx * s.len, ty = s.y - s.vy * s.len;
      var grad = ctx.createLinearGradient(s.x, s.y, tx, ty);
      grad.addColorStop(0, 'rgba(255,255,255,' + (0.9 * fade).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(180,200,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = s.width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      if (s.comet) {
        var head = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 6);
        head.addColorStop(0, 'rgba(230,240,255,' + (0.8 * fade).toFixed(3) + ')');
        head.addColorStop(1, 'rgba(150,180,255,0)');
        ctx.fillStyle = head;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  /* ---------- sizing ---------- */
  var lastW = 0;
  var resize = function () {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, W < 768 ? 1.25 : 1.5);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // phones resize the viewport while scrolling (address bar): rebuild only on width changes
    if (Math.abs(W - lastW) > 40 || !stars.length) { makeStars(); lastW = W; }
    makeHaze();
  };

  /* ---------- one frame ---------- */
  var time = 0, lastNow = 0;
  var frame = function (now) {
    var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    if (!reduceMotion) time += dt;
    var scrollY = window.scrollY;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    ctx.clearRect(0, 0, W, H);
    var hy = (scrollY * 0.02) % H;
    ctx.drawImage(haze, 0, -hy, W, H);
    ctx.drawImage(haze, 0, H - hy, W, H);

    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var depth = 0.15 + st.z * 0.85;
      // scroll parallax: nearer stars slide up faster; plus a very slow drift
      var py = (st.y * H - scrollY * 0.12 * depth - time * 3 * depth) % H;
      if (py < 0) py += H;
      var px = st.x * W + mouse.x * depth * 12;
      py += mouse.y * depth * 12;
      var tw = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(time * st.tw + st.ph);
      var a = clamp((0.3 + depth * 0.7) * tw, 0, 1);
      var size = st.s * (0.7 + depth * 1.3);
      ctx.fillStyle = st.warm ? 'rgba(255,232,205,' + a.toFixed(3) + ')' : 'rgba(235,240,255,' + a.toFixed(3) + ')';
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }

    if (!reduceMotion && !document.hidden) {
      nextShooting -= dt;
      nextComet -= dt;
      if (nextShooting <= 0) { spawnShooting(); nextShooting = rand(3, 7); }
      if (nextComet <= 0) { spawnComet(); nextComet = rand(9, 16); }
      drawStreaks(dt);
    }
    if (!reduceMotion) requestAnimationFrame(frame);
  };

  /* ---------- the nav turns to glass once you scroll ---------- */
  var nav = document.getElementById('mainNav');
  var navState = function () { if (nav) nav.classList.toggle('navbar-shrink', window.scrollY > 40); };
  window.addEventListener('scroll', navState, { passive: true });
  navState();

  /* ---------- wiring ---------- */
  resize();
  window.addEventListener('resize', function () { resize(); if (reduceMotion) frame(performance.now()); });
  if (!reduceMotion) {
    window.addEventListener('mousemove', function (e) {
      mouse.tx = (e.clientX / W - 0.5) * 2;
      mouse.ty = (e.clientY / H - 0.5) * 2;
    }, { passive: true });
    requestAnimationFrame(frame);
  } else {
    window.addEventListener('scroll', function () { frame(performance.now()); }, { passive: true });
    frame(performance.now());
  }
})();
