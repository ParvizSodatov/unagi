import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import db from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

// ─── Публичное (по токену из ссылки курьера) ───

// GET /api/couriers/by-token/:token — курьер узнаёт, кто он (для своей страницы).
router.get('/by-token/:token', (req, res) => {
  const c = db
    .prepare('SELECT id, name, active FROM couriers WHERE token = ?')
    .get(req.params.token)
  if (!c) return res.status(404).json({ error: 'Ссылка недействительна' })
  res.json(c)
})

// POST /api/couriers/ping — курьер шлёт свои координаты (каждые неск. секунд).
router.post('/ping', (req, res) => {
  const { token, lat, lng } = req.body || {}
  if (!token || lat == null || lng == null) {
    return res.status(400).json({ error: 'Нужны token, lat и lng' })
  }
  const c = db.prepare('SELECT id FROM couriers WHERE token = ?').get(token)
  if (!c) return res.status(404).json({ error: 'Ссылка недействительна' })
  db.prepare("UPDATE couriers SET last_lat = ?, last_lng = ?, last_at = datetime('now') WHERE id = ?").run(
    Number(lat),
    Number(lng),
    c.id,
  )
  res.json({ ok: true })
})

// ─── Админ ───

// Список курьеров (без токена в открытом виде — только флаг, есть ли ссылка).
router.get('/', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM couriers ORDER BY name').all())
})

// Координаты активных курьеров для карты (только те, у кого есть позиция).
router.get('/locations', requireAuth, (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT id, name, phone, last_lat, last_lng, last_at,
                CAST((julianday('now') - julianday(last_at)) * 86400 AS INTEGER) AS seconds_ago
         FROM couriers
         WHERE active = 1 AND last_lat IS NOT NULL AND last_lng IS NOT NULL`,
      )
      .all(),
  )
})

router.post('/', requireAuth, (req, res) => {
  const { name, phone = null } = req.body || {}
  if (!name) return res.status(400).json({ error: 'Укажите имя курьера' })
  const token = randomUUID()
  const info = db.prepare('INSERT INTO couriers (name, phone, token) VALUES (?, ?, ?)').run(name, phone, token)
  res.status(201).json(db.prepare('SELECT * FROM couriers WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', requireAuth, (req, res) => {
  const c = db.prepare('SELECT * FROM couriers WHERE id = ?').get(req.params.id)
  if (!c) return res.status(404).json({ error: 'Курьер не найден' })
  const { name, phone, active } = req.body || {}
  db.prepare('UPDATE couriers SET name = ?, phone = ?, active = ? WHERE id = ?').run(
    name ?? c.name,
    phone !== undefined ? phone : c.phone,
    active != null ? (active ? 1 : 0) : c.active,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM couriers WHERE id = ?').get(req.params.id))
})

router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM couriers WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Курьер не найден' })
  res.json({ ok: true })
})

export default router
