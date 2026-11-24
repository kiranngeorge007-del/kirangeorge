// Space home page: one fixed canvas behind the whole page.
// Scroll through the journey section to fly from deep space, into the Milky Way,
// down to the solar system, where the projects begin.
(function () {
  var canvas = document.getElementById('sp-canvas');
  var journey = document.querySelector('.sp-journey');
  if (!canvas || !journey || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var intro = document.querySelector('.sp-intro');
  var cue = document.querySelector('.sp-cue');
  var labelGalaxy = document.querySelector('.sp-label--galaxy');
  var labelSun = document.querySelector('.sp-label--sun');

  var W = 0, H = 0, DPR = 1, isSmall = false;
  var mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  /* ---------------- helpers ---------------- */
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  // smooth 0 -> 1 as p goes from a to b
  var ramp = function (a, b, p) {
    var t = clamp((p - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  // simple seeded random, so the galaxy looks the same on every visit
  var seed = 7;
  var srand = function () {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  var gauss = function () { return (srand() + srand() + srand() - 1.5) / 1.5; };

  /* ---------------- stars (3D, so the camera can fly through them) ---------------- */
  var stars = [];
  var makeStars = function () {
    var count = Math.round(clamp(W * H / 1500, 350, 1100));
    stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: rand(-1, 1),
        y: rand(-1, 1),
        z: Math.random(),            // depth, wraps as the camera moves
        s: rand(0.4, 1.3),           // size
        tw: rand(0.6, 2.2),          // twinkle speed
        ph: rand(0, Math.PI * 2),
        warm: Math.random() < 0.15   // a few warm-tinted stars
      });
    }
  };

  /* ---------------- faint nebula haze, drawn once ---------------- */
  var haze = document.createElement('canvas');
  var makeHaze = function () {
    haze.width = Math.max(1, Math.round(W / 2));
    haze.height = Math.max(1, Math.round(H / 2));
    var h = haze.getContext('2d');
    var blobs = [
      [0.78, 0.25, 0.55, 'rgba(150,160,190,0.07)'],
      [0.15, 0.7, 0.5, 'rgba(120,130,160,0.05)'],
      [0.55, 0.85, 0.45, 'rgba(170,165,180,0.04)'],
      [0.35, 0.2, 0.35, 'rgba(140,150,175,0.035)']
    ];
    h.clearRect(0, 0, haze.width, haze.height);
    blobs.forEach(function (b) {
      var r = b[2] * Math.max(haze.width, haze.height);
      var g = h.createRadialGradient(b[0] * haze.width, b[1] * haze.height, 0, b[0] * haze.width, b[1] * haze.height, r);
      g.addColorStop(0, b[3]);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      h.fillStyle = g;
      h.fillRect(0, 0, haze.width, haze.height);
    });
  };

  /* ---------------- the Milky Way: a silver particle spiral, drawn once ---------------- */
  var galaxy = document.createElement('canvas');
  var galaxyTarget = { x: 0, y: 0 }; // a point on an arm the camera zooms into (our Sun)
  var makeGalaxy = function () {
    var S = isSmall ? 640 : 1000;
    galaxy.width = galaxy.height = S;
    var g = galaxy.getContext('2d');
    var c = S / 2, R = S * 0.46;
    seed = 7;
    g.clearRect(0, 0, S, S);
    g.globalCompositeOperation = 'lighter';

    // soft disc glow
    var disc = g.createRadialGradient(c, c, 0, c, c, R);
    disc.addColorStop(0, 'rgba(255,245,230,0.35)');
    disc.addColorStop(0.15, 'rgba(220,215,230,0.12)');
    disc.addColorStop(0.6, 'rgba(160,170,200,0.04)');
    disc.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = disc;
    g.fillRect(0, 0, S, S);

    var arms = 2, perArm = isSmall ? 3200 : 6000;
    for (var a = 0; a < arms; a++) {
      var offset = a * Math.PI;
      for (var i = 0; i < perArm; i++) {
        var t = Math.pow(srand(), 0.85);           // 0 = core, 1 = rim
        var theta = t * Math.PI * 3.1;             // how far round the spiral
        var r = (0.06 + t * 0.94) * R;
        var spread = (0.04 + t * 0.14) * R;
        var ang = theta + offset;
        var x = c + Math.cos(ang) * r + gauss() * spread;
        var y = c + Math.sin(ang) * r + gauss() * spread;
        var bright = srand();
        var alpha = (0.15 + bright * 0.55) * (1 - t * 0.55);
        var tint = t < 0.25 ? '255,240,220' : (bright > 0.85 ? '200,215,255' : '225,228,240');
        g.fillStyle = 'rgba(' + tint + ',' + alpha.toFixed(3) + ')';
        var size = bright > 0.97 ? 1.8 : 1;
        g.fillRect(x, y, size, size);
      }
    }
    // the Sun sits about 60% of the way out on an arm
    var tSun = 0.62, thSun = tSun * Math.PI * 3.1;
    galaxyTarget.x = Math.cos(thSun) * (0.06 + tSun * 0.94) * R;
    galaxyTarget.y = Math.sin(thSun) * (0.06 + tSun * 0.94) * R;

    // diffuse field stars and a bright core
    for (var j = 0; j < (isSmall ? 1500 : 3000); j++) {
      var rr = Math.abs(gauss()) * R * 0.9;
      var aa = srand() * Math.PI * 2;
      g.fillStyle = 'rgba(210,215,235,' + (0.05 + srand() * 0.2).toFixed(3) + ')';
      g.fillRect(c + Math.cos(aa) * rr, c + Math.sin(aa) * rr, 1, 1);
    }
    var core = g.createRadialGradient(c, c, 0, c, c, R * 0.22);
    core.addColorStop(0, 'rgba(255,250,240,0.9)');
    core.addColorStop(0.3, 'rgba(255,235,210,0.35)');
    core.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = core;
    g.fillRect(0, 0, S, S);
    g.globalCompositeOperation = 'source-over';
  };

  /* ---------------- the solar system ---------------- */
  // r = orbit size (share of the system radius), s = planet size, period in seconds
  var PLANETS = [
    { r: 0.13, s: 1.6, c: '#b8b3ab', period: 18 },
    { r: 0.19, s: 2.6, c: '#e6d2a6', period: 30 },
    { r: 0.26, s: 2.8, c: '#6fa6dc', period: 45, earth: true },
    { r: 0.33, s: 2.2, c: '#d48352', period: 70 },
    { r: 0.48, s: 6.2, c: '#d8b88f', period: 140 },
    { r: 0.63, s: 5.2, c: '#e3d4a8', period: 220, ring: true },
    { r: 0.79, s: 3.8, c: '#a7dde4', period: 320 },
    { r: 0.94, s: 3.7, c: '#7393e0', period: 420 }
  ];
  PLANETS.forEach(function (pl, i) { pl.phase = i * 2.1 + 0.6; });
  var TILT = 0.34; // orbits seen at an angle

  var drawSolar = function (cx, cy, scale, alpha, time) {
    if (alpha <= 0.01) return;
    // on tall phone screens the outer orbits are allowed to run off the sides
    var R = Math.min(W * (H > W ? 0.66 : 0.46), H * 1.15) * scale;
    var unit = clamp(Math.min(W, H) / 700, 0.6, 1.5) * scale;
    ctx.save();
    ctx.globalAlpha = alpha;

    // orbits
    ctx.lineWidth = 1;
    PLANETS.forEach(function (pl) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (pl.earth ? 0.22 : 0.1) + ')';
      ctx.beginPath();
      ctx.ellipse(cx, cy, pl.r * R, pl.r * R * TILT, 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    // planet positions
    var placed = PLANETS.map(function (pl) {
      var ang = pl.phase + (time / pl.period) * Math.PI * 2;
      return { pl: pl, x: cx + Math.cos(ang) * pl.r * R, y: cy + Math.sin(ang) * pl.r * R * TILT, back: Math.sin(ang) < 0 };
    });

    var drawPlanet = function (p) {
      var rad = Math.max(1, p.pl.s * unit);
      // lit from the Sun's side
      var dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) || 1;
      var grad = ctx.createRadialGradient(p.x + dx / d * rad * 0.5, p.y + dy / d * rad * 0.5, rad * 0.1, p.x, p.y, rad);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.25, p.pl.c);
      grad.addColorStop(1, 'rgba(10,10,16,1)');
      if (p.pl.ring) {
        ctx.strokeStyle = 'rgba(230,215,180,0.55)';
        ctx.lineWidth = Math.max(0.8, rad * 0.22);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, rad * 2.1, rad * 0.7, -0.35, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
      if (p.pl.earth) {
        ctx.fillStyle = 'rgba(111,166,220,0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    placed.filter(function (p) { return p.back; }).forEach(drawPlanet);

    // the Sun
    var sunR = 9 * unit;
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, sunR * 9);
    glow.addColorStop(0, 'rgba(255,240,210,0.55)');
    glow.addColorStop(0.15, 'rgba(255,215,160,0.18)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, sunR * 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff6e6';
    ctx.beginPath();
    ctx.arc(cx, cy, sunR, 0, Math.PI * 2);
    ctx.fill();

    placed.filter(function (p) { return !p.back; }).forEach(drawPlanet);
    ctx.restore();
  };

  /* ---------------- shooting stars and tiny comets ---------------- */
  var streaks = [];
  var nextShooting = 1.5, nextComet = 5;
  var spawnShooting = function () {
    var ang = rand(2.4, 2.9); // heading down and to the left
    streaks.push({
      x: rand(W * 0.3, W * 1.05), y: rand(-H * 0.05, H * 0.45),
      vx: Math.cos(ang), vy: Math.sin(ang),
      speed: rand(900, 1500), len: rand(110, 220), life: rand(0.5, 0.9), age: 0, width: rand(0.8, 1.4), comet: false
    });
  };
  var spawnComet = function () {
    var fromLeft = Math.random() < 0.5;
    var ang = fromLeft ? rand(0.15, 0.45) : rand(Math.PI - 0.45, Math.PI - 0.15);
    streaks.push({
      x: fromLeft ? rand(-W * 0.05, W * 0.3) : rand(W * 0.7, W * 1.05), y: rand(H * 0.05, H * 0.6),
      vx: Math.cos(ang), vy: Math.sin(ang),
      speed: rand(60, 120), len: rand(35, 70), life: rand(7, 11), age: 0, width: rand(1, 1.6), comet: true
    });
  };
  var drawStreaks = function (dt) {
    for (var i = streaks.length - 1; i >= 0; i--) {
      var s = streaks[i];
      s.age += dt;
      s.x += s.vx * s.speed * dt;
      s.y += s.vy * s.speed * dt;
      if (s.age > s.life) { streaks.splice(i, 1); continue; }
      var lifeT = s.age / s.life;
      var fade = s.comet ? Math.sin(lifeT * Math.PI) : (lifeT < 0.2 ? lifeT / 0.2 : 1 - (lifeT - 0.2) / 0.8);
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

  /* ---------------- scroll progress ---------------- */
  var journeyTop = 0, journeyLen = 1;
  var measure = function () {
    var rect = journey.getBoundingClientRect();
    journeyTop = rect.top + window.scrollY;
    journeyLen = Math.max(1, journey.offsetHeight - H);
  };

  /* ---------------- sizing ---------------- */
  var lastW = 0;
  var resize = function () {
    W = window.innerWidth;
    H = window.innerHeight;
    isSmall = W < 768;
    DPR = Math.min(window.devicePixelRatio || 1, isSmall ? 1.25 : 1.5);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    // phones resize the viewport while scrolling (address bar); only rebuild on width changes
    if (Math.abs(W - lastW) > 40 || !stars.length) {
      makeStars();
      makeGalaxy();
      lastW = W;
    }
    makeHaze();
    measure();
  };

  /* ---------------- one frame ---------------- */
  var camZ = 0, lastCamZ = 0, time = 0, lastNow = 0;
  var frame = function (now) {
    var dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
    lastNow = now;
    if (!reduceMotion) time += dt;

    var scrollY = window.scrollY;
    var p = reduceMotion ? 0 : clamp((scrollY - journeyTop) / journeyLen, 0, 1);
    var after = Math.max(0, scrollY - (journeyTop + journeyLen)); // px scrolled past the journey
    var cx = W / 2, cy = H / 2;

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    ctx.clearRect(0, 0, W, H);

    // haze, drifting a little with scroll
    ctx.globalAlpha = 1 - ramp(0.3, 0.6, p) * 0.5;
    ctx.drawImage(haze, 0, -((scrollY * 0.03) % H), W, H);
    ctx.drawImage(haze, 0, H - ((scrollY * 0.03) % H), W, H);
    ctx.globalAlpha = 1;

    // camera flies forward through the stars during the journey
    camZ = (reduceMotion ? 0 : 2.4 * ramp(0.03, 0.74, p)) + time * 0.004;
    var speed = Math.abs(camZ - lastCamZ);
    lastCamZ = camZ;
    var streak = clamp(speed * 900, 0, 26);
    var fov = Math.max(W, H) * 0.55;

    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var z = (st.z - camZ) % 1;
      if (z <= 0) z += 1;
      if (z < 0.03) continue;
      var px = cx + (st.x * fov) / z + mouse.x * (1 - z) * 14;
      var py = cy + (st.y * fov) / z + mouse.y * (1 - z) * 14 - after * 0.06 * (1 - z);
      if (px < -20 || px > W + 20 || py < -20 || py > H + 20) continue;
      var near = 1 - z;
      var tw = reduceMotion ? 1 : 0.7 + 0.3 * Math.sin(time * st.tw + st.ph);
      var a = clamp((0.35 + near * 0.8) * tw, 0, 1);
      var size = st.s * (0.75 + near * 1.6);
      ctx.fillStyle = st.warm ? 'rgba(255,232,205,' + a.toFixed(3) + ')' : 'rgba(235,240,255,' + a.toFixed(3) + ')';
      if (streak > 1.5) {
        // light streaks pointing away from the centre while flying
        var dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy) || 1;
        var l = streak * near * (d / fov);
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - dx / d * l, py - dy / d * l);
        ctx.stroke();
      } else {
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }

    // the Milky Way: appears, grows, then the camera dives into one of its arms
    // (zoom is capped at 6x: past that the particles blur, so the streaking stars take over)
    var gA = reduceMotion ? 0 : ramp(0.08, 0.3, p) * (1 - ramp(0.52, 0.64, p));
    if (gA > 0.01) {
      var base = Math.min(W * (H > W ? 1.5 : 0.95), H * 1.7) / galaxy.width;
      var zoomT = ramp(0.44, 0.66, p);
      var gs = base * (p < 0.44 ? lerp(0.12, 1, ramp(0.06, 0.42, p)) : Math.pow(6, zoomT));
      var spin = -0.35 + time * 0.008 + p * 0.5;
      var squash = 0.45, tilt = -0.3;
      // where the Sun's point lands on screen, so we can steer it to the centre while zooming
      var tx = galaxyTarget.x * Math.cos(spin) - galaxyTarget.y * Math.sin(spin);
      var ty = (galaxyTarget.x * Math.sin(spin) + galaxyTarget.y * Math.cos(spin)) * squash;
      var sx = (tx * Math.cos(tilt) - ty * Math.sin(tilt)) * gs;
      var sy = (tx * Math.sin(tilt) + ty * Math.cos(tilt)) * gs;
      var steer = zoomT * zoomT * (3 - 2 * zoomT);
      ctx.save();
      ctx.globalAlpha = gA;
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(cx - sx * steer + mouse.x * 8, cy - sy * steer + mouse.y * 8);
      ctx.rotate(tilt);
      ctx.scale(gs, gs * squash);
      ctx.rotate(spin);
      ctx.drawImage(galaxy, -galaxy.width / 2, -galaxy.height / 2);
      ctx.restore();
    }

    // the solar system: emerges where we dived in, then settles behind the projects
    var sA = reduceMotion ? 0.45 : ramp(0.58, 0.8, p);
    var sScale = reduceMotion ? 1 : lerp(0.2, 1, 1 - Math.pow(1 - ramp(0.56, 0.9, p), 3));
    var settle = clamp(after / H, 0, 1);
    drawSolar(cx + mouse.x * 6, cy - after * 0.4 + mouse.y * 6, sScale, sA * (1 - settle * 0.7), reduceMotion ? 40 : time);

    // shooting stars and comets
    if (!reduceMotion && !document.hidden) {
      nextShooting -= dt;
      nextComet -= dt;
      if (nextShooting <= 0) { spawnShooting(); nextShooting = rand(2, 5.5); }
      if (nextComet <= 0) { spawnComet(); nextComet = rand(8, 15); }
      drawStreaks(dt);
    }

    // captions and the intro
    if (!reduceMotion) {
      var introOut = ramp(0.03, 0.18, p);
      intro.style.opacity = (1 - introOut).toFixed(3);
      intro.style.transform = 'translateY(' + (-introOut * 40).toFixed(1) + 'px)';
      intro.style.visibility = introOut > 0.98 ? 'hidden' : 'visible';
      cue.style.opacity = (1 - ramp(0, 0.05, p)).toFixed(3);
      labelGalaxy.style.opacity = (ramp(0.26, 0.34, p) * (1 - ramp(0.48, 0.56, p))).toFixed(3);
      labelSun.style.opacity = (ramp(0.84, 0.93, p) * (1 - clamp(after / (H * 0.35), 0, 1))).toFixed(3);
    }

    clearNavInSpace();
    if (!reduceMotion) requestAnimationFrame(frame);
  };

  /* ---------------- nav: nothing is "active" while you're still in space ---------------- */
  var portfolio = document.getElementById('portfolio');
  var navLinks = document.querySelectorAll('#mainNav .nav-link');
  // (Bootstrap's scrollspy marks "Portfolio" active at the top; this runs each frame to undo that)
  var clearNavInSpace = function () {
    if (portfolio && window.scrollY < portfolio.offsetTop - 140) {
      navLinks.forEach(function (link) {
        if (link.classList.contains('active')) link.classList.remove('active');
      });
    }
  };

  /* ---------------- wiring ---------------- */
  resize();
  window.addEventListener('resize', function () { resize(); if (reduceMotion) frame(performance.now()); });
  window.addEventListener('load', measure);
  if (!reduceMotion) {
    window.addEventListener('mousemove', function (e) {
      mouse.tx = (e.clientX / W - 0.5) * 2;
      mouse.ty = (e.clientY / H - 0.5) * 2;
    }, { passive: true });
    requestAnimationFrame(frame);
  } else {
    labelSun.style.opacity = 0;
    window.addEventListener('scroll', function () { frame(performance.now()); }, { passive: true });
    frame(performance.now());
  }
})();
