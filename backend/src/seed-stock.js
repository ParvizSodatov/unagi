// Разбирает текстовый состав блюд (dishes.composition) в справочник продуктов
// и техкарты (products + dish_products). Запускается руками: npm run seed:stock
//
// Формат, который понимает разборщик: «Лосось 40 г, сыр сливочный 30 г, нори 3 г».
// Строки вида «Общий вес ~470 г» (сеты) пропускаются — там не ингредиенты, а итог.
//
// ⚠️ Граммовка в composition — черновая. Скрипт переносит её как есть,
// правильность цифр он не проверяет и проверить не может.
import 'dotenv/config'
import db, { transaction } from './db.js'

// «Лосось копчёный 18 г» → { name: 'Лосось копчёный', qty: 18, unit: 'г' }
const PART = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(г|мл|шт)$/u

// Такие куски — не продукт, а справочная строка.
const SKIP = /^общий вес/i

function parseComposition(text) {
  if (!text) return []
  const out = []
  for (const raw of text.split(',')) {
    const part = raw.trim()
    if (!part || SKIP.test(part)) continue
    const m = part.match(PART)
    if (!m) {
      out.push({ unparsed: part })
      continue
    }
    const name = m[1].trim()
    out.push({
      // В справочнике держим название с большой буквы, чтобы «сыр» и «Сыр» не раздваивались.
      name: name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
      qty: Number(m[2].replace(',', '.')),
      unit: m[3],
    })
  }
  return out
}

function run() {
  const dishes = db.prepare('SELECT id, name, composition FROM dishes ORDER BY id').all()

  // Сначала собираем справочник продуктов по всем блюдам.
  const catalogue = new Map() // name → unit
  const unparsed = []
  const parsed = new Map() // dish_id → [{ name, qty }]

  for (const d of dishes) {
    const items = parseComposition(d.composition)
    const good = []
    for (const it of items) {
      if (it.unparsed) {
        unparsed.push(`${d.name}: «${it.unparsed}»`)
        continue
      }
      if (!catalogue.has(it.name)) catalogue.set(it.name, it.unit)
      good.push(it)
    }
    if (good.length) parsed.set(d.id, good)
  }

  const insProduct = db.prepare('INSERT INTO products (name, unit) VALUES (?, ?)')
  const findProduct = db.prepare('SELECT id FROM products WHERE name = ?')
  const insRecipe = db.prepare(
    'INSERT OR REPLACE INTO dish_products (dish_id, product_id, qty) VALUES (?, ?, ?)',
  )

  let addedProducts = 0
  let recipeRows = 0

  transaction(() => {
    for (const [name, unit] of catalogue) {
      if (!findProduct.get(name)) {
        insProduct.run(name, unit)
        addedProducts += 1
      }
    }
    for (const [dishId, items] of parsed) {
      // Техкарту пересобираем целиком, чтобы повторный запуск не плодил дубли.
      db.prepare('DELETE FROM dish_products WHERE dish_id = ?').run(dishId)
      for (const it of items) {
        const p = findProduct.get(it.name)
        if (!p) continue
        insRecipe.run(dishId, p.id, it.qty)
        recipeRows += 1
      }
    }
  })

  const noRecipe = dishes.filter((d) => !parsed.has(d.id))

  console.log(`Продуктов в справочнике: ${catalogue.size} (новых ${addedProducts})`)
  console.log(`Строк техкарт: ${recipeRows} по ${parsed.size} блюдам`)

  if (noRecipe.length) {
    console.log(`\n⚠️  Без техкарты осталось блюд: ${noRecipe.length}`)
    console.log('   Их продажи в расходе продуктов НЕ учтутся, пока состав не заведён:')
    for (const d of noRecipe) console.log(`   — ${d.name}`)
  }
  if (unparsed.length) {
    console.log(`\n⚠️  Не разобрано строк: ${unparsed.length}`)
    for (const u of unparsed) console.log(`   — ${u}`)
  }
  console.log('\nГотово. Цены продуктов и минимальные остатки проставьте в админке.')
}

run()
