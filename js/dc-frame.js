// Scales real screens (iframes at their design size) to fit their container.
// Markup: <div class="dc-frame" data-w="390" data-h="844"><iframe src="..."></iframe></div>
(function () {
  var frames = document.querySelectorAll('.dc-frame[data-w][data-h]');
  if (!frames.length) return;

  var fit = function (frame) {
    var w = Number(frame.getAttribute('data-w'));
    var h = Number(frame.getAttribute('data-h'));
    var iframe = frame.querySelector('iframe');
    var width = frame.clientWidth;
    if (!iframe || !width) return;
    var scale = width / w;
    iframe.style.width = w + 'px';
    iframe.style.height = h + 'px';
    iframe.style.transform = 'scale(' + scale + ')';
    frame.style.height = (h * scale) + 'px';
  };

  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) { fit(entry.target); });
    });
    frames.forEach(function (frame) { ro.observe(frame); fit(frame); });
  } else {
    var all = function () { frames.forEach(fit); };
    window.addEventListener('resize', all);
    all();
  }

  // a frame that was hidden has no width until it is shown
  window.dcFrameFit = fit;
})();
