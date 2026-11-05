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

/** Properes dates d'una activitat periòdica: dates concretes si n'hi ha, si no la regla. */
export function datesPeriodica(a, hoy, quantes = 2) {
  if (Array.isArray(a.dates)) return a.dates.filter((s) => s >= hoy).sort().slice(0, quantes);
  return properesDates(a.regla, hoy, quantes);
}

/** Converteix el fitxer d'activitats en ocurrències amb data, ja ordenades. */
export function ocurrencies(activitats, hoy) {
  const futures = [];
  const passades = [];
  for (const a of activitats) {
    if (a.tipus === 'periodica') {
      const [data, ...seguents] = datesPeriodica(a, hoy, 2);
      if (data) futures.push({ ...a, data, seguents });
    } else if (a.data >= hoy) futures.push(a);
    else passades.push(a);
  }
  futures.sort((x, y) => x.data.localeCompare(y.data));
  passades.sort((x, y) => y.data.localeCompare(x.data));
  return { futures, passades };
}

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICO = {
  hora: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  lloc: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  repeteix: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/></svg>',
};
const diesFins = (des, fins) => Math.round((new Date(fins + 'T12:00:00Z') - new Date(des + 'T12:00:00Z')) / 86400000);
const diaCurt = (s) => fmt({ weekday: 'short' }).format(d(s)).replace('.', '');

/** Targeta d'activitat: imatge amb la data a sobre i la informació a sota. */
export function filaHTML(a, hoy, { ambCartell = false } = {}) {
  const dies = diesFins(hoy, a.data);
  const diaSem = (new Date(hoy + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0 = dilluns
  const finsDiumenge = 6 - diaSem;
  const etiqueta = dies === 0 ? 'Avui' : dies === 1 ? 'Demà' : dies > 1 && dies <= finsDiumenge ? 'Aquesta setmana' : '';
  const img = a.imatge || a.cartell;
  const retrat = !a.imatge && a.cartell;
  const imatge = img
    ? `<img src="/assets/img/${img}.webp" alt="" loading="lazy" decoding="async" class="targeta__img${retrat ? ' targeta__img--cartell' : ''}">`
    : `<span class="targeta__img targeta__img--buida" aria-hidden="true"></span>`;
  const meta = [
    horari(a) ? `<li>${ICO.hora}<span>${esc(horari(a))}</span></li>` : (a.lloc ? `<li>${ICO.hora}<span>Horari per confirmar</span></li>` : ''),
    a.lloc ? `<li>${ICO.lloc}<span>${esc(a.lloc)}</span></li>` : '',
  ].join('') || `<li>${ICO.hora}<span>Horari i lloc per confirmar</span></li>`;
  const xips = [
    a.regla ? `<span class="xip-ag">${ICO.repeteix}${esc(a.regla.text)}</span>` : '',
    a.preu ? `<span class="xip-ag xip-ag--preu">${esc(a.preu)}</span>` : '',
  ].join('');
  const cartell = ambCartell && a.cartell
    ? `<a class="targeta__cartell" href="/assets/img/${a.cartell}.jpg">Mira el cartell<span class="visualment-amagat"> de ${esc(a.titol)}</span></a>`
    : '';
  return `<li class="targeta${dies === 0 ? ' targeta--avui' : ''}" data-data="${a.data}">
  <div class="targeta__media">
    ${imatge}
    <time class="targeta__data" datetime="${a.data}"><span class="targeta__dsem">${esc(diaCurt(a.data))}</span><span class="targeta__dia">${numDia(a.data)}</span><span class="targeta__mes">${mesCurt(a.data)}</span></time>
    ${etiqueta ? `<span class="targeta__etiqueta">${etiqueta}</span>` : ''}
  </div>
  <div class="targeta__cos">
    <p class="visualment-amagat">${esc(dataLlarga(a.data))}</p>
    <h3 class="targeta__titol">${esc(a.titol)}</h3>
    <ul class="targeta__meta">${meta}</ul>
    ${a.descripcio ? `<p class="targeta__desc">${esc(a.descripcio)}</p>` : ''}
    ${a.seguents?.length ? `<p class="targeta__seguent">Següent: ${esc(a.seguents.map(dataLlarga).join(', '))}</p>` : ''}
    ${xips || cartell ? `<div class="targeta__peu">${xips}${cartell}</div>` : ''}
  </div>
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
      const dates = datesPeriodica(a, hoy, 2);
      if (!dates.length) return;
      el.textContent = dates.map((s) => (s === hoy ? `avui, ${diaMes(s)}` : dataLlarga(s))).join(' i ');
    });
  }
}
