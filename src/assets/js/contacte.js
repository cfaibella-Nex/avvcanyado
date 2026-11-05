// contacte.js — envia el formulari sense recarregar i mostra l'estat.
// Sense JS, el formulari s'envia igualment i el servidor redirigeix a /enviat o /no-enviat.
const form = document.querySelector('[data-contacte]');
if (form) {
  const estat = form.querySelector('.formulari__estat');
  const boto = form.querySelector('button[type="submit"]');
  form.elements.t.value = String(Date.now());

  const avisa = (text, tipus) => { estat.textContent = text; estat.dataset.tipus = tipus; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      const primer = form.querySelector(':invalid');
      avisa(primer?.type === 'checkbox' ? 'Cal que acceptis la política de privacitat.' : 'Revisa els camps marcats: nom, correu i missatge (mínim 10 caràcters).', 'error');
      form.classList.add('formulari--revisat');
      primer?.focus();
      return;
    }
    boto.disabled = true;
    avisa('Enviant…', 'info');
    try {
      const r = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)),
      });
      const dades = await r.json().catch(() => ({}));
      if (r.ok) { form.reset(); form.elements.t.value = String(Date.now()); form.classList.remove('formulari--revisat'); avisa(dades.missatge || 'Missatge enviat. Gràcies!', 'ok'); }
      else avisa(dades.missatge || "No s'ha pogut enviar. Escriu-nos a avvcanyado@gmail.com.", 'error');
    } catch {
      avisa("No hi ha connexió. Torna-ho a provar o escriu-nos a avvcanyado@gmail.com.", 'error');
    } finally { boto.disabled = false; }
  });
}
