/* build.mjs — genera la web estàtica a dist/.
   Ús: node build.mjs        (sense dependències)
   Variables d'entorn:
     INDEXAR=1     permet que els cercadors indexin la web (activar-ho
                   només quan la web estigui a avcanyado.org)
     SITE_URL=...  URL pública (per a les metadades Open Graph) */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { avui, ocurrencies, llistaHTML, properesDates, dataLlarga, diaMes } from './src/assets/js/agenda.js';

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

function tallersHTML() {
  const perDia = DIES.map(() => []);
  for (const t of tallers.tallers) for (const d of t.dies) perDia[d].push(t);
  return DIES.slice(1).map((nom, i) => {
    const llista = perDia[i + 1];
    if (!llista.length) return '';
    const files = llista.map((t) => `<li><span class="taller__hora">${esc(t.hora)} h</span><span class="taller__nom">${esc(t.nom)}</span><span class="taller__centre">${esc(t.centre)}</span></li>`).join('');
    return `<section class="dia" aria-labelledby="dia-${i + 1}"><h3 id="dia-${i + 1}">${nom}</h3><ul class="tallers">${files}</ul></section>`;
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
  const propersUna = properesDates(una.regla, hoy, 2).map((s) => (s === hoy ? `avui, ${diaMes(s)}` : dataLlarga(s))).join(' i ');

  const subs = {
    '{{header}}': partial('header').replaceAll('{{nav}}', navHTML(meta.nav)),
    '{{footer}}': partial('footer').replaceAll('{{any}}', hoy.slice(0, 4)),
    '{{agenda:futures:3}}': llistaHTML(futures.slice(0, 3), hoy),
    '{{agenda:futures}}': llistaHTML(futures, hoy, { ambCartell: true }),
    '{{agenda:passades}}': llistaHTML(passades, hoy, { ambCartell: true }),
    '{{tallers}}': tallersHTML(),
    '{{centres}}': centresHTML(),
    '{{curs}}': esc(tallers.curs),
    '{{propers:una-cadira-mes}}': propersUna,
    '{{dades-activitats}}': `<script type="application/json" id="dades-activitats">${JSON.stringify({ activitats: activitats.activitats }).replace(/</g, '\\u003c')}</script>\n<script type="module" src="/assets/js/agenda.js?v=${versio}"></script>`,
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
