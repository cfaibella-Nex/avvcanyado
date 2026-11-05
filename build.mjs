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
const espais = JSON.parse(llegeix('data/espais.json'));
const publicacions = JSON.parse(llegeix('data/publicacions.json'));
const noticies = JSON.parse(llegeix('data/noticies.json'));
const llistaNoticies = noticies.noticies.filter((n) => !n.esborrany).sort((a, b) => b.data.localeCompare(a.data));
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

const foto = (f, { sizes = '100vw', classe = '', lazy = true, prioritat = false } = {}) => { const pw = Number(f.petita.split('-').pop()) || 900; return `<picture${classe ? ` class="${classe}"` : ''}>
  <source type="image/webp" srcset="/assets/img/${f.petita}.webp ${pw}w, /assets/img/${f.img}.webp ${f.w}w" sizes="${sizes}">
  <img src="/assets/img/${f.petita}.jpg" srcset="/assets/img/${f.petita}.jpg ${pw}w, /assets/img/${f.img}.jpg ${f.w}w" sizes="${sizes}" alt="${esc(f.alt)}" width="${f.w}" height="${f.h}"${lazy ? ' loading="lazy"' : ''}${prioritat ? ' fetchpriority="high"' : ''} decoding="async">
</picture>`; };

function espaisHTML() {
  return espais.espais.map((e, n) => {
    const [principal, ...resta] = e.fotos;
    const text = e.text.map((p) => `<p>${esc(p)}</p>`).join('');
    const normes = e.normes ? `<h3 class="espai__sub">Entre tots la cuidem</h3><ul class="normes">${e.normes.map((x) => `<li><h4>${esc(x.titol)}</h4><p>${esc(x.text)}</p></li>`).join('')}</ul>` : '';
    const lateral = resta.length === 1 ? `<figure class="espai__foto">${foto(resta[0], { sizes: '(min-width: 960px) 40vw, 92vw' })}</figure>` : '';
    const galeria = resta.length > 1 ? `<ul class="galeria galeria--${resta.length}">${resta.map((f) => `<li><a href="/assets/img/${f.img}.jpg" aria-label="${esc(f.alt)} (obre la foto gran)">${foto(f, { sizes: '(min-width: 960px) 30vw, 46vw' })}</a></li>`).join('')}</ul>` : '';
    return `<section class="espai" id="${e.id}" aria-labelledby="t-${e.id}">
  <div class="vel vel--espai">
    ${foto(principal, { sizes: '100vw', classe: 'vel__foto', lazy: n > 0, prioritat: n === 0 })}
    <div class="vel__text">
      <p class="vel__sub">${esc(e.subtitol)}</p>
      <h2 id="t-${e.id}">${esc(e.titol)}</h2>
      ${e.adreca ? `<p class="vel__adreca">${esc(e.adreca)}</p>` : ''}
    </div>
  </div>
  <div class="espai__cos">
    <div class="espai__text">${text}${e.avis ? `<p class="avis">${esc(e.avis)}</p>` : ''}${e.enllac ? `<p><a class="enllac-fort" href="${e.enllac.href}">${esc(e.enllac.text)}</a></p>` : ''}</div>
    <div class="espai__extra">${lateral}${normes}</div>
  </div>
  ${galeria}
</section>`;
  }).join('\n');
}

/* Text de les notícies: paràgrafs separats per una línia en blanc,
   **negreta**, *cursiva* i [enllaços](https://...). Res més: així és segur. */
function textRic(s) {
  return String(s || '').trim().split(/\n\s*\n/).map((p) => {
    let h = esc(p.trim()).replace(/\n/g, '<br>');
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*|mailto:[^)\s]+)\)/g, (_, txt, url) => `<a href="${url}"${url.startsWith('http') ? ' rel="noopener"' : ''}>${txt}</a>`);
    return /^#{2,3} /.test(p.trim()) ? `<h2>${h.replace(/^#{2,3} /, '')}</h2>` : `<p>${h}</p>`;
  }).join('\n');
}
const TIPUS_NOTICIA = { noticia: 'Notícia', blog: 'Blog', cronica: 'Crònica', avis: 'Avís' };
const dataNoticia = (s) => new Intl.DateTimeFormat('ca-ES', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(s + 'T12:00:00Z'));

function noticiesHTML(max = 99) {
  const llista = llistaNoticies.slice(0, max);
  if (!llista.length) {
    return `<div class="buit"><p class="buit__titol">Aviat hi publicarem notícies</p><p>Aquí trobaràs les novetats del barri, cròniques de les activitats i articles de l'associació.</p></div>`;
  }
  return `<ul class="noticies">${llista.map((n) => `<li class="noticia">
    <a class="noticia__enllac" href="/noticies/${n.slug}">
      <span class="noticia__media">${n.imatge ? `<img src="/assets/img/${n.imatge}.webp" alt="" loading="lazy">` : '<span class="noticia__buida" aria-hidden="true"></span>'}</span>
      <span class="noticia__cos">
        <span class="noticia__meta"><span class="noticia__tipus">${esc(TIPUS_NOTICIA[n.tipus] || 'Notícia')}</span><time datetime="${n.data}">${esc(dataNoticia(n.data))}</time></span>
        <span class="noticia__titol">${esc(n.titol)}</span>
        ${n.resum ? `<span class="noticia__resum">${esc(n.resum)}</span>` : ''}
      </span>
    </a>
  </li>`).join('')}</ul>`;
}

