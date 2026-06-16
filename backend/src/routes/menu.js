import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

// ─── Публичное чтение ──────────────────────────────────────────────

// GET /api/menu — всё меню сразу: категории + блюда (для витрины)
router.get('/', (req, res) => {
  const categories = db.prepare('SELECT id, label FROM categories ORDER BY sort, label').all()
  const dishes = db.prepare('SELECT * FROM dishes WHERE available = 1 ORDER BY id').all()
  res.json({ categories, dishes })
})

// GET /api/menu/categories
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT id, label, sort FROM categories ORDER BY sort, label').all())
})

// GET /api/menu/dishes — для админки можно показать и скрытые: ?all=1
router.get('/dishes', (req, res) => {
  const showAll = req.query.all === '1'
  const sql = showAll
    ? 'SELECT * FROM dishes ORDER BY id'
    : 'SELECT * FROM dishes WHERE available = 1 ORDER BY id'
  res.json(db.prepare(sql).all())
})

// ─── CRUD категорий (только админ) ─────────────────────────────────

router.post('/categories', requireAuth, (req, res) => {
  const { id, label, sort = 0 } = req.body || {}
  if (!id || !label) return res.status(400).json({ error: 'Нужны id и label' })
  const exists = db.prepare('SELECT id FROM categories WHERE id = ?').get(id)
  if (exists) return res.status(409).json({ error: 'Категория с таким id уже есть' })
  db.prepare('INSERT INTO categories (id, label, sort) VALUES (?, ?, ?)').run(id, label, sort)
  res.status(201).json({ id, label, sort })
})

router.put('/categories/:id', requireAuth, (req, res) => {
  const { label, sort } = req.body || {}
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id)
  if (!cat) return res.status(404).json({ error: 'Категория не найдена' })
  db.prepare('UPDATE categories SET label = ?, sort = ? WHERE id = ?').run(
    label ?? cat.label,
    sort ?? cat.sort,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id))
})

router.delete('/categories/:id', requireAuth, (req, res) => {
  const used = db.prepare('SELECT COUNT(*) AS n FROM dishes WHERE cat = ?').get(req.params.id).n
  if (used > 0) return res.status(409).json({ error: `В категории есть блюда (${used}). Сначала перенесите или удалите их.` })
  const info = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Категория не найдена' })
  res.json({ ok: true })
})

// ─── CRUD блюд (только админ) ──────────────────────────────────────

router.post('/dishes', requireAuth, (req, res) => {
  const { name, cat, price, img = null, desc = null, available = 1 } = req.body || {}
  if (!name || !cat || price == null) return res.status(400).json({ error: 'Нужны name, cat и price' })
  const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(cat)
  if (!catExists) return res.status(400).json({ error: 'Такой категории нет' })
  const info = db
    .prepare('INSERT INTO dishes (name, cat, price, img, desc, available) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, cat, price, img, desc, available ? 1 : 0)
  res.status(201).json(db.prepare('SELECT * FROM dishes WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/dishes/:id', requireAuth, (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id)
  if (!dish) return res.status(404).json({ error: 'Блюдо не найдено' })
  const { name, cat, price, img, desc, available } = req.body || {}
  if (cat != null) {
    const catExists = db.prepare('SELECT id FROM categories WHERE id = ?').get(cat)
    if (!catExists) return res.status(400).json({ error: 'Такой категории нет' })
  }
  db.prepare(
    'UPDATE dishes SET name = ?, cat = ?, price = ?, img = ?, desc = ?, available = ? WHERE id = ?',
  ).run(
    name ?? dish.name,
    cat ?? dish.cat,
    price ?? dish.price,
    img !== undefined ? img : dish.img,
    desc !== undefined ? desc : dish.desc,
    available != null ? (available ? 1 : 0) : dish.available,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id))
})

router.delete('/dishes/:id', requireAuth, (req, res) => {
  const info = db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Блюдо не найдено' })
  res.json({ ok: true })
})

export default router
