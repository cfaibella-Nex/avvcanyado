/* build.mjs — genera la web estàtica a dist/.
   Ús: node build.mjs        (sense dependències)
   Variables d'entorn:
     INDEXAR=1     permet que els cercadors indexin la web (activar-ho
                   només quan la web estigui a avcanyado.org)
     SITE_URL=...  URL pública (per a les metadades Open Graph) */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { avui, ocurrencies, llistaHTML, datesPeriodica, dataLlarga, diaMes } from './src/assets/js/agenda.js';

const SRC = 'src';
const OUT = 'dist';
const INDEXAR = process.env.INDEXAR === '1';
const SITE_URL = (process.env.SITE_URL || 'https://avvcanyado.nexsocial.org').replace(/\/$/, '');

const llegeix = (p) => readFileSync(p, 'utf8');
const partial = (n) => llegeix(join(SRC, 'partials', `${n}.html`));
const activitats = JSON.parse(llegeix('data/activitats.json'));
const tallers = JSON.parse(llegeix('data/tallers.json'));
const hoy = avui();
const { futures, passades } = ocurrencies(activitats.activitats, hoy);
const versio = Date.now().toString(36);

const DIES = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres'];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICONES = {
  fulla: '<path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14Z"/><path d="M5 19l8-8"/>',
  llamp: '<path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z"/>',
  nota: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  llapis: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z"/><path d="M14 7l3 3"/>',
};
const icona = (nom) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES[nom]}</svg>`;

function filtreHTML() {
  const cats = Object.entries(tallers.categories);
  const botons = [`<button type="button" data-filtre="tots" aria-pressed="true">Tots</button>`]
    .concat(cats.map(([id, c]) => `<button type="button" data-filtre="${id}" aria-pressed="false" class="xip xip--${id}">${icona(c.icona)}${esc(c.nom)}</button>`));
  return `<div class="filtre" role="group" aria-label="Mostra només un tipus de taller" hidden>${botons.join('')}</div>`;
}

function tallersHTML() {
  const perDia = DIES.map(() => []);
  for (const t of tallers.tallers) for (const d of t.dies) perDia[d].push(t);
  return DIES.slice(1).map((nom, i) => {
    const llista = perDia[i + 1];
    if (!llista.length) return '';
    const files = llista.map((t) => {
      const c = tallers.categories[t.cat];
      return `<li class="taller taller--${t.cat}" data-cat="${t.cat}"><span class="taller__ico" title="${esc(c.nom)}">${icona(c.icona)}</span><span class="taller__info"><span class="taller__nom">${esc(t.nom)}</span><span class="taller__meta"><span class="taller__hora">${esc(t.hora)} h</span> <span class="taller__centre">${esc(t.centre)}</span></span></span></li>`;
    }).join('');
    return `<section class="dia" aria-labelledby="dia-${i + 1}"><h3 id="dia-${i + 1}">${nom} <span class="dia__n">${llista.length} tallers</span></h3><ul class="tallers">${files}</ul></section>`;
  }).join('\n');
}

function centresHTML() {
  return Object.entries(tallers.centres).map(([curt, llarg]) => `<li><strong>${esc(curt)}</strong>: ${esc(llarg)}</li>`).join('');
}

const nav = [
  ['activitats', '/activitats', 'Activitats'],
  ['participa', '/participa', 'Participa'],
  ['la-gabia', '/la-gabia', 'La Gàbia'],
  ['qui-som', '/qui-som', 'Qui som'],
  ['transparencia', '/transparencia', 'Transparència'],
  ['contacte', '/contacte', 'Contacte'],
];
const navHTML = (actiu) => nav.map(([id, href, txt]) => `<li><a href="${href}"${id === actiu ? ' aria-current="page"' : ''}>${txt}</a></li>`).join('');

function render(fitxer) {
  let html = llegeix(fitxer);
  const m = html.match(/^<!--meta\s+(\{[\s\S]*?\})\s*-->\s*/);
  if (!m) throw new Error(`Falta el bloc <!--meta {...} --> a ${fitxer}`);
  const meta = JSON.parse(m[1]);
  html = html.slice(m[0].length);

  const titol = meta.title ? `${meta.title} | AVV Canyadó` : 'AVV Canyadó · Associació Veïnal de Canyadó, Badalona';
  const ruta = meta.path ?? `/${basename(fitxer, '.html')}`;
  const head = partial('head')
    .replaceAll('{{title}}', esc(titol))
    .replaceAll('{{desc}}', esc(meta.desc || ''))
    .replaceAll('{{url}}', SITE_URL + ruta)
    .replaceAll('{{site}}', SITE_URL)
    .replaceAll('{{robots}}', INDEXAR ? 'index, follow' : 'noindex, nofollow')
    .replaceAll('{{v}}', versio);

  const una = activitats.activitats.find((a) => a.id === 'una-cadira-mes');
  const propersUna = datesPeriodica(una, hoy, 2).map((s) => (s === hoy ? `avui, ${diaMes(s)}` : dataLlarga(s))).join(' i ') || 'aviat publicarem les properes dates';

  const subs = {
    '{{header}}': partial('header').replaceAll('{{nav}}', navHTML(meta.nav)),
    '{{footer}}': partial('footer').replaceAll('{{any}}', hoy.slice(0, 4)),
    '{{agenda:futures:3}}': llistaHTML(futures.slice(0, 3), hoy),
    '{{agenda:futures}}': llistaHTML(futures, hoy, { ambCartell: true }),
    '{{agenda:passades}}': llistaHTML(passades, hoy, { ambCartell: true }),
    '{{tallers}}': tallersHTML(),
    '{{filtre-tallers}}': filtreHTML(),
    '{{centres}}': centresHTML(),
    '{{curs}}': esc(tallers.curs),
    '{{propers:una-cadira-mes}}': propersUna,
    '{{dades-activitats}}': `<script type="application/json" id="dades-activitats">${JSON.stringify({ activitats: activitats.activitats }).replace(/</g, '\\u003c')}</script>\n<script type="module" src="/assets/js/agenda.js?v=${versio}"></script>`,
    '{{js-tallers}}': `<script type="module" src="/assets/js/tallers.js?v=${versio}"></script>`,
  };
  html = html.replace('{{head}}', head);
  for (const [k, v] of Object.entries(subs)) html = html.replaceAll(k, v);
  const resta = html.match(/\{\{[^}]+\}\}/);
  if (resta) throw new Error(`Marcador sense substituir ${resta[0]} a ${fitxer}`);
  return html;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(SRC, 'assets'), join(OUT, 'assets'), { recursive: true });
cpSync(join(SRC, 'docs'), join(OUT, 'docs'), { recursive: true });
for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) {
  try { statSync(join(SRC, f)); cpSync(join(SRC, f), join(OUT, f)); } catch {}
}

const pagines = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));
for (const p of pagines) writeFileSync(join(OUT, p), render(join(SRC, 'pages', p)));

writeFileSync(join(OUT, 'robots.txt'), INDEXAR ? `User-agent: *\nAllow: /\n` : `User-agent: *\nDisallow: /\n`);

console.log(`✓ ${pagines.length} pàgines a ${OUT}/ · ${futures.length} activitats properes, ${passades.length} anteriors · ${INDEXAR ? 'indexable' : 'NO indexable (noindex)'}`);
