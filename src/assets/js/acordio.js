/* acordio.js — Properes activitats com a columnes que s'obren (Activitats).
   Una activitat oberta i la resta en franges verticals amb el nom.
   S'obre en passar-hi per sobre, amb el focus o tocant-la. Sense JS (o en mòbil) és una graella normal. */
const ul = document.querySelector('[data-acordio]');
if (ul) {
  const amplia = matchMedia('(min-width: 900px)');
  const items = () => [...ul.children].filter((li) => li.matches('li'));

  function prepara() {
    const li = items();
    li.forEach((el, i) => {
      // Si l'activitat té cartell, a la columna es mostra el cartell sencer
      const a = el.querySelector('a.targeta__media[href*="cartell-"]');
      const img = el.querySelector('.targeta__img');
      if (a && img && !img.dataset.cartell) {
        img.dataset.cartell = '1';
        img.src = a.getAttribute('href').replace(/\.jpg$/, '.webp');
        img.classList.add('targeta__img--cartell');
        if (!el.querySelector('.targeta__fons')) {
          const fons = document.createElement('img');
          fons.className = 'targeta__fons'; fons.alt = ''; fons.setAttribute('aria-hidden', 'true'); fons.src = img.src;
          img.before(fons);
        }
      }
      if (!el.dataset.titol) {
        el.dataset.titol = el.querySelector('.targeta__titol')?.textContent.trim() || '';
        const t = el.querySelector('.targeta__data');
        el.dataset.quan = t ? `${t.querySelector('.targeta__dia')?.textContent || ''} ${t.querySelector('.targeta__mes')?.textContent || ''}`.trim() : '';
      }
      el.classList.toggle('obert', i === 0 && !li.some((x) => x.classList.contains('obert') && x !== el) ? true : el.classList.contains('obert'));
    });
    if (!li.some((x) => x.classList.contains('obert')) && li[0]) li[0].classList.add('obert');
    ul.classList.toggle('acordio--actiu', amplia.matches && li.length > 1);
  }
  function obre(el) {
    if (!el || el.classList.contains('obert')) return;
    items().forEach((x) => x.classList.toggle('obert', x === el));
  }
  ul.addEventListener('mouseover', (e) => { if (ul.classList.contains('acordio--actiu')) obre(e.target.closest('li')); });
  ul.addEventListener('focusin', (e) => obre(e.target.closest('li')));
  ul.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (ul.classList.contains('acordio--actiu') && li && !li.classList.contains('obert')) { e.preventDefault(); e.stopPropagation(); obre(li); }
  }, true);
  new MutationObserver(prepara).observe(ul, { childList: true });
  amplia.addEventListener('change', prepara);
  prepara();
}
