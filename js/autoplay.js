// Keeps muted cover videos playing on phones.
// Phones sometimes refuse the autoplay attribute (iOS Low Power Mode, Android battery or
// data saver, or a video that loaded while off-screen) and show a play button instead.
// This asks again whenever it may now be allowed: when the video can play, when it scrolls
// into view, when the tab comes back, and on the first tap anywhere on the page.
(function () {
  var vids = Array.prototype.slice.call(document.querySelectorAll('video[autoplay]'));
  if (!vids.length) return;

  function prep(v) {
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('webkit-playsinline', '');
    v.controls = false;
    v.disableRemotePlayback = true;
  }

  function tryPlay(v) {
    if (!v.paused || v.__offscreen) return;
    var p = v.play();
    if (p && p.catch) p.catch(function () { /* still blocked: the poster stays, we ask again later */ });
  }

  function playAll() { vids.forEach(tryPlay); }

  vids.forEach(function (v) {
    prep(v);
    v.addEventListener('loadeddata', function () { tryPlay(v); });
    v.addEventListener('canplay', function () { tryPlay(v); });
    // some browsers pause it on their own (e.g. after a power-saving check): start it again
    v.addEventListener('pause', function () { if (!v.__offscreen && !document.hidden) setTimeout(function () { tryPlay(v); }, 300); });
    tryPlay(v);
  });

  // play while on screen, pause while off it (saves battery, and phones allow it more readily)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        v.__offscreen = !e.isIntersecting;
        if (e.isIntersecting) tryPlay(v); else if (!v.paused) v.pause();
      });
    }, { threshold: 0.1 });
    vids.forEach(function (v) { io.observe(v); });
  }

  document.addEventListener('visibilitychange', function () { if (!document.hidden) playAll(); });
  window.addEventListener('pageshow', playAll);

  // when autoplay is blocked outright, a tap counts as permission to play
  ['touchend', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, playAll, { passive: true });
  });
})();
