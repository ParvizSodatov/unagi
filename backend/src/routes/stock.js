import { Router } from 'express'
import db, { transaction } from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
router.use(requireAuth)

// Отменённые заказы продуктов не тратят.
const NOT_CANCELED = "o.status != 'canceled'"

// Точка отсчёта, когда ревизий ещё не было.
const EPOCH = '1970-01-01 00:00:00'

// Текущий момент в том же формате, в каком SQLite пишет datetime('now') — UTC.
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

// ─── Расчёт остатков ───────────────────────────────────────────────
// Остаток нигде не хранится. Он всегда считается от последней проведённой ревизии:
//   остаток = факт ревизии + приход − списания − продажи
// Поэтому остаток не расходится с движениями и не зависит от порядка операций.

function lastAppliedRevision() {
  return db
    .prepare('SELECT * FROM revisions WHERE applied_at IS NOT NULL ORDER BY to_at DESC, id DESC LIMIT 1')
    .get()
}

// Остатки на момент последней ревизии: Map product_id → количество.
function baseline() {
  const rev = lastAppliedRevision()
  if (!rev) return { since: EPOCH, opening: new Map() }
  const items = db
    .prepare('SELECT product_id AS pid, actual FROM revision_items WHERE revision_id = ?')
    .all(rev.id)
  return { since: rev.to_at, opening: new Map(items.map((i) => [i.pid, i.actual ?? 0])) }
}

// Теоретический расход по продажам за период: заказы × техкарта.
// Блюда без техкарты сюда не попадают — их расход системе неизвестен.
function soldBetween(from, to) {
  const rows = db
    .prepare(
      `SELECT dp.product_id AS pid, SUM(oi.qty * dp.qty) AS qty
         FROM order_items oi
         JOIN orders o        ON o.id = oi.order_id
         JOIN dish_products dp ON dp.dish_id = oi.dish_id
        WHERE ${NOT_CANCELED} AND o.created_at > ? AND o.created_at <= ?
        GROUP BY dp.product_id`,
    )
    .all(from, to)
  return new Map(rows.map((r) => [r.pid, r.qty]))
}

// Приходы и списания за период: Map product_id → { in, out }.
function movesBetween(from, to) {
  const rows = db
    .prepare(
      `SELECT product_id AS pid, type, SUM(qty) AS qty
         FROM stock_moves
        WHERE created_at > ? AND created_at <= ?
        GROUP BY product_id, type`,
    )
    .all(from, to)
  const map = new Map()
  for (const r of rows) {
    const cur = map.get(r.pid) || { in: 0, out: 0 }
    if (r.type === 'in') cur.in += r.qty
    else cur.out += r.qty
    map.set(r.pid, cur)
  }
  return map
}

// Раскладка по каждому продукту с прошлой ревизии и до момента `to`.
function breakdown(to) {
  const { since, opening } = baseline()
  const sold = soldBetween(since, to)
  const moves = movesBetween(since, to)
  const products = db.prepare('SELECT * FROM products ORDER BY name').all()

  return products.map((p) => {
    const m = moves.get(p.id) || { in: 0, out: 0 }
    const open = opening.get(p.id) ?? 0
    const spent = sold.get(p.id) ?? 0
    const stock = open + m.in - m.out - spent
    return {
      ...p,
      opening: round(open),
      income: round(m.in),
      written_off: round(m.out),
      sold: round(spent),
      stock: round(stock),
      value: round(stock * p.price),
      low: p.min_stock > 0 && stock < p.min_stock,
    }
  })
}

// Округляем до 2 знаков — иначе накапливается мусор от float.
const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100

// ─── Продукты ──────────────────────────────────────────────────────

// GET /api/stock/products — справочник с текущими остатками
router.get('/products', (req, res) => {
  const { since } = baseline()
  res.json({ since, products: breakdown(now()) })
})

router.post('/products', (req, res) => {
  const { name, unit = 'г', price = 0, min_stock = 0 } = req.body || {}
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Нужно название' })
  const exists = db.prepare('SELECT id FROM products WHERE name = ?').get(String(name).trim())
  if (exists) return res.status(409).json({ error: 'Такой продукт уже есть' })
  const info = db
    .prepare('INSERT INTO products (name, unit, price, min_stock) VALUES (?, ?, ?, ?)')
    .run(String(name).trim(), unit, price, min_stock)
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/products/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Продукт не найден' })
  const { name, unit, price, min_stock, active } = req.body || {}
  db.prepare(
    'UPDATE products SET name = ?, unit = ?, price = ?, min_stock = ?, active = ? WHERE id = ?',
  ).run(
    name ?? p.name,
    unit ?? p.unit,
    price ?? p.price,
    min_stock ?? p.min_stock,
    active != null ? (active ? 1 : 0) : p.active,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id))
})

