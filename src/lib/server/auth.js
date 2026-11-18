import { scrypt, randomBytes, timingSafeEqual, createHash, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { getDb } from './db.js';
import { SPOTS } from '$lib/api.js';

const scryptAsync = promisify(scrypt);

export const SESSION_COOKIE = 'sb_session';
const SESSION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;

// ─── Mots de passe (scrypt, sel aléatoire, comparaison en temps constant) ───
const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const [algo, n, r, p, saltB64, keyB64] = String(stored).split('$');
  if (algo !== 'scrypt') return false;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scryptAsync(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

// Hash factice : on vérifie quand même un mot de passe quand l'email n'existe pas,
// pour ne pas révéler par le temps de réponse quels emails ont un compte.
let dummyHash;
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword('surfboard-dummy-password');
  await verifyPassword(password, dummyHash);
}

// ─── Validation ───
export const normalizeEmail = (e) => String(e ?? '').trim().toLowerCase();
export const isValidEmail = (e) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
export function passwordProblem(pw) {
  if (pw.length < 8) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (pw.length > 200) return 'Le mot de passe est trop long (200 caractères max).';
  return null;
}
export const cleanName = (n) => String(n ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);

// ─── Utilisateurs ───
export function findUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email);
}

export async function createUser({ email, name, password }) {
  const db = getDb();
  const id = randomUUID();
  const hash = await hashPassword(password);
  db.exec('BEGIN');
  try {
    db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(id, email, name, hash, Date.now());
    db.prepare('INSERT INTO preferences (user_id) VALUES (?)').run(id);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  return id;
}

export function deleteUser(userId) {
  getDb().prepare('DELETE FROM users WHERE id = ?').run(userId); // sessions et préférences en cascade
}

export function updateName(userId, name) {
  getDb().prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId);
}

export function updateEmail(userId, email) {
  getDb().prepare('UPDATE users SET email = ? WHERE id = ?').run(email, userId);
}

export async function updatePassword(userId, password) {
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(password), userId);
}

export function getPasswordHash(userId) {
  return getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(userId)?.password_hash;
}

// ─── Préférences ───
const SPOT_NAMES = new Set(SPOTS.map((s) => s.name));

export function getPreferences(userId) {
  const row = getDb().prepare('SELECT default_spot, mode, favorites FROM preferences WHERE user_id = ?').get(userId);
  let favorites = [];
  try { favorites = JSON.parse(row?.favorites ?? '[]').filter((f) => SPOT_NAMES.has(f)); } catch {}
  return {
    defaultSpot: SPOT_NAMES.has(row?.default_spot) ? row.default_spot : null,
    mode: row?.mode === 'expert' ? 'expert' : 'simple',
    favorites,
  };
}

/** Met à jour uniquement les champs fournis et valides. Renvoie les préférences à jour. */
export function updatePreferences(userId, patch) {
  const cur = getPreferences(userId);
  const next = { ...cur };
  if ('defaultSpot' in patch) next.defaultSpot = SPOT_NAMES.has(patch.defaultSpot) ? patch.defaultSpot : null;
  if ('mode' in patch && (patch.mode === 'simple' || patch.mode === 'expert')) next.mode = patch.mode;
  if ('favorites' in patch && Array.isArray(patch.favorites)) {
    next.favorites = [...new Set(patch.favorites.filter((f) => SPOT_NAMES.has(f)))];
  }
  getDb()
    .prepare(`INSERT INTO preferences (user_id, default_spot, mode, favorites) VALUES (?, ?, ?, ?)
              ON CONFLICT(user_id) DO UPDATE SET default_spot = excluded.default_spot, mode = excluded.mode, favorites = excluded.favorites`)
    .run(userId, next.defaultSpot, next.mode, JSON.stringify(next.favorites));
  return next;
}

// ─── Sessions (jeton aléatoire dans un cookie httpOnly ; seul son SHA-256 est en base) ───
const sha256 = (t) => createHash('sha256').update(t).digest('hex');

export function createSession(userId, userAgent = '') {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * DAY;
  getDb()
    .prepare('INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent) VALUES (?, ?, ?, ?, ?)')
    .run(sha256(token), userId, expiresAt, Date.now(), String(userAgent).slice(0, 300));
  return { token, expiresAt };
}

/** Renvoie { user, session } ou null. Prolonge la session si elle expire dans moins de 15 jours. */
export function validateSession(token) {
  if (!token) return null;
  const db = getDb();
  const id = sha256(token);
  const row = db
    .prepare(`SELECT s.id, s.expires_at, u.id AS user_id, u.email, u.name, u.created_at
              FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?`)
    .get(id);
  if (!row) return null;
  if (Date.now() >= row.expires_at) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return null;
  }
  let expiresAt = row.expires_at;
  if (expiresAt - Date.now() < 15 * DAY) {
    expiresAt = Date.now() + SESSION_DAYS * DAY;
    db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expiresAt, id);
  }
  return {
    user: { id: row.user_id, email: row.email, name: row.name, createdAt: row.created_at },
    session: { id, expiresAt, renewed: expiresAt !== row.expires_at },
  };
}

export function deleteSession(token) {
  if (token) getDb().prepare('DELETE FROM sessions WHERE id = ?').run(sha256(token));
}

export function deleteOtherSessions(userId, keepToken) {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(userId, sha256(keepToken ?? ''));
}

export function countSessions(userId) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?').get(userId, Date.now()).n;
}

export function purgeExpiredSessions() {
  getDb().prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

export function setSessionCookie(cookies, token, expiresAt) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    // secure est activé automatiquement par SvelteKit hors http://localhost
    expires: new Date(expiresAt),
  });
}

export function clearSessionCookie(cookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

// ─── Limitation des tentatives (mémoire) : 8 essais / 15 min par IP + email ───
const attempts = new Map();
const WINDOW = 15 * 60 * 1000, MAX = 8;

export function tooManyAttempts(key) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.start > WINDOW) return false;
  return a.count >= MAX;
}
export function recordFailure(key) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || now - a.start > WINDOW) attempts.set(key, { start: now, count: 1 });
  else a.count++;
  if (attempts.size > 10_000) for (const [k, v] of attempts) if (now - v.start > WINDOW) attempts.delete(k);
}
export const clearFailures = (key) => attempts.delete(key);

export function clientIp(event) {
  try { return event.getClientAddress(); } catch { return 'unknown'; }
}

/** N'autorise que les redirections internes (évite les redirections ouvertes vers un autre site). */
export function safeRedirect(to) {
  const s = String(to ?? '');
  return s.startsWith('/') && !s.startsWith('//') && !s.startsWith('/\\') ? s : '/';
}
