import { fail, redirect } from '@sveltejs/kit';
import {
  normalizeEmail, isValidEmail, passwordProblem, cleanName, findUserByEmail, createUser,
  createSession, setSessionCookie, safeRedirect, tooManyAttempts, recordFailure, clientIp,
} from '$lib/server/auth.js';

export function load({ locals, url }) {
  if (locals.user) redirect(303, safeRedirect(url.searchParams.get('redirect')));
}

export const actions = {
  default: async (event) => {
    const { request, cookies, url } = event;
    const form = await request.formData();
    const name = cleanName(form.get('name'));
    const email = normalizeEmail(form.get('email'));
    const password = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const values = { name, email };

    const key = `signup:${clientIp(event)}`;
    if (tooManyAttempts(key)) return fail(429, { ...values, error: 'Trop de tentatives. Réessaie dans quelques minutes.' });

    if (!name) return fail(400, { ...values, field: 'name', error: 'Indique ton prénom ou un pseudo.' });
    if (!isValidEmail(email)) return fail(400, { ...values, field: 'email', error: 'Adresse email invalide.' });
    const pwErr = passwordProblem(password);
    if (pwErr) return fail(400, { ...values, field: 'password', error: pwErr });
    if (password !== confirm) return fail(400, { ...values, field: 'confirm', error: 'Les deux mots de passe ne correspondent pas.' });

    if (findUserByEmail(email)) {
      recordFailure(key);
      return fail(400, { ...values, field: 'email', error: 'Un compte existe déjà avec cet email. Connecte-toi plutôt.' });
    }

    let userId;
    try {
      userId = await createUser({ email, name, password });
    } catch (e) {
      if (String(e?.message).includes('UNIQUE')) return fail(400, { ...values, field: 'email', error: 'Un compte existe déjà avec cet email.' });
      console.error(e);
      return fail(500, { ...values, error: 'Impossible de créer le compte pour le moment.' });
    }

    const { token, expiresAt } = createSession(userId, request.headers.get('user-agent') ?? '');
    setSessionCookie(cookies, token, expiresAt);
    redirect(303, safeRedirect(url.searchParams.get('redirect')));
  },
};