router.delete('/products/:id', (req, res) => {
  const used = db
    .prepare('SELECT COUNT(*) AS n FROM dish_products WHERE product_id = ?')
    .get(req.params.id).n
  if (used > 0) {
    return res
      .status(409)
      .json({ error: `Продукт стоит в техкартах (${used}). Сначала уберите его из блюд.` })
  }
  const info = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Продукт не найден' })
  res.json({ ok: true })
})

// POST /api/stock/products/:id/merge — слить продукт в другой: { into: id }
// Нужно для чистки справочника от синонимов («Креветка» и «Креветки тигровые»).
// Техкарты и движения переезжают на целевой продукт, исходный удаляется.
router.post('/products/:id/merge', (req, res) => {
  const from = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  const into = db.prepare('SELECT * FROM products WHERE id = ?').get(req.body?.into)
  if (!from || !into) return res.status(404).json({ error: 'Продукт не найден' })
  if (from.id === into.id) return res.status(400).json({ error: 'Нельзя слить продукт сам в себя' })
  if (from.unit !== into.unit) {
    return res.status(400).json({ error: `Разные единицы: ${from.unit} и ${into.unit}` })
  }

  transaction(() => {
    // Если блюдо содержит оба продукта — складываем количества в один ряд.
    const clashes = db
      .prepare(
        `SELECT a.dish_id, a.qty AS from_qty, b.id AS into_row
           FROM dish_products a
           JOIN dish_products b ON b.dish_id = a.dish_id AND b.product_id = ?
          WHERE a.product_id = ?`,
      )
      .all(into.id, from.id)
    for (const c of clashes) {
      db.prepare('UPDATE dish_products SET qty = qty + ? WHERE id = ?').run(c.from_qty, c.into_row)
      db.prepare('DELETE FROM dish_products WHERE dish_id = ? AND product_id = ?').run(c.dish_id, from.id)
    }
    db.prepare('UPDATE dish_products SET product_id = ? WHERE product_id = ?').run(into.id, from.id)
    db.prepare('UPDATE stock_moves   SET product_id = ? WHERE product_id = ?').run(into.id, from.id)
    db.prepare('DELETE FROM revision_items WHERE product_id = ?').run(from.id)
    db.prepare('DELETE FROM products WHERE id = ?').run(from.id)
  })

  res.json({ ok: true, merged: from.name, into: into.name })
})

// ─── Техкарты ──────────────────────────────────────────────────────

// GET /api/stock/recipes — сводка: у каких блюд техкарта есть, у каких нет
router.get('/recipes', (req, res) => {
  const rows = db
    .prepare(
      `SELECT d.id, d.name, d.cat, d.price, d.composition,
              COUNT(dp.id) AS items,
              COALESCE(SUM(dp.qty * p.price), 0) AS cost
         FROM dishes d
         LEFT JOIN dish_products dp ON dp.dish_id = d.id
         LEFT JOIN products p       ON p.id = dp.product_id
        GROUP BY d.id
        ORDER BY d.id`,
    )
    .all()
  res.json(
    rows.map((r) => ({
      ...r,
      cost: round(r.cost),
      // Доля себестоимости в цене — food cost. Больше 35% для суши обычно повод присмотреться.
      food_cost: r.price > 0 ? Math.round((r.cost / r.price) * 100) : null,
    })),
  )
})

// GET /api/stock/recipes/:dishId — состав одного блюда
router.get('/recipes/:dishId', (req, res) => {
  const dish = db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.dishId)
  if (!dish) return res.status(404).json({ error: 'Блюдо не найдено' })
  const items = db
    .prepare(
      `SELECT dp.product_id, dp.qty, p.name, p.unit, p.price
         FROM dish_products dp
         JOIN products p ON p.id = dp.product_id
        WHERE dp.dish_id = ?
        ORDER BY p.name`,
    )
    .all(req.params.dishId)
  res.json({ dish, items })
})

// PUT /api/stock/recipes/:dishId — заменить состав целиком: { items: [{ product_id, qty }] }
router.put('/recipes/:dishId', (req, res) => {
  const dish = db.prepare('SELECT id FROM dishes WHERE id = ?').get(req.params.dishId)
  if (!dish) return res.status(404).json({ error: 'Блюдо не найдено' })
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  for (const it of items) {
    if (!it.product_id || !(it.qty > 0)) {
      return res.status(400).json({ error: 'У каждой строки нужен продукт и количество больше нуля' })
    }
  }
  transaction(() => {
    db.prepare('DELETE FROM dish_products WHERE dish_id = ?').run(req.params.dishId)
    const ins = db.prepare('INSERT INTO dish_products (dish_id, product_id, qty) VALUES (?, ?, ?)')
    for (const it of items) ins.run(req.params.dishId, it.product_id, it.qty)
  })
  res.json({ ok: true, count: items.length })
})

