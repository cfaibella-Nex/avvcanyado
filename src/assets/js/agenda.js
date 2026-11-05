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
  const gran = a.cartell || a.imatge;
  const esCartell = !a.imatge && a.cartell;
  const imatge = img
    ? `${esCartell ? `<img src="/assets/img/${img}.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" class="targeta__fons">` : ''}<img src="/assets/img/${img}.webp" alt="" loading="lazy" decoding="async" class="targeta__img${esCartell ? ' targeta__img--cartell' : ''}">`
    : `<span class="targeta__img targeta__img--buida" aria-hidden="true"></span>`;
  const media = (contingut) => gran
    ? `<a class="targeta__media" href="/assets/img/${gran}.jpg" data-amplia aria-label="Amplia ${a.cartell ? 'el cartell' : 'la imatge'} de ${esc(a.titol)}">${contingut}<span class="targeta__lupa" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8.5v5M8.5 11h5"/></svg>${a.cartell ? 'Cartell' : 'Amplia'}</span></a>`
    : `<div class="targeta__media">${contingut}</div>`;
  const meta = [
    horari(a) ? `<li>${ICO.hora}<span>${esc(horari(a))}</span></li>` : (a.lloc ? `<li>${ICO.hora}<span>Horari per confirmar</span></li>` : ''),
    a.lloc ? `<li>${ICO.lloc}<span>${esc(a.lloc)}</span></li>` : '',
  ].join('') || `<li>${ICO.hora}<span>Horari i lloc per confirmar</span></li>`;
  const xips = [
    a.regla ? `<span class="xip-ag">${ICO.repeteix}${esc(a.regla.text)}</span>` : '',
    a.preu ? `<span class="xip-ag xip-ag--preu">${esc(a.preu)}</span>` : '',
  ].join('');
  const cartell = '';
  return `<li class="targeta${dies === 0 ? ' targeta--avui' : ''}" data-data="${a.data}">
  ${media(`${imatge}
    <time class="targeta__data" datetime="${a.data}"><span class="targeta__dsem">${esc(diaCurt(a.data))}</span><span class="targeta__dia">${numDia(a.data)}</span><span class="targeta__mes">${mesCurt(a.data)}</span></time>
    ${etiqueta ? `<span class="targeta__etiqueta">${etiqueta}</span>` : ''}`)}
  <div class="targeta__cos">
    <p class="visualment-amagat">${esc(dataLlarga(a.data))}</p>
    <h3 class="targeta__titol">${esc(a.titol)}</h3>
    <ul class="targeta__meta">${meta}</ul>
    ${a.descripcio ? `<p class="targeta__desc">${esc(a.descripcio)}</p>` : ''}
    ${a.seguents?.length ? `<p class="targeta__seguent">Següent: ${esc(a.seguents.map(dataLlarga).join(', '))}</p>` : ''}
    ${xips || cartell ? `<div class="targeta__peu">${xips}${cartell}</div>` : ''}
    <button class="targeta__obre" type="button" data-fitxa="${esc(a.id)}" aria-haspopup="dialog">Més informació <span aria-hidden="true">→</span></button>
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
    activaFitxes(activitats, hoy);
    document.querySelectorAll('[data-propers-dies]').forEach((el) => {
      const a = activitats.find((x) => x.id === el.dataset.propersDies);
      if (!a) return;
      const dates = datesPeriodica(a, hoy, 2);
      if (!dates.length) return;
      el.textContent = dates.map((s) => (s === hoy ? `avui, ${diaMes(s)}` : dataLlarga(s))).join(' i ');
    });
  }
}

/* ── Fitxa ampliada d'una activitat (diàleg) ── */
const paragrafs = (t) => (Array.isArray(t) ? t : t ? [t] : []).map((p) => `<p>${esc(p)}</p>`).join('');

function ics(a, data) {
  const dt = data.replace(/-/g, '');
  const hm = (h) => (h || '').replace(/[.:]/g, '').padStart(4, '0') + '00';
  const net = (x) => String(x || '').replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, ' ');
  const temps = a.hora
    ? [`DTSTART;TZID=Europe/Madrid:${dt}T${hm(a.hora)}`, `DTEND;TZID=Europe/Madrid:${dt}T${hm(a.horaFi || a.hora)}`]
    : [`DTSTART;VALUE=DATE:${dt}`];
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AVV Canyado//Agenda//CA', 'BEGIN:VEVENT',
    `UID:${a.id}-${dt}@avvcanyado`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`, ...temps,
    `SUMMARY:${net(a.titol)}`, a.lloc ? `LOCATION:${net(a.lloc)}` : '', a.descripcio ? `DESCRIPTION:${net(a.descripcio)}` : '',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

