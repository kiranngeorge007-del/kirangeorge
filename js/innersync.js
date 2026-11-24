// Innersync case study: body map and trend chart.
// All numbers are illustrative, for a design concept.
(function () {
  var STATUS = {
    good: { label: 'Healthy', icon: 'fa-circle-check' },
    warning: { label: 'Keep an eye on it', icon: 'fa-triangle-exclamation' },
    critical: { label: 'Needs attention', icon: 'fa-circle-exclamation' }
  };

  function chip(status) {
    return '<span class="is-chip is-chip--' + status + '"><i class="fa-solid ' + STATUS[status].icon + '" aria-hidden="true"></i></span>';
  }

  /* ------------------------------------------------------------------ */
  /* 1. Body map                                                         */
  /* ------------------------------------------------------------------ */
  // Where each organ sits on the body render is defined in GEOMETRY below.
  var ORGANS = [
    {
      id: 'brain', name: 'Brain',
      steady: {
        status: 'good',
        headline: "You've had a balanced and focused week. Mental wellness is in great shape.",
        metrics: [['Average HRV', '42 ms'], ['Average sleep', '7 h']],
        tip: 'Keep screens off 30 minutes before bed for deeper sleep.'
      },
      stressed: {
        status: 'warning',
        headline: 'Stress has been high and nights have been short.',
        metrics: [['Average HRV', '31 ms'], ['Average sleep', '5.6 h']],
        tip: 'Try a 10-minute wind-down before bed. Small breaks during the day help too.'
      }
    },
    {
      id: 'thyroid', name: 'Thyroid',
      steady: {
        status: 'good',
        headline: 'Thyroid levels are steady and in range.',
        metrics: [['TSH', '2.1 mIU/L'], ['Last test', '3 months ago']],
        tip: "Your next routine check is due in 3 months. We'll remind you."
      },
      stressed: {
        status: 'warning',
        headline: 'Your TSH has been drifting upward across your last two tests.',
        metrics: [['TSH', '4.6 mIU/L'], ['Last test', '5 months ago']],
        tip: 'Consider booking a thyroid panel to see where it is heading.'
      }
    },
    {
      id: 'lungs', name: 'Lungs',
      steady: {
        status: 'good',
        headline: 'Breathing and oxygen levels look healthy.',
        metrics: [['Blood oxygen', '98%'], ['Breathing at rest', '14 / min']],
        tip: 'Your outdoor walks are paying off. Keep them up.'
      },
      stressed: {
        status: 'good',
        headline: 'Breathing and oxygen levels are still healthy.',
        metrics: [['Blood oxygen', '97%'], ['Breathing at rest', '16 / min']],
        tip: 'A few slow, deep breaths can also bring stress down.'
      }
    },
    {
      id: 'heart', name: 'Heart',
      steady: {
        status: 'warning',
        headline: "Your heart's asking for a little more care.",
        metrics: [['LDL', '128 mg/dL'], ['Resting heart rate', '72 bpm']],
        tip: 'Even 20 minutes of walking a day can do wonders for your heart. Start small, stay steady.'
      },
      stressed: {
        status: 'critical',
        headline: "Your heart's working harder than usual. Elevated readings were detected recently.",
        metrics: [['LDL', '162 mg/dL'], ['Resting heart rate', '84 bpm']],
        tip: 'Time for a little heart care: consider a lipid test and light daily movement.'
      }
    },
    {
      id: 'liver', name: 'Liver',
      steady: {
        status: 'good',
        headline: 'Liver values are in a healthy range.',
        metrics: [['ALT', '24 U/L'], ['Alcohol', '1 drink / week']],
        tip: 'Nothing to change here. Keep it up.'
      },
      stressed: {
        status: 'warning',
        headline: 'Liver values are slightly raised compared with last time.',
        metrics: [['ALT', '48 U/L'], ['Alcohol', '6 drinks / week']],
        tip: 'Swapping a few evening drinks for water would help your liver recover.'
      }
    },
    {
      id: 'kidneys', name: 'Kidneys',
      steady: {
        status: 'good',
        headline: 'Kidney function looks healthy and you are well hydrated.',
        metrics: [['eGFR', '98'], ['Water', '1.9 L / day']],
        tip: 'Keep a water bottle nearby on busy days.'
      },
      stressed: {
        status: 'warning',
        headline: "Kidney function is fine, but you haven't been drinking enough.",
        metrics: [['eGFR', '95'], ['Water', '1.1 L / day']],
        tip: 'Aim for a glass of water with every meal this week.'
      }
    }
  ];

  var mirror = document.querySelector('.is-mirror');
  if (mirror) {
    // Geometry on the prototype's body render (assets/img/portfolio/innersync/body.webp).
    //   tints:  organ patches [centre x, centre y, radius x, radius y] in image pixels
    //   anchor: where the leader line starts, in image pixels
    //   dot:    where the white dot sits, in figure units (the render starts at x = IMG_X,
    //           and only its top FIG_H px show, so y is the same in both)
    //   wave:   the two lines in the panel's mini chart
    // If the render changes size, update these numbers and the figure block in css/innersync.css.
    var IMG_W = 474, IMG_H = 961, IMG_X = 150, FIG_W = IMG_W + IMG_X * 2, FIG_H = 630;
    var GEOMETRY = {
      brain:   { tints: [[240, 42, 44, 34]], anchor: [278, 42], dot: [665, 50], wave: ['Stress', 'Sleep'] },
      thyroid: { tints: [[238, 142, 17, 19]], anchor: [224, 142], dot: [95, 130], wave: ['TSH', 'Energy'] },
      lungs:   { tints: [[200, 268, 40, 64], [282, 262, 40, 64]], anchor: [314, 248], dot: [712, 200], wave: ['Oxygen', 'Breathing'] },
      heart:   { tints: [[208, 280, 30, 42]], anchor: [192, 288], dot: [70, 305], wave: ['LDL', 'Triglycerides'] },
      liver:   { tints: [[282, 336, 42, 30]], anchor: [320, 338], dot: [712, 355], wave: ['ALT', 'Alcohol'] },
      kidneys: { tints: [[190, 386, 17, 23], [285, 386, 17, 23]], anchor: [176, 390], dot: [85, 440], wave: ['eGFR', 'Water'] }
    };

    var tintsEl = mirror.querySelector('.is-figure__tints');
    var linesEl = mirror.querySelector('.is-figure__lines');
    var dotsEl = mirror.querySelector('.is-figure__dots');
    var floatEl = mirror.querySelector('.is-float');
    var panel = mirror.querySelector('.is-panel');
    var scenarioButtons = document.querySelectorAll('.is-scenarios button');
    var scenario = 'steady';
    var selected = 'heart';
    var NS_SVG = 'http://www.w3.org/2000/svg';
    var pct = function (v, total) { return (v / total * 100) + '%'; };

    ORGANS.forEach(function (organ) {
      var g = GEOMETRY[organ.id];

      // colour patches over the organ in the render (a hue tint and a glow per patch)
      g.tintEls = [];
      g.tints.forEach(function (t) {
        [['is-tint', 1], ['is-glow', 1.3]].forEach(function (kind) {
          var cx = t[0], cy = t[1], rx = t[2] * kind[1], ry = t[3] * kind[1];
          var el = document.createElement('div');
          el.className = kind[0];
          el.style.left = pct(cx, IMG_W);
          el.style.top = pct(cy, IMG_H);
          el.style.width = pct(rx * 2, IMG_W);
          el.style.height = pct(ry * 2, IMG_H);
          // mask = the whole body image, shifted so it lines up with the render underneath
          var mx = -(cx - rx) / (rx * 2 - IMG_W) * 100;
          var my = -(cy - ry) / (ry * 2 - IMG_H) * 100;
          var mask = 'url("../assets/img/portfolio/innersync/body.webp")';
          el.style.webkitMaskImage = mask; el.style.maskImage = mask;
          el.style.webkitMaskSize = el.style.maskSize = (IMG_W / (rx * 2) * 100) + '% ' + (IMG_H / (ry * 2) * 100) + '%';
          el.style.webkitMaskPosition = el.style.maskPosition = mx + '% ' + my + '%';
          tintsEl.appendChild(el);
          g.tintEls.push(el);
        });
      });

      // leader line + a small point on the organ
      var ax = g.anchor[0] + IMG_X, ay = g.anchor[1];
      g.lineEl = document.createElementNS(NS_SVG, 'line');
      g.lineEl.setAttribute('x1', ax); g.lineEl.setAttribute('y1', ay);
      g.lineEl.setAttribute('x2', g.dot[0]); g.lineEl.setAttribute('y2', g.dot[1]);
      linesEl.appendChild(g.lineEl);
      var pin = document.createElementNS(NS_SVG, 'circle');
      pin.setAttribute('cx', ax); pin.setAttribute('cy', ay); pin.setAttribute('r', 3.5);
      linesEl.appendChild(pin);

      // the white dot you tap
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'is-dot';
      btn.style.left = pct(g.dot[0], FIG_W);
      btn.style.top = pct(g.dot[1], FIG_H);
      btn.addEventListener('click', function () {
        selected = organ.id;
        renderMirror();
      });
      dotsEl.appendChild(btn);
      g.dotEl = btn;
    });

    // Smooth illustrative wave for the panel. Calmer in a steady week, choppier when stressed.
    var wavePath = function (seed, rough) {
      var pts = [];
      for (var i = 0; i <= 24; i++) {
        var y = 36 + Math.sin(i * 0.55 + seed) * (10 + rough * 8) + Math.sin(i * 1.7 + seed * 2) * (3 + rough * 6);
        pts.push([i * 12.5, Math.max(6, Math.min(66, y))]);
      }
      var d = 'M' + pts[0][0] + ' ' + pts[0][1];
      for (var j = 1; j < pts.length; j++) {
        var mx = (pts[j - 1][0] + pts[j][0]) / 2;
        d += ' C' + mx + ' ' + pts[j - 1][1] + ' ' + mx + ' ' + pts[j][1] + ' ' + pts[j][0] + ' ' + pts[j][1];
      }
      return d;
    };

    var renderMirror = function () {
      ORGANS.forEach(function (organ, index) {
        var g = GEOMETRY[organ.id];
        var state = organ[scenario];
        var isSel = organ.id === selected;
        g.tintEls.forEach(function (t) {
          t.dataset.status = state.status;
          t.classList.toggle('is-selected', isSel);
        });
        g.lineEl.classList.toggle('is-selected', isSel);
        g.dotEl.setAttribute('aria-pressed', isSel ? 'true' : 'false');
        g.dotEl.setAttribute('aria-label', organ.name + ': ' + STATUS[state.status].label);
      });

      var organ = ORGANS.filter(function (o) { return o.id === selected; })[0];
      var g = GEOMETRY[organ.id];
      var s = organ[scenario];
      var seed = ORGANS.indexOf(organ) * 1.3;
      var rough = s.status === 'good' ? 0 : s.status === 'warning' ? 0.6 : 1;

      // floating message beside the selected dot
      floatEl.textContent = s.headline;
      floatEl.dataset.side = g.dot[0] > FIG_W / 2 ? 'right' : 'left';
      floatEl.style.left = pct(g.dot[0], FIG_W);
      floatEl.style.top = pct(g.dot[1], FIG_H);

      panel.innerHTML =
        '<p class="is-panel__organ">' + organ.name + '</p>' +
        '<span class="is-status">' + chip(s.status) + STATUS[s.status].label + '</span>' +
        '<h3>' + s.headline + '</h3>' +
        '<dl class="is-metrics">' + s.metrics.map(function (m) {
          return '<div><dt>' + m[0] + '</dt><dd>' + m[1] + '</dd></div>';
        }).join('') + '</dl>' +
        '<div class="is-wave" aria-hidden="true">' +
          '<div class="is-wave__legend"><span><i></i>' + g.wave[0] + '</span><span><i class="is-dashed"></i>' + g.wave[1] + '</span><span>Last 30 days</span></div>' +
          '<svg viewBox="0 0 300 72" preserveAspectRatio="none">' +
            '<defs><linearGradient id="isWaveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8dff" stop-opacity="0.35"/><stop offset="1" stop-color="#4f8dff" stop-opacity="0"/></linearGradient></defs>' +
            '<path class="area" d="' + wavePath(seed, rough) + ' L300 72 L0 72 Z"/>' +
            '<path d="' + wavePath(seed, rough) + '" stroke="#4f8dff"/>' +
            '<path d="' + wavePath(seed + 2.1, rough * 0.7) + '" stroke="#9cc0ff" stroke-dasharray="4 4"/>' +
          '</svg>' +
        '</div>' +
        '<p class="is-tip"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i><span>' + s.tip + '</span></p>';
    };

    scenarioButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        scenario = btn.dataset.scenario;
        scenarioButtons.forEach(function (b) {
          b.setAttribute('aria-checked', b === btn ? 'true' : 'false');
        });
        renderMirror();
      });
    });

    renderMirror();
  }

  /* ------------------------------------------------------------------ */
  /* 2. Trend chart: one marker at a time, with its healthy range        */
  /* ------------------------------------------------------------------ */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  var EVENT_INDEX = 5; // June: starts daily walks

  var MARKERS = {
    ldl: {
      title: 'LDL cholesterol', short: 'LDL', domain: [60, 180], healthy: [60, 100], bandText: 'Healthy: under 100',
      values: [148, 155, 162, 158, 150, 138, 128, 121, 112, 104, 97],
      status: function (v) { return v < 100 ? 'good' : v < 160 ? 'warning' : 'critical'; }
    },
    hdl: {
      title: 'HDL cholesterol', short: 'HDL', domain: [20, 80], healthy: [60, 80], bandText: 'Healthy: 60 and above',
      values: [41, 39, 38, 42, 44, 47, 50, 52, 55, 57, 61],
      status: function (v) { return v >= 60 ? 'good' : v >= 40 ? 'warning' : 'critical'; }
    },
    tg: {
      title: 'Triglycerides', short: 'Triglycerides', domain: [80, 240], healthy: [80, 150], bandText: 'Healthy: under 150',
      values: [182, 196, 214, 205, 188, 170, 158, 149, 141, 132, 124],
      status: function (v) { return v < 150 ? 'good' : v < 200 ? 'warning' : 'critical'; }
    },
    total: {
      title: 'Total cholesterol', short: 'Total cholesterol', domain: [140, 260], healthy: [140, 200], bandText: 'Healthy: under 200',
      values: [226, 233, 241, 238, 229, 216, 204, 196, 189, 180, 172],
      status: function (v) { return v < 200 ? 'good' : v < 240 ? 'warning' : 'critical'; }
    }
  };

  var trend = document.querySelector('.is-trend');
  if (trend) {
    var W = 720, H = 320, M = { t: 28, r: 16, b: 34, l: 44 };
    var chartEl = trend.querySelector('.is-trend__chart');
    var tooltip = chartEl.querySelector('.is-tooltip');
    var titleEl = trend.querySelector('.is-trend__title');
    var summaryEl = trend.querySelector('.is-trend__summary');
    var tableWrap = trend.querySelector('.is-table__wrap');
    var tabs = trend.querySelectorAll('.is-tabs button');
    var NS = 'http://www.w3.org/2000/svg';
    var current = 'ldl';
    var activeIndex = -1;
    var svg, points, crosshair;

    var el = function (name, attrs, parent) {
      var node = document.createElementNS(NS, name);
      Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      if (parent) parent.appendChild(node);
      return node;
    };
    var sx = function (i) { return M.l + i * (W - M.l - M.r) / (MONTHS.length - 1); };

    var drawChart = function () {
      var m = MARKERS[current];
      // draw at the real container width so text stays readable on phones
      W = Math.max(300, Math.min(900, chartEl.clientWidth || 720));
      H = W < 520 ? 260 : 320;
      var sy = function (v) {
        return M.t + (1 - (v - m.domain[0]) / (m.domain[1] - m.domain[0])) * (H - M.t - M.b);
      };

      if (svg) svg.remove();
      svg = el('svg', {
        viewBox: '0 0 ' + W + ' ' + H, role: 'img', tabindex: '0',
        'aria-label': m.title + ' by month, January to November. Use the left and right arrow keys to read each month.'
      });
      chartEl.insertBefore(svg, tooltip);

      // healthy band
      el('rect', { class: 'band', x: M.l, width: W - M.l - M.r, y: sy(m.healthy[1]), height: sy(m.healthy[0]) - sy(m.healthy[1]) }, svg);
      var bandLabel = el('text', { class: 'band-label', x: W - M.r - 6, y: sy(m.healthy[1]) + 16, 'text-anchor': 'end' }, svg);
      bandLabel.textContent = m.bandText;

      // grid + y axis
      var grid = el('g', { class: 'grid' }, svg);
      var axis = el('g', { class: 'axis' }, svg);
      var step = (m.domain[1] - m.domain[0]) / 4;
      for (var t = 0; t <= 4; t++) {
        var v = m.domain[0] + step * t;
        el('line', { x1: M.l, x2: W - M.r, y1: sy(v), y2: sy(v) }, grid);
        var label = el('text', { x: M.l - 8, y: sy(v) + 4, 'text-anchor': 'end' }, axis);
        label.textContent = Math.round(v);
      }
      MONTHS.forEach(function (mo, i) {
        var lbl = el('text', { x: sx(i), y: H - 10, 'text-anchor': 'middle' }, axis);
        lbl.textContent = mo;
      });

      // event marker
      var ev = el('g', { class: 'event' }, svg);
      el('line', { x1: sx(EVENT_INDEX), x2: sx(EVENT_INDEX), y1: M.t - 6, y2: H - M.b }, ev);
      var evText = el('text', { x: sx(EVENT_INDEX) + 6, y: M.t - 10 }, ev);
      evText.textContent = 'Starts daily walks';

      // crosshair (hidden until hover)
      crosshair = el('line', { class: 'crosshair', y1: M.t, y2: H - M.b, visibility: 'hidden' }, svg);

      // line
      el('path', {
        class: 'line',
        d: m.values.map(function (v, i) { return (i ? 'L' : 'M') + sx(i) + ' ' + sy(v); }).join(' ')
      }, svg);

      // points coloured by status
      points = m.values.map(function (v, i) {
        var st = m.status(v);
        return el('circle', { class: 'pt', cx: sx(i), cy: sy(v), r: 5.5, fill: 'var(--is-' + st + ')' }, svg);
      });

      // wide hit targets, one per month
      var colW = (W - M.l - M.r) / (MONTHS.length - 1);
      MONTHS.forEach(function (mo, i) {
        var hit = el('rect', { class: 'hit', x: sx(i) - colW / 2, y: M.t, width: colW, height: H - M.t - M.b }, svg);
        hit.addEventListener('mouseenter', function () { setActive(i); });
        hit.addEventListener('click', function () { setActive(i); });
      });
      svg.addEventListener('mouseleave', function () { setActive(-1); });
      svg.addEventListener('blur', function () { setActive(-1); });
      svg.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var next = activeIndex < 0 ? 0 : activeIndex + (e.key === 'ArrowRight' ? 1 : -1);
          setActive(Math.max(0, Math.min(MONTHS.length - 1, next)));
        }
      });

      activeIndex = -1;
      setActive(-1);

      // title, summary, table
      titleEl.textContent = m.title;
      var first = m.values[0], last = m.values[m.values.length - 1];
      var lastStatus = m.status(last);
      summaryEl.innerHTML = chip(lastStatus) + ' ' + STATUS[lastStatus].label + ' now. From ' + first + ' in January to ' + last + ' in November.';
      tableWrap.innerHTML =
        '<table><thead><tr><th>Month</th><th>' + m.short + ' (mg/dL)</th><th>Status</th></tr></thead><tbody>' +
        m.values.map(function (v, i) {
          return '<tr><td>' + MONTHS[i] + '</td><td>' + v + '</td><td>' + STATUS[m.status(v)].label + '</td></tr>';
        }).join('') + '</tbody></table>';
    };

    var setActive = function (i) {
      if (i === activeIndex && i !== -1) return;
      activeIndex = i;
      points.forEach(function (p, j) { p.classList.toggle('is-active', j === i); });
      if (i < 0) {
        crosshair.setAttribute('visibility', 'hidden');
        tooltip.hidden = true;
        return;
      }
      var m = MARKERS[current];
      var v = m.values[i];
      var st = m.status(v);
      crosshair.setAttribute('x1', sx(i));
      crosshair.setAttribute('x2', sx(i));
      crosshair.setAttribute('visibility', 'visible');

      var scale = svg.getBoundingClientRect().width / W;
      var cy = Number(points[i].getAttribute('cy'));
      tooltip.innerHTML = MONTHS[i] + '<strong>' + v + ' mg/dL</strong>' + chip(st) + STATUS[st].label;
      tooltip.hidden = false;
      var left = sx(i) * scale;
      var half = tooltip.offsetWidth / 2;
      left = Math.max(half, Math.min(chartEl.clientWidth - half, left));
      tooltip.style.left = left + 'px';
      tooltip.style.top = (cy * scale) + 'px';
    };

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        current = tab.dataset.marker;
        tabs.forEach(function (t) { t.setAttribute('aria-selected', t === tab ? 'true' : 'false'); });
        drawChart();
      });
    });

    var lastWidth = chartEl.clientWidth;
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (chartEl.clientWidth !== lastWidth) {
          lastWidth = chartEl.clientWidth;
          drawChart();
        }
      }, 150);
    });

    drawChart();
  }
})();
