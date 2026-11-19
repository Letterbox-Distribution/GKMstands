const strip = document.querySelector('.workplace-client-strip');
const toggle = strip.querySelector('.workplace-client-motion');

strip.classList.add('can-scroll');
toggle.hidden = false;
toggle.addEventListener('click', () => {
  const paused = strip.classList.toggle('is-paused');
  toggle.textContent = paused ? 'Resume logo scroll' : 'Pause logo scroll';
});