function fitxaHTML(a, hoy) {
  const gran = a.cartell || a.imatge;
  const dates = a.tipus === 'periodica' ? datesPeriodica(a, hoy, 8) : [a.data];
  const propera = dates[0] || a.data;
  const passada = propera < hoy;
  const imatge = gran ? `<a class="fitxa__imatge${a.cartell && !a.imatge ? ' fitxa__imatge--cartell' : ''}" href="/assets/img/${gran}.jpg" target="_blank" rel="noopener" aria-label="Obre ${a.cartell ? 'el cartell' : 'la imatge'} a mida completa"><img src="/assets/img/${gran}.jpg" alt=""></a>` : '';
  const files = [
    ['Quan', a.tipus === 'periodica' ? `${esc(a.regla?.text || '')}${a.regla?.text ? '. ' : ''}Properes dates:` : esc(dataLlarga(propera))],
    ['Horari', esc(horari(a) || 'Per confirmar')],
    ['On', esc(a.lloc || 'Per confirmar')],
    a.preu ? ['Preu', esc(a.preu)] : null,
  ].filter(Boolean);
  const llistaDates = a.tipus === 'periodica' && dates.length ? `<ul class="fitxa__dates">${dates.map((s) => `<li>${esc(dataLlarga(s))}</li>`).join('')}</ul>` : '';
  return `<button type="button" class="fitxa__tanca" aria-label="Tanca">×</button>
  <div class="fitxa__cos">
    ${imatge}
    <div class="fitxa__text">
      <p class="fitxa__rotul">${passada ? 'Activitat feta' : esc(dataLlarga(propera))}</p>
      <h2 class="fitxa__titol" id="fitxa-titol">${esc(a.titol)}</h2>
      ${a.pendent ? '<p class="fitxa__avis">Aviat publicarem l\'horari i el programa complet.</p>' : ''}
      <dl class="fitxa__dades">${files.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}${k === 'Quan' ? llistaDates : ''}</dd></div>`).join('')}</dl>
      <div class="fitxa__desc">${paragrafs(a.descripcio)}${paragrafs(a.detall)}</div>
      ${Array.isArray(a.programa) && a.programa.length ? `<h3>Programa</h3><ul class="fitxa__programa">${a.programa.map((x) => `<li>${x.hora ? `<b>${esc(x.hora)}</b> ` : ''}${esc(x.text || x)}</li>`).join('')}</ul>` : ''}
      <p class="fitxa__accions">
        ${!passada ? `<a class="boto" data-ics href="#">Afegeix al calendari</a>` : ''}
        ${/AVV|Eduard Marquina/i.test(a.lloc || '') ? '<a class="enllac-fletxa" href="/contacte">Com arribar-hi <span aria-hidden="true">→</span></a>' : ''}
      </p>
    </div>
  </div>`;
}

function activaFitxes(activitats, hoy) {
  if (typeof HTMLDialogElement === 'undefined') return;
  let dialeg;
  document.addEventListener('click', (e) => {
    const disparador = e.target.closest('[data-fitxa]') || (e.target.closest('.targeta__cos') && !e.target.closest('a') ? e.target.closest('.targeta')?.querySelector('[data-fitxa]') : null);
    if (!disparador) return;
    const a = activitats.find((x) => x.id === disparador.dataset.fitxa);
    if (!a) return;
    e.preventDefault();
    if (!dialeg) {
      dialeg = document.createElement('dialog');
      dialeg.className = 'fitxa';
      dialeg.setAttribute('aria-labelledby', 'fitxa-titol');
      dialeg.addEventListener('click', (ev) => { if (ev.target === dialeg || ev.target.closest('.fitxa__tanca')) dialeg.close(); });
      document.body.append(dialeg);
    }
    dialeg.innerHTML = fitxaHTML(a, hoy);
    const enllac = dialeg.querySelector('[data-ics]');
    if (enllac) {
      const data = (a.tipus === 'periodica' ? datesPeriodica(a, hoy, 1)[0] : a.data) || a.data;
      enllac.href = URL.createObjectURL(new Blob([ics(a, data)], { type: 'text/calendar' }));
      enllac.download = `${a.id}.ics`;
    }
    dialeg.showModal();
    dialeg.scrollTop = 0;
    dialeg.querySelector('.fitxa__tanca').focus();
  });
}
