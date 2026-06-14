const apng1 = document.getElementById('apng1');
const apng2 = document.getElementById('apng2');
const apng3 = document.getElementById('apng3');

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;

  if (scrollY < 1000) {
    apng1.classList.add('active');
    apng2.classList.remove('active');
    apng3.classList.remove('active');
  } else if (scrollY >= 1000 && scrollY < 3000) {
    apng1.classList.remove('active');
    apng2.classList.add('active');
    apng3.classList.remove('active');
  } else {
    apng1.classList.remove('active');
    apng2.classList.remove('active');
    apng3.classList.add('active');
  }
});

