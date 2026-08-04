import { DatabaseSync } from 'node:sqlite'
import { dbPath } from './paths.js'

export const db = new DatabaseSync(dbPath)
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

// Хелпер транзакций (в node:sqlite нет .transaction(), делаем вручную).
// Использование: transaction(() => { ...запросы... })
export function transaction(fn) {
  db.exec('BEGIN')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}

// Схема. Создаётся один раз, если таблиц ещё нет.
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    sort  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS dishes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    cat        TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    price      REAL NOT NULL,
    img        TEXT,
    desc       TEXT,
    available  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    login         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    customer     TEXT NOT NULL,
    phone        TEXT NOT NULL,
    address      TEXT,
    comment      TEXT,
    total        REAL NOT NULL,
    status       TEXT NOT NULL DEFAULT 'new',
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id  INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id   INTEGER,
    name      TEXT NOT NULL,
    price     REAL NOT NULL,
    qty       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    role       TEXT NOT NULL,
    phone      TEXT,
    salary     REAL NOT NULL DEFAULT 0,
    status     TEXT NOT NULL DEFAULT 'active',
    hired_at   TEXT,
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS salary_payments (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id  INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    amount    REAL NOT NULL,
    period    TEXT,
    comment   TEXT,
    paid_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS salary_adjustments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id   INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    amount     REAL NOT NULL,
    reason     TEXT,
    period     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS shifts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id   INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date       TEXT NOT NULL,
    hours      REAL NOT NULL DEFAULT 0,
    note       TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS delivery_zones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    price     REAL NOT NULL DEFAULT 0,
    min_order REAL NOT NULL DEFAULT 0,
    free_from REAL,                       -- бесплатная доставка от суммы (NULL — нет)
    sort      INTEGER NOT NULL DEFAULT 0,
    active    INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS couriers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    phone      TEXT,
    token      TEXT NOT NULL UNIQUE,      -- секрет в ссылке курьера (без пароля)
    active     INTEGER NOT NULL DEFAULT 1,
    last_lat   REAL,                      -- последняя координата
    last_lng   REAL,
    last_at    TEXT,                      -- когда обновлялась
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// ─── Мягкие миграции: добавляем недостающие колонки в существующие таблицы ───
function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
  }
}

// Доставка в заказе: название зоны и её стоимость (для заказов, созданных до фичи — 0).
ensureColumn('orders', 'delivery_zone', 'TEXT')
ensureColumn('orders', 'delivery_fee', 'REAL NOT NULL DEFAULT 0')

export default db
