// Résolution des webcams côté serveur : retrouve le flux le plus récent et l'heure de capture.
//
// Pourquoi : les caméras Viewsurf en « clips » (VOD) publient un nouvel identifiant à chaque clip.
// Un identifiant écrit en dur reste bloqué sur un vieux clip (ex. une image de nuit).
// On relit donc la page publique de la caméra pour trouver le lecteur actuel.
import { SPOTS } from '$lib/api.js';

const UA = 'Mozilla/5.0 (compatible; Surfboard/1.0)';
const TTL = 2 * 60 * 1000;
const cache = new Map();

async function get(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(t);
  }
}

/** Heure « murale » de Paris (AAAA, MM, JJ, hh, mm) → Date UTC. */
function parisToDate(y, mo, d, h, mi) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', timeZoneName: 'shortOffset' })
    .formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+1';
  const m = off.match(/GMT([+-]\d+)(?::(\d+))?/);
  const minutes = m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 60;
  return new Date(guess - minutes * 60_000);
}

async function resolveViewsurf(cam) {
  const html = await get(cam.page);
  const m = html.match(/embeded\.html\?uuid=([A-Za-z0-9-]+)&(?:amp;)?type=(live|vod)/);

  // 1. Direct disponible → lecteur live
  if (m?.[2] === 'live') {
    return { ok: true, kind: 'iframe', live: true, capturedAt: null,
      src: `https://platforms5.joada.net/embeded/embeded.html?uuid=${m[1]}&type=live&liveicon=0&tz=Europe/Paris` };
  }

  // 2. Clips MP4 publiés sur la page (…/media_<horodatage unix>.mp4) → le plus récent, lu en natif
  const clips = [...html.matchAll(/https:\/\/filmssite\.viewsurf\.com\/[\w/.-]+\/media_(\d{9,11})\.mp4/g)];
  if (clips.length) {
    const [url, ts] = clips.reduce((a, b) => (+b[1] > +a[1] ? b : a));
    return { ok: true, kind: 'video', live: false, src: url, capturedAt: new Date(+ts * 1000).toISOString() };
  }

  // 3. Ancien lecteur en clip (VOD)
  if (!m) return { ok: false, reason: 'Caméra hors ligne chez Viewsurf' };
  const [, uuid, type] = m;
  const src = `https://platforms5.joada.net/embeded/embeded.html?uuid=${uuid}&type=${type}&liveicon=0&tz=Europe/Paris`;

  // Clip : heure de la dernière image via la playlist HLS
  let capturedAt = null;
  try {
    const manifest = JSON.parse(await get(`https://platforms6.joada.net/api/videos/manifest/${uuid}`));
    const master = await get(manifest.m3u8);
    const media = master.split('\n').find((l) => l && !l.startsWith('#'));
    const playlist = await get(new URL(media, manifest.m3u8).href);
    const stamps = [...playlist.matchAll(/#EXT-X-PROGRAM-DATE-TIME:(\S+)/g)];
    if (stamps.length) capturedAt = new Date(stamps.at(-1)[1]).toISOString();
  } catch {}
  return { ok: true, kind: 'iframe', src, live: false, capturedAt };
}

async function resolveSkaping(cam) {
  const src = `https://www.skaping.com/${cam.path}`;
  if (cam.mode === 'live') return { ok: true, kind: 'iframe', src: `${src}/live`, live: true, capturedAt: null };
  if (cam.mode === 'video') {
    // La page pointe vers le dernier clip : …/AAAA/MM/JJ/hh-mm.mp4 (heure de Paris)
    let capturedAt = null;
    try {
      const html = await get(`${src}/video`);
      const m = html.match(/\/(\d{4})\/(\d{2})\/(\d{2})\/(\d{2})-(\d{2})\.mp4/);
      if (m) capturedAt = parisToDate(+m[1], +m[2], +m[3], +m[4], +m[5]).toISOString();
    } catch {}
    return { ok: true, kind: 'iframe', src: `${src}/video`, live: false, capturedAt };
  }
  return { ok: true, kind: 'iframe', src, live: false, capturedAt: null, panorama: true };
}

export async function resolveWebcam(spotName, index) {
  const spot = SPOTS.find((s) => s.name === spotName);
  const cam = spot?.webcams?.[index];
  if (!cam) return null;
  const key = `${spotName}#${index}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;

  let value;
  try {
    value = cam.provider === 'viewsurf' ? await resolveViewsurf(cam) : await resolveSkaping(cam);
  } catch {
    value = { ok: false, reason: 'Source de la webcam injoignable' };
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}
