import { building } from '$app/environment';
import { SESSION_COOKIE, validateSession, setSessionCookie, clearSessionCookie, purgeExpiredSessions } from '$lib/server/auth.js';

let lastPurge = 0;

export async function handle({ event, resolve }) {
  event.locals.user = null;
  if (building) return resolve(event); // pas d'accès à la base pendant le build
  const token = event.cookies.get(SESSION_COOKIE);
  if (token) {
    const result = validateSession(token);
    if (result) {
      event.locals.user = result.user;
      if (result.session.renewed) setSessionCookie(event.cookies, token, result.session.expiresAt);
    } else {
      clearSessionCookie(event.cookies);
    }
  }

  if (Date.now() - lastPurge > 60 * 60 * 1000) {
    lastPurge = Date.now();
    try { purgeExpiredSessions(); } catch {}
  }

  return resolve(event);
}
