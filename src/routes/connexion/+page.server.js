import { fail, redirect } from '@sveltejs/kit';
import {
  normalizeEmail, findUserByEmail, verifyPassword, burnPasswordCheck, createSession, setSessionCookie,
  safeRedirect, tooManyAttempts, recordFailure, clearFailures, clientIp,
} from '$lib/server/auth.js';

export function load({ locals, url }) {
  if (locals.user) redirect(303, safeRedirect(url.searchParams.get('redirect')));
}

export const actions = {
  default: async (event) => {
    const { request, cookies, url } = event;
    const form = await request.formData();
    const email = normalizeEmail(form.get('email'));
    const password = String(form.get('password') ?? '');

    const key = `login:${clientIp(event)}:${email}`;
    if (tooManyAttempts(key)) return fail(429, { email, error: 'Trop de tentatives. Réessaie dans 15 minutes.' });

    const user = email ? findUserByEmail(email) : null;
    const ok = user ? await verifyPassword(password, user.password_hash) : (await burnPasswordCheck(password), false);
    if (!ok) {
      recordFailure(key);
      return fail(400, { email, error: 'Email ou mot de passe incorrect.' });
    }

    clearFailures(key);
    const { token, expiresAt } = createSession(user.id, request.headers.get('user-agent') ?? '');
    setSessionCookie(cookies, token, expiresAt);
    redirect(303, safeRedirect(url.searchParams.get('redirect')));
  },
};
