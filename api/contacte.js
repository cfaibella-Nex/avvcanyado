// Formulari de contacte → correu a la bústia de l'AVV via Gmail (SMTP).
// Variables d'entorn a Vercel:
//   GMAIL_USER          compte que envia (avvcanyado@gmail.com)
//   GMAIL_APP_PASSWORD  contrasenya d'aplicació de Google (16 caràcters)
//   CONTACTE_DESTI      opcional: on arriben els missatges (per defecte, GMAIL_USER)
// No es desa res: el missatge només viatja per correu.
import nodemailer from 'nodemailer';

const LIMIT = { finestra: 10 * 60 * 1000, max: 5 };
const vistos = new Map(); // límit bàsic per IP (per instància)

const net = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, max);
const linia = (v, max) => net(v, max).replace(/[\n<>"]/g, ' ').trim();
const CORREU = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/;

function respon(req, res, estat, missatge) {
  const json = (req.headers.accept || '').includes('application/json');
  if (json) return res.status(estat).json({ ok: estat === 200, missatge });
  res.setHeader('Location', estat === 200 ? '/enviat' : '/no-enviat');
  return res.status(303).end();
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }

  const b = typeof req.body === 'object' && req.body ? req.body : {};
  // Paranys per a robots: camp ocult i enviament massa ràpid.
  if (net(b.web, 200)) return respon(req, res, 200, 'Enviat');
  const t = Number(b.t);
  if (t && Date.now() - t < 3000) return respon(req, res, 200, 'Enviat');

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'desconeguda';
  const ara = Date.now();
  const llista = (vistos.get(ip) || []).filter((x) => ara - x < LIMIT.finestra);
  if (llista.length >= LIMIT.max) return respon(req, res, 429, "Has enviat massa missatges seguits. Torna-ho a provar d'aquí a una estona.");
  llista.push(ara); vistos.set(ip, llista);

  const nom = linia(b.nom, 100);
  const correu = linia(b.correu, 200).toLowerCase();
  const tema = linia(b.tema, 60) || 'Altres';
  const missatge = net(b.missatge, 4000);
  if (!nom || !CORREU.test(correu) || missatge.length < 10) return respon(req, res, 400, 'Revisa el nom, el correu i el missatge (mínim 10 caràcters).');
  if (b.consentiment !== 'si' && b.consentiment !== true && b.consentiment !== 'on') return respon(req, res, 400, 'Cal que acceptis la política de privacitat.');

  const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACTE_DESTI } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return respon(req, res, 503, "El formulari encara no està actiu. Escriu-nos a avvcanyado@gmail.com.");

  try {
    const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
    await transport.sendMail({
      from: { name: 'Web AVV Canyadó', address: GMAIL_USER },
      to: CONTACTE_DESTI || GMAIL_USER,
      replyTo: { name: nom, address: correu },
      subject: `[Web] ${tema} — ${nom}`,
      text: `${missatge}\n\n— \nNom: ${nom}\nCorreu: ${correu}\nTema: ${tema}\nHa acceptat la política de privacitat.\nEnviat des del formulari de avvcanyado.nexsocial.org. Per respondre, fes «Respon».`,
    });
    return respon(req, res, 200, "Missatge enviat. Et respondrem al correu que ens has donat.");
  } catch (e) {
    console.error('contacte: error en enviar', e && e.code);
    return respon(req, res, 502, "No s'ha pogut enviar. Torna-ho a provar o escriu-nos a avvcanyado@gmail.com.");
  }
}
