import { fail, redirect } from '@sveltejs/kit';
import { SPOTS } from '$lib/api.js';
import {
  SESSION_COOKIE, getPreferences, updatePreferences, cleanName, normalizeEmail, isValidEmail, findUserByEmail,
  updateName, updateEmail, getPasswordHash, verifyPassword, passwordProblem, updatePassword,
  deleteOtherSessions, countSessions, deleteUser, deleteSession, clearSessionCookie,
  tooManyAttempts, recordFailure, clearFailures, clientIp,
} from '$lib/server/auth.js';

function requireUser(locals) {
  if (!locals.user) redirect(303, '/connexion?redirect=/compte');
  return locals.user;
}

/** Vérifie le mot de passe actuel, avec limitation des essais. Renvoie un message d'erreur ou null. */
async function checkCurrentPassword(event, userId, password, section) {
  const key = `pw:${clientIp(event)}:${userId}`;
  if (tooManyAttempts(key)) return { section, error: 'Trop de tentatives. Réessaie dans 15 minutes.' };
  if (!(await verifyPassword(password, getPasswordHash(userId)))) {
    recordFailure(key);
    return { section, field: 'current', error: 'Mot de passe actuel incorrect.' };
  }
  clearFailures(key);
  return null;
}

export function load({ locals }) {
  const user = requireUser(locals);
  return {
    account: { name: user.name, email: user.email, createdAt: user.createdAt },
    prefs: getPreferences(user.id),
    sessions: countSessions(user.id),
    spots: SPOTS.map((s) => s.name),
  };
}

export const actions = {
  profile: async (event) => {
    const user = requireUser(event.locals);
    const form = await event.request.formData();
    const name = cleanName(form.get('name'));
    const email = normalizeEmail(form.get('email'));
    if (!name) return fail(400, { section: 'profile', field: 'name', error: 'Le prénom ne peut pas être vide.' });
    if (!isValidEmail(email)) return fail(400, { section: 'profile', field: 'email', error: 'Adresse email invalide.' });

    if (email !== user.email) {
      // Changer d'email demande le mot de passe
      const err = await checkCurrentPassword(event, user.id, String(form.get('current') ?? ''), 'profile');
      if (err) return fail(400, { ...err, error: err.field ? 'Mot de passe requis pour changer d’email (incorrect).' : err.error });
      const other = findUserByEmail(email);
      if (other && other.id !== user.id) return fail(400, { section: 'profile', field: 'email', error: 'Cet email est déjà utilisé.' });
      updateEmail(user.id, email);
    }
    updateName(user.id, name);
    return { section: 'profile', ok: 'Profil mis à jour.' };
  },

  preferences: async ({ locals, request }) => {
    const user = requireUser(locals);
    const form = await request.formData();
    updatePreferences(user.id, {
      defaultSpot: String(form.get('defaultSpot') ?? '') || null,
      mode: String(form.get('mode') ?? 'simple'),
      favorites: form.getAll('favorites').map(String),
    });
    return { section: 'preferences', ok: 'Préférences enregistrées.' };
  },

  password: async (event) => {
    const user = requireUser(event.locals);
    const form = await event.request.formData();
    const next = String(form.get('password') ?? '');
    const confirm = String(form.get('confirm') ?? '');
    const err = await checkCurrentPassword(event, user.id, String(form.get('current') ?? ''), 'password');
    if (err) return fail(400, err);
    const pwErr = passwordProblem(next);
    if (pwErr) return fail(400, { section: 'password', field: 'password', error: pwErr });
    if (next !== confirm) return fail(400, { section: 'password', field: 'confirm', error: 'Les deux mots de passe ne correspondent pas.' });
    await updatePassword(user.id, next);
    deleteOtherSessions(user.id, event.cookies.get(SESSION_COOKIE)); // déconnecte les autres appareils
    return { section: 'password', ok: 'Mot de passe modifié. Tes autres appareils ont été déconnectés.' };
  },

  logoutOthers: ({ locals, cookies }) => {
    const user = requireUser(locals);
    deleteOtherSessions(user.id, cookies.get(SESSION_COOKIE));
    return { section: 'sessions', ok: 'Tous tes autres appareils ont été déconnectés.' };
  },

  delete: async (event) => {
    const user = requireUser(event.locals);
    const form = await event.request.formData();
    if (String(form.get('confirmText') ?? '').trim().toUpperCase() !== 'SUPPRIMER') {
      return fail(400, { section: 'delete', field: 'confirmText', error: 'Tape SUPPRIMER pour confirmer.' });
    }
    const err = await checkCurrentPassword(event, user.id, String(form.get('current') ?? ''), 'delete');
    if (err) return fail(400, err);
    deleteSession(event.cookies.get(SESSION_COOKIE));
    deleteUser(user.id);
    clearSessionCookie(event.cookies);
    redirect(303, '/');
  },
};
