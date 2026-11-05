/* tallers.js — filtre per tipus de taller (només a /activitats).
   Sense JS, es veuen tots els tallers i el filtre queda amagat. */
const filtre = document.querySelector('.filtre');
const setmana = document.querySelector('.setmana');
if (filtre && setmana) {
  filtre.hidden = false;
  filtre.addEventListener('click', (e) => {
    const boto = e.target.closest('button[data-filtre]');
    if (!boto) return;
    const valor = boto.dataset.filtre;
    filtre.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === boto)));
    setmana.dataset.filtre = valor;
    setmana.querySelectorAll('.dia').forEach((dia) => {
      const visibles = [...dia.querySelectorAll('.taller')].filter((t) => valor === 'tots' || t.dataset.cat === valor).length;
      dia.hidden = visibles === 0;
      const n = dia.querySelector('.dia__n');
      if (n) n.textContent = `${visibles} ${visibles === 1 ? 'taller' : 'tallers'}`;
    });
  });
}
