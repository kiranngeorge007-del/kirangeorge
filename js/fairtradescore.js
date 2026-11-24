// FairTradeScore case study: switch the phone between the three score stages.
(function () {
  var buttons = document.querySelectorAll('.ft-switch [data-stage]');
  if (!buttons.length) return;
  var frames = document.querySelectorAll('[data-stage-frame]');
  var infos = document.querySelectorAll('.ft-stage-info [data-info]');

  var show = function (stage) {
    buttons.forEach(function (b) {
      b.setAttribute('aria-selected', b.getAttribute('data-stage') === stage ? 'true' : 'false');
    });
    frames.forEach(function (f) {
      var on = f.getAttribute('data-stage-frame') === stage;
      f.hidden = !on;
      if (on && window.dcFrameFit) window.dcFrameFit(f);
    });
    infos.forEach(function (i) { i.hidden = i.getAttribute('data-info') !== stage; });
  };

  buttons.forEach(function (b, idx) {
    b.addEventListener('click', function () { show(b.getAttribute('data-stage')); });
    // arrow keys move between the stage tabs
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var next = buttons[(idx + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      show(next.getAttribute('data-stage'));
    });
  });
})();
