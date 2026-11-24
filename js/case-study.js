// Case study page behaviour (Algorithmic Eclipse)
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Hero: the dark disc starts as a full eclipse and slides off the light as you scroll.
  var hero = document.querySelector('.ae-hero');
  var heroEclipse = document.querySelector('.ae-eclipse--hero');
  if (hero && heroEclipse) {
    if (reduceMotion) {
      heroEclipse.style.setProperty('--offset', 14);
    } else {
      var ticking = false;
      var updateHero = function () {
        var progress = window.scrollY / (hero.offsetHeight * 0.7);
        progress = Math.min(Math.max(progress, 0), 1);
        heroEclipse.style.setProperty('--offset', (progress * 48).toFixed(2));
        ticking = false;
      };
      window.addEventListener('scroll', function () {
        if (!ticking) {
          ticking = true;
          window.requestAnimationFrame(updateHero);
        }
      }, { passive: true });
      updateHero();
    }
  }

  // 2. Live demo: three scores move the eclipse.
  //    Simplified rule: high influence, low diversity and low curiosity all cover the light.
  var demo = document.querySelector('.ae-demo');
  if (demo) {
    var demoEclipse = demo.querySelector('.ae-eclipse');
    var inputs = demo.querySelectorAll('input[type="range"]');
    var status = demo.querySelector('.ae-demo__status');
    var lastMessage = '';

    var render = function () {
      var scores = {};
      inputs.forEach(function (input) {
        var value = Number(input.value);
        scores[input.dataset.score] = value;
        input.style.setProperty('--val', value + '%');
        var output = demo.querySelector('output[for="' + input.id + '"]');
        if (output) output.textContent = value + '%';
      });

      var cover = (scores.influence + (100 - scores.diversity) + (100 - scores.curiosity)) / 3;
      demoEclipse.style.setProperty('--offset', ((100 - cover) * 0.75).toFixed(2));

      var message = cover > 66
        ? 'The algorithm is leading. Most of the light is covered.'
        : cover > 33
          ? 'A partial eclipse. You and the algorithm share the wheel.'
          : 'Mostly your own choices. The light comes through.';
      if (message !== lastMessage) {
        status.textContent = message;
        lastMessage = message;
      }
    };

    inputs.forEach(function (input) {
      input.addEventListener('input', render);
    });
    render();
  }

  // 3. Navbar shadow on scroll, same as the home page.
  var nav = document.querySelector('#mainNav');
  if (nav) {
    var shrink = function () {
      nav.classList.toggle('navbar-shrink', window.scrollY > 0);
    };
    document.addEventListener('scroll', shrink, { passive: true });
    shrink();
  }
})();
