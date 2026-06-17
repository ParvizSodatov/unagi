import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()

// Весь раздел — только для админа.
router.use(requireAuth)

const ROLES = ['cook', 'courier', 'operator', 'waiter', 'manager', 'cleaner']

// ─── Табель / смены ────────────────────────────────────────────────
// Объявлено до маршрутов с :id, чтобы '/shifts' не попал в ':id'.

// GET /api/staff/shifts?month=YYYY-MM — сводка часов по сотрудникам за месяц
router.get('/shifts', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7)
  const rows = db
    .prepare(
      `SELECT staff_id,
              COUNT(*)            AS days,
              COALESCE(SUM(hours), 0) AS total_hours
         FROM shifts
        WHERE strftime('%Y-%m', date) = ?
        GROUP BY staff_id`,
    )
    .all(month)
  res.json({ month, summary: rows })
})

// ─── Сотрудники ────────────────────────────────────────────────────

// GET /api/staff — список + суммы выплат, премий и штрафов по каждому
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*,
              COALESCE((SELECT SUM(amount) FROM salary_payments p WHERE p.staff_id = s.id), 0) AS paid_total,
              COALESCE((SELECT SUM(amount) FROM salary_adjustments a WHERE a.staff_id = s.id AND a.type = 'bonus'), 0) AS bonus_total,
              COALESCE((SELECT SUM(amount) FROM salary_adjustments a WHERE a.staff_id = s.id AND a.type = 'fine'), 0) AS fine_total
         FROM staff s
        ORDER BY (s.status = 'active') DESC, s.name`,
    )
    .all()
  res.json(rows)
})

router.post('/', (req, res) => {
  const { name, role, phone = null, salary = 0, status = 'active', hired_at = null, note = null } =
    req.body || {}
  if (!name || !role) return res.status(400).json({ error: 'Нужны имя и должность' })
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Неизвестная должность' })
  const info = db
    .prepare(
      'INSERT INTO staff (name, role, phone, salary, status, hired_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(name, role, phone, salary, status, hired_at, note)
  res.status(201).json(db.prepare('SELECT * FROM staff WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const emp = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  const { name, role, phone, salary, status, hired_at, note } = req.body || {}
  if (role != null && !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Неизвестная должность' })
  }
  db.prepare(
    'UPDATE staff SET name = ?, role = ?, phone = ?, salary = ?, status = ?, hired_at = ?, note = ? WHERE id = ?',
  ).run(
    name ?? emp.name,
    role ?? emp.role,
    phone !== undefined ? phone : emp.phone,
    salary ?? emp.salary,
    status ?? emp.status,
    hired_at !== undefined ? hired_at : emp.hired_at,
    note !== undefined ? note : emp.note,
    req.params.id,
  )
  res.json(db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Сотрудник не найден' })
  res.json({ ok: true })
})

// ─── Выплаты зарплат ───────────────────────────────────────────────

// GET /api/staff/:id/payments — история выплат сотрудника
router.get('/:id/payments', (req, res) => {
  const emp = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  res.json(
    db
      .prepare('SELECT * FROM salary_payments WHERE staff_id = ? ORDER BY paid_at DESC')
      .all(req.params.id),
  )
})

// POST /api/staff/:id/payments — добавить выплату
router.post('/:id/payments', (req, res) => {
  const emp = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  const { amount, period = null, comment = null } = req.body || {}
  if (amount == null || amount <= 0) return res.status(400).json({ error: 'Укажите сумму выплаты' })
  const info = db
    .prepare('INSERT INTO salary_payments (staff_id, amount, period, comment) VALUES (?, ?, ?, ?)')
    .run(req.params.id, amount, period, comment)
  res.status(201).json(db.prepare('SELECT * FROM salary_payments WHERE id = ?').get(info.lastInsertRowid))
})

// DELETE /api/staff/:id/payments/:pid — удалить выплату
router.delete('/:id/payments/:pid', (req, res) => {
  const info = db
    .prepare('DELETE FROM salary_payments WHERE id = ? AND staff_id = ?')
    .run(req.params.pid, req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Выплата не найдена' })
  res.json({ ok: true })
})

// ─── Штрафы и премии ───────────────────────────────────────────────

// GET /api/staff/:id/adjustments — штрафы и премии сотрудника
router.get('/:id/adjustments', (req, res) => {
  const emp = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  res.json(
    db
      .prepare('SELECT * FROM salary_adjustments WHERE staff_id = ? ORDER BY created_at DESC')
      .all(req.params.id),
  )
})

// POST /api/staff/:id/adjustments — добавить штраф или премию
router.post('/:id/adjustments', (req, res) => {
  const emp = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  const { type, amount, reason = null, period = null } = req.body || {}
  if (type !== 'fine' && type !== 'bonus') return res.status(400).json({ error: 'Тип: fine или bonus' })
  if (amount == null || amount <= 0) return res.status(400).json({ error: 'Укажите сумму' })
  const info = db
    .prepare('INSERT INTO salary_adjustments (staff_id, type, amount, reason, period) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, type, amount, reason, period)
  res.status(201).json(db.prepare('SELECT * FROM salary_adjustments WHERE id = ?').get(info.lastInsertRowid))
})

// DELETE /api/staff/:id/adjustments/:aid — удалить штраф/премию
router.delete('/:id/adjustments/:aid', (req, res) => {
  const info = db
    .prepare('DELETE FROM salary_adjustments WHERE id = ? AND staff_id = ?')
    .run(req.params.aid, req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Запись не найдена' })
  res.json({ ok: true })
})

// ─── Смены сотрудника ──────────────────────────────────────────────

// GET /api/staff/:id/shifts?month=YYYY-MM — смены сотрудника (за месяц, если задан)
router.get('/:id/shifts', (req, res) => {
  const emp = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  const { month } = req.query
  const rows = month
    ? db
        .prepare(
          `SELECT * FROM shifts WHERE staff_id = ? AND strftime('%Y-%m', date) = ? ORDER BY date DESC`,
        )
        .all(req.params.id, month)
    : db.prepare('SELECT * FROM shifts WHERE staff_id = ? ORDER BY date DESC').all(req.params.id)
  res.json(rows)
})

// POST /api/staff/:id/shifts — добавить смену
router.post('/:id/shifts', (req, res) => {
  const emp = db.prepare('SELECT id FROM staff WHERE id = ?').get(req.params.id)
  if (!emp) return res.status(404).json({ error: 'Сотрудник не найден' })
  const { date, hours = 0, note = null } = req.body || {}
  if (!date) return res.status(400).json({ error: 'Укажите дату смены' })
  if (hours < 0 || hours > 24) return res.status(400).json({ error: 'Часы: от 0 до 24' })
  const info = db
    .prepare('INSERT INTO shifts (staff_id, date, hours, note) VALUES (?, ?, ?, ?)')
    .run(req.params.id, date, hours, note)
  res.status(201).json(db.prepare('SELECT * FROM shifts WHERE id = ?').get(info.lastInsertRowid))
})

// DELETE /api/staff/:id/shifts/:sid — удалить смену
router.delete('/:id/shifts/:sid', (req, res) => {
  const info = db
    .prepare('DELETE FROM shifts WHERE id = ? AND staff_id = ?')
    .run(req.params.sid, req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Смена не найдена' })
  res.json({ ok: true })
})

export default router
