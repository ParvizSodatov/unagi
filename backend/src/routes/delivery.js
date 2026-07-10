import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

// ─── Публичное чтение: активные зоны для витрины/корзины ───
router.get('/', (req, res) => {
  res.json(
    db
      .prepare('SELECT * FROM delivery_zones WHERE active = 1 ORDER BY sort, name')
      .all(),
  )
})

// ─── Админ: все зоны (включая выключенные) ───
router.get('/all', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM delivery_zones ORDER BY sort, name').all())
})

// ─── Админ: создать зону ───
router.post('/', requireAuth, (req, res) => {
  const { name, price = 0, min_order = 0, free_from = null, sort = 0, active = 1 } = req.body || {}
  if (!name) return res.status(400).json({ error: 'Укажите название зоны' })
  const info = db
    .prepare(
      'INSERT INTO delivery_zones (name, price, min_order, free_from, sort, active) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(name, Number(price) || 0, Number(min_order) || 0, free_from != null ? Number(free_from) : null, Number(sort) || 0, active ? 1 : 0)
  res.status(201).json(db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(info.lastInsertRowid))
})

// ─── Админ: изменить зону ───
router.put('/:id', requireAuth, (req, res) => {
  const zone = db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(req.params.id)
  if (!zone) return res.status(404).json({ error: 'Зона не найдена' })
  const { name, price, min_order, free_from, sort, active } = req.body || {}
  db.prepare(
    'UPDATE delivery_zones SET name = ?, price = ?, min_order = ?, free_from = ?, sort = ?, active = ? WHERE id = ?',
  ).run(
    name ?? zone.name,
    price != null ? Number(price) : zone.price,
    min_order != null ? Number(min_order) : zone.min_order,
    free_from !== undefined ? (free_from != null ? Number(free_from) : null) : zone.free_from,
    sort != null ? Number(sort) : zone.sort,
    active != null ? (active ? 1 : 0) : zone.active,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM delivery_zones WHERE id = ?').get(req.params.id))
})

// ─── Админ: удалить зону ───
router.delete('/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM delivery_zones WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Зона не найдена' })
  res.json({ ok: true })
})

export default router