// DELETE /api/stock/recipes/:dishId — убрать техкарту, само блюдо остаётся
router.delete('/recipes/:dishId', (req, res) => {
  const dish = db.prepare('SELECT id FROM dishes WHERE id = ?').get(req.params.dishId)
  if (!dish) return res.status(404).json({ error: 'Блюдо не найдено' })
  const info = db.prepare('DELETE FROM dish_products WHERE dish_id = ?').run(req.params.dishId)
  if (info.changes === 0) return res.status(400).json({ error: 'У этого блюда и так нет техкарты' })
  res.json({ ok: true, removed: info.changes })
})

// ─── Движения: приход и списание ───────────────────────────────────

router.get('/moves', (req, res) => {
  const { product_id, type, from, to } = req.query
  const where = []
  const args = []
  if (product_id) { where.push('m.product_id = ?'); args.push(product_id) }
  if (type) { where.push('m.type = ?'); args.push(type) }
  if (from) { where.push('m.created_at >= ?'); args.push(from) }
  if (to) { where.push('m.created_at <= ?'); args.push(to) }
  const sql = `SELECT m.*, p.name AS product_name, p.unit
                 FROM stock_moves m
                 JOIN products p ON p.id = m.product_id
                ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 500`
  res.json(db.prepare(sql).all(...args))
})

router.post('/moves', (req, res) => {
  const { product_id, type, qty, price = null, comment = null, created_at } = req.body || {}
  if (!product_id || !['in', 'out'].includes(type) || !(qty > 0)) {
    return res.status(400).json({ error: 'Нужны продукт, тип (in/out) и количество больше нуля' })
  }
  const p = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id)
  if (!p) return res.status(400).json({ error: 'Такого продукта нет' })
  const info = db
    .prepare(
      'INSERT INTO stock_moves (product_id, type, qty, price, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(product_id, type, qty, price, comment, created_at || now())
  res.status(201).json(db.prepare('SELECT * FROM stock_moves WHERE id = ?').get(info.lastInsertRowid))
})

router.delete('/moves/:id', (req, res) => {
  const info = db.prepare('DELETE FROM stock_moves WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Движение не найдено' })
  res.json({ ok: true })
})

// ─── Отчёт по расходу за период ────────────────────────────────────

// GET /api/stock/consumption?from=2026-09-01&to=2026-09-30
router.get('/consumption', (req, res) => {
  // По умолчанию — с первого числа текущего месяца.
  const monthStart = `${new Date().toISOString().slice(0, 7)}-01`
  const from = `${req.query.from || monthStart} 00:00:00`
  const to = req.query.to ? `${req.query.to} 23:59:59` : now()

  const sold = soldBetween(from, to)
  const moves = movesBetween(from, to)
  const products = db.prepare('SELECT * FROM products ORDER BY name').all()

  const rows = products
    .map((p) => {
      const spent = sold.get(p.id) ?? 0
      const m = moves.get(p.id) || { in: 0, out: 0 }
      return {
        id: p.id,
        name: p.name,
        unit: p.unit,
        price: p.price,
        sold: round(spent),
        income: round(m.in),
        written_off: round(m.out),
        sum: round(spent * p.price),
      }
    })
    .filter((r) => r.sold || r.income || r.written_off)

  // Блюда, которые продавались, но техкарты не имеют — их расход не учтён.
  const untracked = db
    .prepare(
      `SELECT oi.name, SUM(oi.qty) AS qty
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE ${NOT_CANCELED} AND o.created_at > ? AND o.created_at <= ?
          AND (oi.dish_id IS NULL
               OR NOT EXISTS (SELECT 1 FROM dish_products dp WHERE dp.dish_id = oi.dish_id))
        GROUP BY oi.name
        ORDER BY qty DESC`,
    )
    .all(from, to)

  res.json({ from, to, rows, untracked })
})

// ─── Ревизия ───────────────────────────────────────────────────────

router.get('/revisions', (req, res) => {
  res.json(
    db
      .prepare(
        `SELECT r.*, COUNT(ri.id) AS items,
                SUM(CASE WHEN ri.actual IS NOT NULL THEN 1 ELSE 0 END) AS counted
           FROM revisions r
           LEFT JOIN revision_items ri ON ri.revision_id = r.id
          GROUP BY r.id
          ORDER BY r.to_at DESC, r.id DESC`,
      )
      .all(),
  )
})

