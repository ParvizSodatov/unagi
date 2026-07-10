import 'dotenv/config'
import bcrypt from 'bcryptjs'
import db, { transaction } from './db.js'

// Категории и блюда — стартовый набор (тот же, что был захардкожен на фронте).
const categories = [
  { id: 'rolls', label: 'Роллы', sort: 1 },
  { id: 'sushi', label: 'Суши', sort: 2 },
  { id: 'sets', label: 'Сеты', sort: 3 },
  { id: 'drinks', label: 'Напитки', sort: 4 },
]

const dishes = [
  { name: 'Филадельфия', cat: 'rolls', price: 38, img: '/img/dish1.jpg', desc: 'Лосось, сливочный сыр, огурец' },
  { name: 'Калифорния', cat: 'rolls', price: 34, img: '/img/dish2.jpg', desc: 'Краб, авокадо, икра тобико' },
  { name: 'Дракон', cat: 'rolls', price: 42, img: '/img/dish3.jpg', desc: 'Угорь, унаги соус, кунжут' },
  { name: 'Запечённый ролл', cat: 'rolls', price: 36, img: '/img/dish4.jpg', desc: 'Под сырной шапкой, креветка' },
  { name: 'Нигири с лососем', cat: 'sushi', price: 14, img: '/img/dish5.jpg', desc: 'Рис и свежий лосось' },
  { name: 'Нигири с тунцом', cat: 'sushi', price: 16, img: '/img/dish6.jpg', desc: 'Рис и нежный тунец' },
  { name: 'Гункан с икрой', cat: 'sushi', price: 18, img: '/img/dish7.jpg', desc: 'С икрой тобико' },
  { name: 'Сет «Унаги»', cat: 'sets', price: 120, img: '/img/dish8.jpg', desc: '32 шт — выбор шефа' },
  { name: 'Сет «Компания»', cat: 'sets', price: 190, img: '/img/dish9.jpg', desc: '48 шт — на всех хватит' },
  { name: 'Сет «Лосось»', cat: 'sets', price: 140, img: '/img/dish10.jpg', desc: '24 шт — для любителей лосося' },
  { name: 'Зелёный чай', cat: 'drinks', price: 8, img: '/img/dish11.jpg', desc: 'Классический японский' },
  { name: 'Кола', cat: 'drinks', price: 7, img: '/img/dish12.jpg', desc: '0.5 л охлаждённая' },
]

function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM categories').get().n
  if (count > 0) {
    console.log(`Категории уже есть (${count}), пропускаю.`)
    return
  }
  const insert = db.prepare('INSERT INTO categories (id, label, sort) VALUES (?, ?, ?)')
  transaction(() => categories.forEach((c) => insert.run(c.id, c.label, c.sort)))
  console.log(`Добавлено категорий: ${categories.length}`)
}

function seedDishes() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM dishes').get().n
  if (count > 0) {
    console.log(`Блюда уже есть (${count}), пропускаю.`)
    return
  }
  const insert = db.prepare('INSERT INTO dishes (name, cat, price, img, desc) VALUES (?, ?, ?, ?, ?)')
  transaction(() => dishes.forEach((d) => insert.run(d.name, d.cat, d.price, d.img, d.desc)))
  console.log(`Добавлено блюд: ${dishes.length}`)
}

// Стартовые зоны доставки по Душанбе (примерные — потом меняются в админке).
const zones = [
  { name: 'Центр', price: 15, min_order: 50, free_from: 200, sort: 1 },
  { name: 'Исмоили Сомони', price: 20, min_order: 60, free_from: 250, sort: 2 },
  { name: 'Сино', price: 25, min_order: 70, free_from: 300, sort: 3 },
  { name: 'Фирдавси', price: 25, min_order: 70, free_from: 300, sort: 4 },
  { name: 'Окраина', price: 35, min_order: 100, free_from: null, sort: 5 },
]

function seedZones() {
  const count = db.prepare('SELECT COUNT(*) AS n FROM delivery_zones').get().n
  if (count > 0) {
    console.log(`Зоны доставки уже есть (${count}), пропускаю.`)
    return
  }
  const insert = db.prepare(
    'INSERT INTO delivery_zones (name, price, min_order, free_from, sort) VALUES (?, ?, ?, ?, ?)',
  )
  transaction(() => zones.forEach((z) => insert.run(z.name, z.price, z.min_order, z.free_from, z.sort)))
  console.log(`Добавлено зон доставки: ${zones.length}`)
}

function seedAdmin() {
  const login = process.env.ADMIN_LOGIN || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(login)
  if (existing) {
    console.log(`Админ «${login}» уже существует, пропускаю.`)
    return
  }
  const hash = bcrypt.hashSync(password, 10)
  db.prepare('INSERT INTO users (login, password_hash) VALUES (?, ?)').run(login, hash)
  console.log(`Создан админ: ${login} / ${password}`)
}

seedCategories()
seedDishes()
seedZones()
seedAdmin()
console.log('Сид завершён.')
