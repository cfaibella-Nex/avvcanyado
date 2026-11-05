/* menu.js — menú mòbil: es tanca amb Esc, en clicar fora o en triar una opció. */
const menu = document.querySelector('.menu');
if (menu) {
  const resum = menu.querySelector('summary');
  const tanca = () => { if (menu.open) { menu.open = false; resum.focus(); } };
  const sync = () => resum.setAttribute('aria-expanded', String(menu.open));
  sync();
  menu.addEventListener('toggle', sync);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tanca(); });
  document.addEventListener('click', (e) => { if (menu.open && !menu.contains(e.target)) menu.open = false; });
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { menu.open = false; }));
}
