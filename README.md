# Web de l'AVV Canyadó

Web estàtica de l'Associació Veïnal de Canyadó (Badalona). Ara es publica a
`avvcanyado.nexsocial.org` per validar-la i, quan la Junta l'aprovi, substituirà el
Google Sites d'`avcanyado.org`.

HTML, CSS i JS sense dependències. Un sol script (`build.mjs`) munta les pàgines a `dist/`.

## Estructura

| On | Què |
|---|---|
| `data/activitats.json` | **Agenda.** Afegeix-hi activitats noves. Les passades van soles a «Anteriors». |
| `data/tallers.json` | Tallers setmanals del curs |
| `data/espais.json` | **Espais** (local, pista, masia…): textos i fotos. Per afegir fotos o espais nous |
| `data/publicacions.json` | **Llibres** de l'AVV (títol, autor, any, preu, portada) |
| `src/pages/` | Una pàgina per fitxer, amb un bloc `<!--meta {...} -->` a dalt |
| `src/partials/` | Capçalera, peu i `<head>` comuns |
| `src/assets/css/site.css` | Estil, amb la marca unificada (granat #7A3B2E sobre crema) |
| `src/assets/js/agenda.js` | Lògica de l'agenda (la fan servir tant el build com el navegador) |
| `src/assets/img/` | Logo en SVG, fotos i cartells (webp + jpg) |
| `src/docs/` | Full d'inscripció de socis **en blanc** i estatuts (PDF amb text cercable) |

## Afegir una activitat

1. Posa el cartell a `src/assets/img/` com a `cartell-<nom>.webp` i `.jpg`, amb 800 px d'amplada.
2. Afegeix un objecte a `data/activitats.json`:

```json
{
  "id": "festa-major-2027",
  "tipus": "esdeveniment",
  "titol": "Festa Major de Canyadó",
  "data": "2027-06-04",
  "hora": "18.00",
  "horaFi": "23.00",
  "lloc": "La Baixadeta",
  "descripcio": "Text curt per al veïnat.",
  "cartell": "cartell-festa-major-2027"
}
```

3. Fes commit: Vercel la publica en un minut.

Les activitats que es repeteixen (com «Una cadira més») fan servir `"tipus": "periodica"`. Pots indicar-ne les dates
concretes amb `"dates": ["2026-11-12", "2026-11-26", ...]`, o bé una `regla` fixa (`diaSetmana`: 1 = dilluns … 4 = dijous;
`ordinals`: [1, 3] = primer i tercer del mes). Si hi ha `dates`, la regla no es fa servir. **Recorda afegir-hi les dates
noves abans que s'acabin les que hi ha.**

Cada taller de `data/tallers.json` té una categoria (`cat`: calma, energia, ball, art), que defineix el color, la icona i el filtre.

## Local

```bash
node build.mjs            # genera dist/
npm run dev               # genera i serveix a http://localhost:4321
```

## Publicació (Vercel)

- Importa el repo a Vercel. El `vercel.json` ja defineix el build i la sortida `dist`.
- Domini: `avvcanyado.nexsocial.org` amb un registre CNAME a `cname.vercel-dns.com`, configurat a IONOS.
- **Mentre està en proves la web no s'indexa** (`noindex` + `robots.txt`). En el moment de passar a
  `avcanyado.org`, cal afegir a Vercel les variables `INDEXAR=1` i `SITE_URL=https://www.avcanyado.org`.
- Les redireccions de les URL antigues del Google Sites ja són a `vercel.json`.

## Privacitat

No hi ha galetes, analítica ni recursos de tercers. Les tipografies (Bricolage Grotesque i
Atkinson Hyperlegible, llicència OFL) se serveixen des del mateix domini. El CSP només permet `'self'`.
