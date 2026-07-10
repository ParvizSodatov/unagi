import { Router } from 'express'
import db, { transaction } from '../db.js'
import { requireAuth } from '../auth.js'
import { notifyNewOrder } from '../notify.js'

const router = Router()

// POST /api/orders — оформить заказ (публично, с корзины)
// body: { customer, phone, address?, comment?, items: [{ dish_id?, name, price, qty }] }
router.post('/', (req, res) => {
  const { customer, phone, address = null, comment = null, items, zone_id = null } = req.body || {}
  if (!customer || !phone) return res.status(400).json({ error: 'Укажите имя и телефон' })
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Корзина пуста' })

  // Считаем сумму блюд на сервере, цены берём из базы — чтобы клиент не подделал.
  let subtotal = 0
  const resolved = []
  const getDish = db.prepare('SELECT * FROM dishes WHERE id = ?')
  for (const item of items) {
    const qty = Number(item.qty)
    if (!qty || qty < 1) return res.status(400).json({ error: 'Некорректное количество' })
    const dish = item.dish_id ? getDish.get(item.dish_id) : null
    const name = dish ? dish.name : item.name
    const price = dish ? dish.price : Number(item.price)
    if (!name || price == null || Number.isNaN(price)) {
      return res.status(400).json({ error: 'Некорректная позиция в заказе' })
    }
    subtotal += price * qty
    resolved.push({ dish_id: dish ? dish.id : null, name, price, qty })
  }

  // Доставка: если выбрана зона — проверяем минимальный заказ и считаем стоимость.
  let deliveryFee = 0
  let zoneName = null
  if (zone_id != null) {
    const zone = db.prepare('SELECT * FROM delivery_zones WHERE id = ? AND active = 1').get(zone_id)
    if (!zone) return res.status(400).json({ error: 'Выбранная зона доставки недоступна' })
    if (subtotal < zone.min_order) {
      return res.status(400).json({ error: `Минимальный заказ для «${zone.name}» — ${zone.min_order} c.` })
    }
    // Бесплатная доставка от суммы, если задан порог и он достигнут.
    deliveryFee = zone.free_from != null && subtotal >= zone.free_from ? 0 : zone.price
    zoneName = zone.name
  }

  const total = subtotal + deliveryFee

  const orderId = transaction(() => {
    const orderInfo = db
      .prepare(
        'INSERT INTO orders (customer, phone, address, comment, total, delivery_zone, delivery_fee) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(customer, phone, address, comment, total, zoneName, deliveryFee)
    const id = orderInfo.lastInsertRowid
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, dish_id, name, price, qty) VALUES (?, ?, ?, ?, ?)',
    )
    resolved.forEach((it) => insertItem.run(id, it.dish_id, it.name, it.price, it.qty))
    return id
  })

  // Оповещаем персонал в Telegram (не блокируем ответ клиенту).
  notifyNewOrder(
    { id: orderId, customer, phone, address, comment, subtotal, deliveryFee, zoneName, total },
    resolved,
  )

  res.status(201).json({ id: orderId, subtotal, deliveryFee, total, status: 'new' })
})

// GET /api/orders — список заказов (только админ), ?status=new для фильтра
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query
  const orders = status
    ? db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  res.json(orders)
})

// GET /api/orders/:id — заказ с позициями (только админ)
router.get('/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) return res.status(404).json({ error: 'Заказ не найден' })
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  res.json(order)
})

// PATCH /api/orders/:id/status — сменить статус (только админ)
const STATUSES = ['new', 'accepted', 'delivering', 'done', 'canceled']
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {}
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Статус должен быть одним из: ${STATUSES.join(', ')}` })
  }
  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id)
  if (info.changes === 0) return res.status(404).json({ error: 'Заказ не найден' })
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id))
})

export default router
