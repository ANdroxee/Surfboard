import { redirect } from '@sveltejs/kit';
import { SESSION_COOKIE, deleteSession, clearSessionCookie } from '$lib/server/auth.js';

// La déconnexion se fait uniquement en POST (formulaire), jamais par un simple lien.
export function load() {
  redirect(303, '/');
}

export const actions = {
  default: ({ cookies }) => {
    deleteSession(cookies.get(SESSION_COOKIE));
    clearSessionCookie(cookies);
    redirect(303, '/');
  },
};
