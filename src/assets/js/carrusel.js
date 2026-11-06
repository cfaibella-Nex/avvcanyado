/* carrusel.js — Properes activitats en carrusel 3D automàtic (Inici).
   La targeta central és la protagonista; les altres queden darrere, petites i translúcides.
   Avança sola, es pot arrossegar, fer servir les fletxes o el teclat. Sense JS, és una graella. */
const arrel = document.querySelector('[data-carrusel]');
if (arrel) {
  const ul = arrel.querySelector('ul');
  const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let actiu = 0, temporitzador = null, pausa = false;

  const items = () => [...ul.children].filter((li) => li.matches('li'));

  function pinta() {
    const li = items(); const n = li.length;
    if (n < 2) { arrel.classList.add('carrusel--sol'); return; }
    li.forEach((el, i) => {
      let o = i - actiu;
      if (o > n / 2) o -= n;
      if (o < -n / 2) o += n;
      const abs = Math.abs(o);
      el.style.setProperty('--o', o);
      el.style.setProperty('--abs', abs);
      el.dataset.pos = o === 0 ? 'centre' : abs === 1 ? 'costat' : abs === 2 ? 'lluny' : 'amagat';
      el.style.zIndex = String(10 - abs);
      el.setAttribute('aria-hidden', o === 0 ? 'false' : 'true');
      el.querySelectorAll("a, button").forEach((x) => { if (o !== 0) x.setAttribute("tabindex", "-1"); else x.removeAttribute("tabindex"); });
    });
    alcada();
  }
  function alcada() {
    const max = Math.max(...items().map((el) => el.offsetHeight), 0);
    ul.style.height = `${max + 40}px`;
  }
  const ves = (k) => { const n = items().length; actiu = (k + n) % n; pinta(); };
  const seg = () => ves(actiu + 1);
  const ant = () => ves(actiu - 1);

  function auto() {
    clearInterval(temporitzador);
    if (quiet) return;
    temporitzador = setInterval(() => { if (!pausa && !document.hidden) seg(); }, 4500);
  }

  // Clic a una targeta del costat: la porta al centre (no obre res)
  ul.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li || li.dataset.pos === 'centre') return;
    e.preventDefault(); e.stopPropagation();
    ves(items().indexOf(li)); auto();
  }, true);

  // Arrossegar
  let x0 = null, mogut = false;
  ul.addEventListener('pointerdown', (e) => { x0 = e.clientX; mogut = false; });
  ul.addEventListener('pointermove', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 8) mogut = true; });
  ul.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { dx < 0 ? seg() : ant(); auto(); }
  });
  ul.addEventListener('click', (e) => { if (mogut) { e.preventDefault(); e.stopPropagation(); mogut = false; } }, true);
  ul.addEventListener('dragstart', (e) => e.preventDefault());

  arrel.querySelector('[data-seg]').addEventListener('click', () => { seg(); auto(); });
  arrel.querySelector('[data-ant]').addEventListener('click', () => { ant(); auto(); });
  arrel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { seg(); auto(); }
    if (e.key === 'ArrowLeft') { ant(); auto(); }
  });
  arrel.addEventListener('pointerenter', () => { pausa = true; });
  arrel.addEventListener('pointerleave', () => { pausa = false; });
  arrel.addEventListener('focusin', () => { pausa = true; });
  arrel.addEventListener('focusout', () => { pausa = false; });

  // agenda.js pot tornar a pintar la llista amb la data real
  new MutationObserver(() => { actiu = 0; pinta(); }).observe(ul, { childList: true });
  addEventListener('resize', alcada);
  addEventListener('load', alcada);
  arrel.classList.add('carrusel--actiu');
  pinta(); auto();
}
