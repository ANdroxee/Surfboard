import { getPreferences } from '$lib/server/auth.js';

export function load({ locals }) {
  if (!locals.user) return { user: null };
  return {
    user: { name: locals.user.name, email: locals.user.email, prefs: getPreferences(locals.user.id) },
  };
}
