// Демо-приход на склад: несколько поставок по знакомым продуктам, чтобы раздел
// «Склад → Движения» был не пустой и на нём было видно, как считаются остатки.
// Запускается руками: npm run seed:moves (повторный запуск не плодит дубли).
//
// Убрать всё, что насыпал этот скрипт: npm run seed:moves -- --clear
//
// ⚠️ Данные выдуманные. Цены и объёмы правдоподобные, но это не реальные закупки.
import 'dotenv/config'
import db, { transaction } from './db.js'

// По этой метке в комментарии скрипт находит свои же строки и чистит их перед
// повторной засыпкой. Приходы, заведённые руками в админке, не трогаются.
const TAG = 'Демо-приход'

// Продукты берём по имени из справочника (его наполняет seed:stock).
// price — себестоимость за одну базовую единицу (г / мл), qty — типовая поставка.
const SUPPLY = [
  { name: 'Лосось',            price: 0.14,  qty: 10000, times: 4, from: 'Рыбный дом' },
  { name: 'Тунец',             price: 0.16,  qty: 5000,  times: 3, from: 'Рыбный дом' },
  { name: 'Угорь',             price: 0.22,  qty: 3000,  times: 3, from: 'Рыбный дом' },
  { name: 'Креветка тигровая', price: 0.18,  qty: 4000,  times: 3, from: 'Рыбный дом' },
  { name: 'Икра масаго',       price: 0.19,  qty: 1000,  times: 2, from: 'Рыбный дом' },
  { name: 'Рис японский',      price: 0.012, qty: 25000, times: 3, from: 'Восток-Фуд' },
  { name: 'Нори',              price: 0.35,  qty: 500,   times: 2, from: 'Восток-Фуд' },
  { name: 'Соус унаги',        price: 0.03,  qty: 3000,  times: 2, from: 'Восток-Фуд' },
  { name: 'Соевый соус',       price: 0.02,  qty: 5000,  times: 2, from: 'Восток-Фуд' },
  { name: 'Кунжут',            price: 0.04,  qty: 1000,  times: 2, from: 'Восток-Фуд' },
  { name: 'Сыр сливочный',     price: 0.045, qty: 6000,  times: 4, from: 'Молочный двор' },
  { name: 'Сыр креметто',      price: 0.05,  qty: 4000,  times: 3, from: 'Молочный двор' },
  { name: 'Авокадо',           price: 0.028, qty: 5000,  times: 3, from: 'Зелёный рынок' },
  { name: 'Огурец',            price: 0.009, qty: 8000,  times: 4, from: 'Зелёный рынок' },
  { name: 'Филе куриное',      price: 0.045, qty: 10000, times: 3, from: 'Мясной ряд' },
  { name: 'Картофель фри',     price: 0.016, qty: 15000, times: 2, from: 'Мясной ряд' },
  { name: 'Вода',              price: 0.004, qty: 60000, times: 2, from: 'Аква-Сервис' },
]

// Свой генератор со стабильным зерном: один и тот же запуск даёт одни и те же
// цифры, чтобы демо не «прыгало» при каждой пересборке базы.
function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const stamp = (d) => d.toISOString().slice(0, 19).replace('T', ' ')

function round(n, digits) {
  const k = 10 ** digits
  return Math.round(n * k) / k
}

function clearDemo() {
  const info = db
    .prepare("DELETE FROM stock_moves WHERE type = 'in' AND comment LIKE ?")
    .run(`${TAG}%`)
  return info.changes
}

function run() {
  const clearOnly = process.argv.includes('--clear')

  if (clearOnly) {
    const removed = transaction(clearDemo)
    console.log(`Удалено демо-приходов: ${removed}`)
    return
  }

  const findProduct = db.prepare('SELECT id, name, unit, price FROM products WHERE name = ?')
  const insMove = db.prepare(
    'INSERT INTO stock_moves (product_id, type, qty, price, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  )
  const setPrice = db.prepare('UPDATE products SET price = ?, min_stock = ? WHERE id = ?')

  const rand = rng(20260907)
  const missing = []
  let moves = 0
  let priced = 0
  let total = 0
  let invoice = 4200

  const removed = transaction(() => {
    const gone = clearDemo()

    for (const item of SUPPLY) {
      const product = findProduct.get(item.name)
      if (!product) {
        missing.push(item.name)
        continue
      }

      // Поставки раскидываем по последним ~7 неделям, примерно раз в 10-12 дней.
      for (let i = 0; i < item.times; i += 1) {
        const daysAgo = Math.round(4 + i * (10 + rand() * 3) + rand() * 2)
        const at = new Date()
        at.setDate(at.getDate() - daysAgo)
        at.setHours(8 + Math.floor(rand() * 3), Math.floor(rand() * 60), 0, 0)

        // Цена и объём слегка гуляют от поставки к поставке — как в жизни.
        const price = round(item.price * (0.92 + rand() * 0.16), 4)
        const qty = Math.round((item.qty * (0.8 + rand() * 0.4)) / 100) * 100

        invoice += 1 + Math.floor(rand() * 4)
        insMove.run(
          product.id,
          'in',
          qty,
          price,
          `${TAG} · ${item.from}, накладная №${invoice}`,
          stamp(at),
        )
        moves += 1
        total += qty * price
      }

      // Нулевая себестоимость ломает отчёты (везде «цена не задана»), поэтому
      // у продуктов без цены проставляем её и порог остатка. Заполненные не трогаем.
      if (!product.price) {
        setPrice.run(item.price, Math.round(item.qty * 0.25), product.id)
        priced += 1
      }
    }

    return gone
  })

  if (removed) console.log(`Старых демо-приходов убрано: ${removed}`)
  console.log(`Добавлено приходов: ${moves} по ${SUPPLY.length - missing.length} продуктам`)
  console.log(`На сумму: ${total.toFixed(2)} c.`)
  if (priced) console.log(`Проставлена цена и минимальный остаток: ${priced} продуктам (были нулевые)`)

  if (missing.length) {
    console.log(`\n⚠️  Не нашлись в справочнике продуктов: ${missing.length}`)
    console.log('   Сначала выполните: npm run seed:stock')
    for (const m of missing) console.log(`   — ${m}`)
  }
  console.log('\nГотово. Смотрите в админке: Склад → Движения.')
}

run()
