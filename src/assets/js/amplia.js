/* amplia.js — obre cartells i imatges en gran (enllaços amb data-amplia).
   Sense JS, l'enllaç obre la imatge directament. */
let dialeg;
function crea() {
  dialeg = document.createElement('dialog');
  dialeg.className = 'amplia';
  dialeg.innerHTML = '<button type="button" class="amplia__tanca" aria-label="Tanca">×</button><img alt="">';
  dialeg.addEventListener('click', (e) => { if (e.target === dialeg || e.target.closest('.amplia__tanca')) dialeg.close(); });
  dialeg.addEventListener('close', () => { dialeg.querySelector('img').src = ''; });
  document.body.append(dialeg);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-amplia]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (typeof HTMLDialogElement === 'undefined') return;
  e.preventDefault();
  if (!dialeg) crea();
  const img = dialeg.querySelector('img');
  img.src = a.href;
  img.alt = a.getAttribute('aria-label')?.replace(/^Amplia /, '') || '';
  dialeg.showModal();
  dialeg.querySelector('.amplia__tanca').focus();
});
