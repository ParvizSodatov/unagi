import { Router } from 'express'
import db from '../db.js'
import { requireAuth } from '../auth.js'

const router = Router()
router.use(requireAuth)

// Во всех суммах выручки отменённые заказы не учитываем.
const NOT_CANCELED = "status != 'canceled'"

// GET /api/stats/dashboard — сводка для главной страницы админки
router.get('/dashboard', (req, res) => {
  const one = (sql, ...args) => db.prepare(sql).get(...args)

  // Заказы и выручка
  const today = one(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(total), 0) AS sum
       FROM orders
      WHERE ${NOT_CANCELED} AND date(created_at) = date('now')`,
  )
  const week = one(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(total), 0) AS sum
       FROM orders
      WHERE ${NOT_CANCELED} AND created_at >= datetime('now', '-6 days', 'start of day')`,
  )
  const total = one(
    `SELECT COUNT(*) AS cnt, COALESCE(SUM(total), 0) AS sum
       FROM orders WHERE ${NOT_CANCELED}`,
  )
  const avgCheck = total.cnt ? Math.round(total.sum / total.cnt) : 0
  const newOrders = one(`SELECT COUNT(*) AS cnt FROM orders WHERE status = 'new'`).cnt

  // Топ-5 блюд по количеству (без отменённых заказов)
  const topDishes = db
    .prepare(
      `SELECT oi.name AS name, SUM(oi.qty) AS qty, SUM(oi.price * oi.qty) AS sum
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.${NOT_CANCELED}
        GROUP BY oi.name
        ORDER BY qty DESC
        LIMIT 5`,
    )
    .all()

  // Заказы по статусам
  const byStatus = db
    .prepare('SELECT status, COUNT(*) AS cnt FROM orders GROUP BY status')
    .all()
    .reduce((acc, r) => ({ ...acc, [r.status]: r.cnt }), {})

  // Персонал и зарплатный фонд
  const staffActive = one(`SELECT COUNT(*) AS cnt FROM staff WHERE status = 'active'`).cnt
  const payrollFund = one(
    `SELECT COALESCE(SUM(salary), 0) AS sum FROM staff WHERE status = 'active'`,
  ).sum
  const paidMonth = one(
    `SELECT COALESCE(SUM(amount), 0) AS sum FROM salary_payments
      WHERE strftime('%Y-%m', paid_at) = strftime('%Y-%m', 'now')`,
  ).sum
  const finesMonth = one(
    `SELECT COALESCE(SUM(amount), 0) AS sum FROM salary_adjustments
      WHERE type = 'fine' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
  ).sum
  const bonusesMonth = one(
    `SELECT COALESCE(SUM(amount), 0) AS sum FROM salary_adjustments
      WHERE type = 'bonus' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
  ).sum

  res.json({
    orders: {
      today: today.cnt,
      week: week.cnt,
      total: total.cnt,
      new: newOrders,
      byStatus,
    },
    revenue: {
      today: today.sum,
      week: week.sum,
      total: total.sum,
      avgCheck,
    },
    topDishes,
    staff: {
      active: staffActive,
      payrollFund,
      paidMonth,
      finesMonth,
      bonusesMonth,
    },
  })
})

export default router
