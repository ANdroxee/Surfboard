// Base SQLite intégrée à Node (node:sqlite, Node ≥ 22.13) — aucune dépendance externe.
// Fichier : $DATABASE_PATH, sinon ./data/surfboard.db (dossier ignoré par git).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

let db;

const MIGRATIONS = [
  `CREATE TABLE users (
     id            TEXT PRIMARY KEY,
     email         TEXT NOT NULL UNIQUE,
     name          TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     created_at    INTEGER NOT NULL
   );
   CREATE TABLE sessions (
     id          TEXT PRIMARY KEY,           -- SHA-256 du jeton (le jeton brut n'est jamais stocké)
     user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at  INTEGER NOT NULL,
     created_at  INTEGER NOT NULL,
     user_agent  TEXT
   );
   CREATE INDEX sessions_user ON sessions(user_id);
   CREATE TABLE preferences (
     user_id      TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     default_spot TEXT,
     mode         TEXT NOT NULL DEFAULT 'simple',
     favorites    TEXT NOT NULL DEFAULT '[]'
   );`,
];

/** Ouvre la base à la première utilisation (pas d'effet de bord au build). */
export function getDb() {
  if (db) return db;
  const path = resolve(process.env.DATABASE_PATH ?? 'data/surfboard.db');
  mkdirSync(dirname(path), { recursive: true });
  db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

  const version = db.prepare('PRAGMA user_version').get().user_version;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return db;
}