function paginaNoticia(n) {
  const meta = JSON.stringify({ title: n.titol, desc: n.resum || '', nav: 'publicacions', path: `/noticies/${n.slug}` });
  return `<!--meta ${meta} -->
<!doctype html>
<html lang="ca">
<head>
{{head}}
</head>
<body>
{{header}}
<main id="contingut">
  <article class="article">
    <header class="article__cap">
      <p class="article__torna"><a href="/publicacions#noticies">Totes les notícies</a></p>
      <p class="noticia__meta"><span class="noticia__tipus">${esc(TIPUS_NOTICIA[n.tipus] || 'Notícia')}</span><time datetime="${n.data}">${esc(dataNoticia(n.data))}</time>${n.autor ? `<span>${esc(n.autor)}</span>` : ''}</p>
      <h1>${esc(n.titol)}</h1>
      ${n.resum ? `<p class="entradeta">${esc(n.resum)}</p>` : ''}
    </header>
    ${n.imatge ? `<figure class="article__img"><img src="/assets/img/${n.imatge}.webp" alt="${esc(n.alt || '')}"></figure>` : ''}
    <div class="article__text">${textRic(n.text)}</div>
  </article>
</main>
{{footer}}
{{js-menu}}
</body>
</html>`;
}

const espaisNavHTML = () => espais.espais.map((e) => `<a href="#${e.id}">${esc(e.titol)}</a>`).join('');

function publicacionsHTML() {
  const llista = publicacions.publicacions;
  if (!llista.length) {
    return `<div class="buit"><p class="buit__titol">Aviat hi trobaràs els llibres de l'AVV</p><p>Estem recopilant les publicacions que ha editat l'associació al llarg dels anys. Mentrestant, pregunta per elles al local.</p></div>`;
  }
  return `<ul class="llibres">${llista.map((l) => `<li class="llibre">
    ${l.portada ? `<a class="llibre__coberta" href="/assets/img/${l.portada}.jpg" aria-label="Portada de ${esc(l.titol)} (obre la imatge gran)"><img class="llibre__portada" src="/assets/img/${l.portada}.webp" alt="" loading="lazy"></a>` : `<span class="llibre__portada llibre__portada--buida" aria-hidden="true">${esc(l.titol)}</span>`}
    <div class="llibre__info">
      <h3>${esc(l.titol)}</h3>
      ${l.subtitol ? `<p class="llibre__subtitol">${esc(l.subtitol)}</p>` : ''}
      <dl class="llibre__fitxa">
        ${l.autor ? `<div><dt>Text</dt><dd>${esc(l.autor)}</dd></div>` : ''}
        ${l['il·lustracions'] ? `<div><dt>Il·lustracions</dt><dd>${esc(l['il·lustracions'])}</dd></div>` : ''}
        ${l.any ? `<div><dt>Any</dt><dd>${esc(l.any)}</dd></div>` : ''}
        <div><dt>Edita</dt><dd>Associació Veïnal de Canyadó</dd></div>
      </dl>
      ${l.descripcio ? `<p>${esc(l.descripcio)}</p>` : ''}
      <p class="llibre__preu">${l.estat === 'exhaurit' ? 'Exhaurit' : esc(l.preu || "Disponible al local de l'AVV")}</p>
    </div>
  </li>`).join('')}</ul>`;
}

const nav = [
  ['inici', '/', 'Inici'],
  ['qui-som', '/qui-som', 'Qui som'],
  ['activitats', '/activitats', 'Activitats'],
  ['espais', '/espais', 'Espais'],
  ['publicacions', '/publicacions', 'Publicacions'],
  ['participa', '/participa', 'Participa'],
  ['transparencia', '/transparencia', 'Transparència'],
  ['contacte', '/contacte', 'Contacte'],
];
const navHTML = (actiu) => nav.map(([id, href, txt]) => `<li><a href="${href}"${id === actiu ? ' aria-current="page"' : ''}>${txt}</a></li>`).join('');

function render(fitxer, text = null) {
  let html = text ?? llegeix(fitxer);
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
    '{{espais}}': espaisHTML(),
    '{{espais-nav}}': espaisNavHTML(),
    '{{publicacions}}': publicacionsHTML(),
    '{{noticies}}': noticiesHTML(),
    '{{filtre-tallers}}': filtreHTML(),
    '{{centres}}': centresHTML(),
    '{{curs}}': esc(tallers.curs),
    '{{propers:una-cadira-mes}}': propersUna,
    '{{dades-activitats}}': `<script type="application/json" id="dades-activitats">${JSON.stringify({ activitats: activitats.activitats }).replace(/</g, '\\u003c')}</script>\n<script type="module" src="/assets/js/agenda.js?v=${versio}"></script>`,
    '{{js-menu}}': `<script type="module" src="/assets/js/menu.js?v=${versio}"></script>\n<script type="module" src="/assets/js/amplia.js?v=${versio}"></script>`,
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

mkdirSync(join(OUT, 'noticies'), { recursive: true });
for (const n of llistaNoticies) {
  if (!/^[a-z0-9-]+$/.test(n.slug)) throw new Error(`Slug no vàlid a noticies.json: ${n.slug}`);
  writeFileSync(join(OUT, 'noticies', `${n.slug}.html`), render(`noticia ${n.slug}`, paginaNoticia(n)));
}

writeFileSync(join(OUT, 'robots.txt'), INDEXAR ? `User-agent: *\nAllow: /\n` : `User-agent: *\nDisallow: /\n`);

console.log(`✓ ${pagines.length} pàgines, ${llistaNoticies.length} notícies a ${OUT}/ · ${futures.length} activitats properes, ${passades.length} anteriors · ${INDEXAR ? 'indexable' : 'NO indexable (noindex)'}`);
