import { json, error } from '@sveltejs/kit';
import { updatePreferences } from '$lib/server/auth.js';

// Sauvegarde légère depuis le tableau de bord (mode, spot par défaut, favoris).
export async function PATCH({ request, locals }) {
  if (!locals.user) error(401, 'Non connecté');
  if (!request.headers.get('content-type')?.includes('application/json')) error(415, 'JSON attendu');
  let body;
  try { body = await request.json(); } catch { error(400, 'JSON invalide'); }
  if (!body || typeof body !== 'object') error(400, 'Requête invalide');
  return json(updatePreferences(locals.user.id, body));
}