// POST /api/stock/revisions — собрать черновик акта.
// Период всегда начинается там, где закончилась прошлая проведённая ревизия:
// иначе остаток на начало взять неоткуда и цифры будут выдуманные.
router.post('/revisions', (req, res) => {
  const draft = db.prepare('SELECT id FROM revisions WHERE applied_at IS NULL').get()
  if (draft) {
    return res.status(409).json({ error: 'Есть незавершённая ревизия. Проведите или удалите её.' })
  }

  const { opening, since } = baseline()
  const to = req.body?.to ? `${req.body.to} 23:59:59` : now()
  if (to <= since) {
    return res.status(400).json({ error: 'Конец периода должен быть позже прошлой ревизии' })
  }
  const period = req.body?.period || to.slice(0, 7)
  const comment = req.body?.comment || null

  const sold = soldBetween(since, to)
  const moves = movesBetween(since, to)
  const products = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY name').all()

  const id = transaction(() => {
    const info = db
      .prepare('INSERT INTO revisions (period, from_at, to_at, comment) VALUES (?, ?, ?, ?)')
      .run(period, since, to, comment)
    const revId = info.lastInsertRowid
    const ins = db.prepare(
      `INSERT INTO revision_items
         (revision_id, product_id, opening, income, sold, written_off, expected)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    for (const p of products) {
      const m = moves.get(p.id) || { in: 0, out: 0 }
      const open = opening.get(p.id) ?? 0
      const spent = sold.get(p.id) ?? 0
      ins.run(revId, p.id, round(open), round(m.in), round(spent), round(m.out), round(open + m.in - m.out - spent))
    }
    return revId
  })

  res.status(201).json(db.prepare('SELECT * FROM revisions WHERE id = ?').get(id))
})

router.get('/revisions/:id', (req, res) => {
  const rev = db.prepare('SELECT * FROM revisions WHERE id = ?').get(req.params.id)
  if (!rev) return res.status(404).json({ error: 'Ревизия не найдена' })
  const items = db
    .prepare(
      `SELECT ri.*, p.name, p.unit, p.price
         FROM revision_items ri
         JOIN products p ON p.id = ri.product_id
        WHERE ri.revision_id = ?
        ORDER BY p.name`,
    )
    .all(req.params.id)
  res.json({
    ...rev,
    items: items.map((i) => ({
      ...i,
      diff: i.actual == null ? null : round(i.actual - i.expected),
      diff_sum: i.actual == null ? null : round((i.actual - i.expected) * i.price),
    })),
  })
})

// PUT /api/stock/revisions/:id — вписать фактические остатки: { items: [{ product_id, actual }] }
router.put('/revisions/:id', (req, res) => {
  const rev = db.prepare('SELECT * FROM revisions WHERE id = ?').get(req.params.id)
  if (!rev) return res.status(404).json({ error: 'Ревизия не найдена' })
  if (rev.applied_at) return res.status(409).json({ error: 'Ревизия уже проведена, менять нельзя' })
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  const upd = db.prepare('UPDATE revision_items SET actual = ? WHERE revision_id = ? AND product_id = ?')
  transaction(() => {
    for (const it of items) {
      upd.run(it.actual === '' || it.actual == null ? null : Number(it.actual), req.params.id, it.product_id)
    }
  })
  res.json({ ok: true, count: items.length })
})

// POST /api/stock/revisions/:id/apply — провести акт.
// После проведения факт становится новой точкой отсчёта для остатков.
router.post('/revisions/:id/apply', (req, res) => {
  const rev = db.prepare('SELECT * FROM revisions WHERE id = ?').get(req.params.id)
  if (!rev) return res.status(404).json({ error: 'Ревизия не найдена' })
  if (rev.applied_at) return res.status(409).json({ error: 'Ревизия уже проведена' })

  transaction(() => {
    // Что не пересчитывали руками — считаем сошедшимся с ожидаемым.
    db.prepare(
      'UPDATE revision_items SET actual = expected WHERE revision_id = ? AND actual IS NULL',
    ).run(req.params.id)
    db.prepare('UPDATE revisions SET applied_at = ? WHERE id = ?').run(now(), req.params.id)
  })
  res.json(db.prepare('SELECT * FROM revisions WHERE id = ?').get(req.params.id))
})

router.delete('/revisions/:id', (req, res) => {
  const rev = db.prepare('SELECT * FROM revisions WHERE id = ?').get(req.params.id)
  if (!rev) return res.status(404).json({ error: 'Ревизия не найдена' })
  if (rev.applied_at) {
    return res.status(409).json({ error: 'Проведённую ревизию удалять нельзя — на ней стоят остатки' })
  }
  db.prepare('DELETE FROM revisions WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
