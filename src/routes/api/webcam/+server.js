import { json, error } from '@sveltejs/kit';
import { resolveWebcam } from '$lib/server/webcams.js';

// GET /api/webcam?spot=Lacanau&i=0 → { ok, src, live, capturedAt } (flux le plus récent)
export async function GET({ url, locals, setHeaders }) {
  if (!locals.user) error(401, 'Non connecté');
  const spot = url.searchParams.get('spot') ?? '';
  const i = Number(url.searchParams.get('i') ?? 0);
  if (!Number.isInteger(i) || i < 0 || i > 10) error(400, 'Index invalide');
  const result = await resolveWebcam(spot, i);
  if (!result) error(404, 'Webcam inconnue');
  setHeaders({ 'cache-control': 'private, max-age=60' });
  return json(result);
}
