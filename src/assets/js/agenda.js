/* agenda.js — lògica compartida de l'agenda.
   L'utilitza build.mjs (Node) per generar l'HTML i el navegador per
   tornar a ordenar les activitats segons el dia real de visita.
   Sense dependències. Totes les dates són dates de calendari a Badalona. */

export const TZ = 'Europe/Madrid';

/** Data d'avui a Badalona com a 'AAAA-MM-DD'. */
export function avui(ara = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ara);
}

const d = (iso) => new Date(iso + 'T12:00:00Z');
const iso = (dt) => dt.toISOString().slice(0, 10);

/** Properes dates d'una activitat periòdica, a partir d'avui inclòs. */
export function properesDates(regla, desDe, quantes = 4) {
  const out = [];
  let any = Number(desDe.slice(0, 4));
  let mes = Number(desDe.slice(5, 7)) - 1;
  while (out.length < quantes) {
    const ordinals = regla.ordinals || [1, 2, 3, 4, 5];
    let n = 0;
    for (let dia = 1; dia <= 31; dia++) {
      const dt = new Date(Date.UTC(any, mes, dia, 12));
      if (dt.getUTCMonth() !== mes) break;
      if (dt.getUTCDay() !== regla.diaSetmana) continue;
      n++;
      const s = iso(dt);
      if (ordinals.includes(n) && s >= desDe) out.push(s);
      if (out.length >= quantes) break;
    }
    mes++;
    if (mes > 11) { mes = 0; any++; }
  }
  return out;
}

const fmt = (opts) => new Intl.DateTimeFormat('ca-ES', { timeZone: 'UTC', ...opts });
export const diaSetmana = (s) => fmt({ weekday: 'long' }).format(d(s));
export const diaMes = (s) => fmt({ day: 'numeric', month: 'long' }).format(d(s));
export const mesCurt = (s) => fmt({ month: 'short' }).format(d(s)).replace('.', '');
export const numDia = (s) => String(Number(s.slice(8, 10)));
export const dataLlarga = (s) => `${diaSetmana(s)}, ${diaMes(s)}`;

export function horari(a) {
  if (!a.hora) return '';
  return a.horaFi ? `de ${a.hora} a ${a.horaFi} h` : `a les ${a.hora} h`;
}

/** Converteix el fitxer d'activitats en ocurrències amb data, ja ordenades. */
export function ocurrencies(activitats, hoy) {
  const futures = [];
  const passades = [];
  for (const a of activitats) {
    if (a.tipus === 'periodica') {
      const [data, ...seguents] = properesDates(a.regla, hoy, 2);
      futures.push({ ...a, data, seguents });
    } else if (a.data >= hoy) futures.push(a);
    else passades.push(a);
  }
  futures.sort((x, y) => x.data.localeCompare(y.data));
  passades.sort((x, y) => y.data.localeCompare(x.data));
  return { futures, passades };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Fila d'agenda: data gran a l'esquerra, informació a la dreta. */
export function filaHTML(a, hoy, { ambCartell = false } = {}) {
  const esAvui = a.data === hoy;
  const parts = [horari(a) && `<span>${horari(a)}</span>`, a.lloc && `<span>${esc(a.lloc)}</span>`].filter(Boolean);
  const quan = parts.length ? parts.join('') : '<span>Horari i lloc per confirmar</span>';
  const cartell = ambCartell && a.cartell
    ? `<a class="fila__cartell" href="/assets/img/${a.cartell}.jpg" aria-label="Cartell de ${esc(a.titol)} (s'obre la imatge)"><img src="/assets/img/${a.cartell}.webp" alt="" width="160" height="200" loading="lazy" decoding="async"></a>`
    : '';
  return `<li class="fila${esAvui ? ' fila--avui' : ''}" data-data="${a.data}">
  <time class="fila__data" datetime="${a.data}"><span class="fila__dia">${numDia(a.data)}</span><span class="fila__mes">${mesCurt(a.data)}</span></time>
  <div class="fila__cos">
    <p class="fila__quan">${esAvui ? '<strong class="avui">Avui</strong> ' : ''}${esc(dataLlarga(a.data))}${a.regla ? ` <span class="fila__regla">(${esc(a.regla.text)})</span>` : ''}</p>
    <h3 class="fila__titol">${esc(a.titol)}</h3>
    <p class="fila__on">${quan}</p>
    ${a.descripcio ? `<p class="fila__desc">${esc(a.descripcio)}</p>` : ''}
    ${a.seguents?.length ? `<p class="fila__seguent">Següent: ${esc(a.seguents.map(dataLlarga).join(', '))}</p>` : ''}
    ${a.preu ? `<p class="fila__preu">${esc(a.preu)}</p>` : ''}
  </div>
  ${cartell}
</li>`;
}

export function llistaHTML(items, hoy, opts) {
  if (!items.length) return '';
  return items.map((a) => filaHTML(a, hoy, opts)).join('\n');
}

/* ── Navegador: torna a calcular amb la data real de la visita ── */
if (typeof document !== 'undefined') {
  const hoy = avui();
  const fonts = document.getElementById('dades-activitats');
  if (fonts) {
    const { activitats } = JSON.parse(fonts.textContent);
    const { futures, passades } = ocurrencies(activitats, hoy);
    document.querySelectorAll('[data-agenda]').forEach((ul) => {
      const tipus = ul.dataset.agenda;
      const max = Number(ul.dataset.max || 99);
      const ambCartell = ul.dataset.cartell === 'si';
      const llista = (tipus === 'passades' ? passades : futures).slice(0, max);
      if (llista.length) ul.innerHTML = llistaHTML(llista, hoy, { ambCartell });
    });
    document.querySelectorAll('[data-propers-dies]').forEach((el) => {
      const a = activitats.find((x) => x.id === el.dataset.propersDies);
      if (!a) return;
      const dates = properesDates(a.regla, hoy, 2);
      el.textContent = dates.map((s) => (s === hoy ? `avui, ${diaMes(s)}` : dataLlarga(s))).join(' i ');
    });
  }
}
