import 'dotenv/config'
import bcrypt from 'bcryptjs'
import db, { transaction } from './db.js'

// Категории и блюда — актуальное меню суши-бара (из Instagram @unagi_tj, август 2026).
const categories = [
  { id: 'sushi', label: 'Суши', sort: 1 },
  { id: 'rolls-classic', label: 'Классические роллы', sort: 2 },
  { id: 'rolls-baked', label: 'Запечённые роллы', sort: 3 },
  { id: 'rolls-fried', label: 'Жареные роллы', sort: 4 },
  { id: 'rolls-mini', label: 'Мини роллы', sort: 5 },
  { id: 'gunkan', label: 'Гунканы', sort: 6 },
  { id: 'sets', label: 'Сеты', sort: 7 },
  { id: 'salads', label: 'Салаты', sort: 8 },
  { id: 'hot', label: 'Горячие', sort: 9 },
  { id: 'burgers', label: 'Гамбургеры', sort: 10 },
  { id: 'desserts', label: 'Десерты', sort: 11 },
  { id: 'drinks', label: 'Напитки', sort: 12 },
]

const dishes = [
  // Суши
  { name: 'Суши с тунцом', cat: 'sushi', price: 24, img: '/img/menu/sushi-tunets.jpg', desc: '1 шт' },
  { name: 'Суши с копчёным лососем', cat: 'sushi', price: 25, img: '/img/menu/sushi-kopcheny-losos.jpg', desc: '1 шт' },
  { name: 'Суши с угрём', cat: 'sushi', price: 28, img: '/img/menu/sushi-ugor.jpg', desc: '1 шт' },
  { name: 'Суши с креветкой', cat: 'sushi', price: 28, img: '/img/menu/sushi-krevetka.jpg', desc: '1 шт' },
  { name: 'Суши чука', cat: 'sushi', price: 20, img: '/img/menu/sushi-chuka.jpg', desc: '1 шт' },
  { name: 'Суши омлет', cat: 'sushi', price: 19, img: '/img/menu/sushi-omlet.jpg', desc: '1 шт' },
  // Классические роллы
  { name: 'Сочные креветки', cat: 'rolls-classic', price: 83, img: '/img/menu/sochnye-krevetki.jpg', desc: '8 шт · Креветки в кляре, сыр чеддер, сыр креметто, огурец, спайси соус' },
  { name: 'Калифорния краб', cat: 'rolls-classic', price: 62, img: '/img/menu/kaliforniya-krab.jpg', desc: '8 шт · Краб, сыр, огурец, икра масаго' },
  { name: 'Black Roll', cat: 'rolls-classic', price: 77, img: '/img/menu/black-roll.jpg', desc: '8 шт · Лосось копчёный, сыр, огурец, икра масаго чёрная' },
  { name: 'Бонито', cat: 'rolls-classic', price: 59, img: '/img/menu/bonito.jpg', desc: '8 шт · Лосось копчёный, сыр, стружка тунца, огурец' },
  { name: 'Красный дракон', cat: 'rolls-classic', price: 90, img: '/img/menu/krasny-drakon.jpg', desc: '8 шт · Лосось, угорь, икра красная, огурец, сыр' },
  { name: 'Ролл от шефа', cat: 'rolls-classic', price: 90, img: '/img/menu/roll-ot-shefa.jpg', desc: '8 шт · Лосось, угорь, икра чёрная, сыр, огурец' },
  { name: 'Мидори', cat: 'rolls-classic', price: 60, img: '/img/menu/midori.jpg', desc: '8 шт · Лосось копчёный, сыр, огурец, икра масаго' },
  { name: 'Филадельфия дуэт', cat: 'rolls-classic', price: 85, img: '/img/menu/filadelfiya-duet.jpg', desc: '8 шт · Лосось, угорь, сыр, огурец, кунжут, унаги соус' },
  // Запечённые роллы
  { name: 'Нью-Йорк', cat: 'rolls-baked', price: 69, img: '/img/menu/nyu-york.jpg', desc: '8 шт · Краб, лосось, кунжут, сыр, сырный соус' },
  { name: 'Гейша', cat: 'rolls-baked', price: 69, img: '/img/menu/geysha.jpg', desc: '8 шт · Краб, сыр, огурец, соус шеф, соус унаги, кунжут' },
  { name: 'Чикен хот', cat: 'rolls-baked', price: 53, img: '/img/menu/chiken-hot.jpg', desc: '8 шт · Филе копчёное, сыр, огурец, сырный соус, унаги соус, кунжут' },
  { name: 'Калифорния запечённая', cat: 'rolls-baked', price: 87, img: '/img/menu/kaliforniya-zapechennaya.jpg', desc: '8 шт · Краб, сыр, огурец, икра масаго, соус шеф, унаги соус, кунжут' },
  { name: 'Калифорния запечённая с креветками', cat: 'rolls-baked', price: 90, img: '/img/menu/kaliforniya-zap-krevetki.jpg', desc: '8 шт · Креветки в кляре, сыр, икра масаго, огурец, соус шеф, унаги соус, кунжут' },
  { name: 'Филадельфия гриль', cat: 'rolls-baked', price: 86, img: '/img/menu/filadelfiya-gril.jpg', desc: '8 шт · Лосось, сыр, огурец, соус шеф, унаги соус, кунжут' },
  { name: 'Цезарь запечённый', cat: 'rolls-baked', price: 55, img: '/img/menu/tsezar-zapechenny.jpg', desc: '8 шт · Филе копчёное, помидор, салат айсберг, соус шеф, сырный соус, кунжут' },
  { name: 'Сырный', cat: 'rolls-baked', price: 55, img: '/img/menu/syrny.jpg', desc: '8 шт · Филе копчёное, огурец, сырный соус' },
  { name: 'Токио', cat: 'rolls-baked', price: 78, img: '/img/menu/tokio.jpg', desc: '8 шт · Лосось, сыр, огурец, кунжут, соус шеф' },
  { name: 'Унаги запечённый', cat: 'rolls-baked', price: 75, img: '/img/menu/unagi-zapechenny.jpg', desc: '8 шт · Угорь, омлет японский, сыр, кунжут, сырный соус' },
  { name: 'Сакура', cat: 'rolls-baked', price: 57, img: '/img/menu/sakura.jpg', desc: '6 шт · Лосось в кляре, сыр, огурец, соус шеф' },
  { name: 'Сливочный', cat: 'rolls-baked', price: 72, img: '/img/menu/slivochny.jpg', desc: '8 шт · Краб, лосось, сыр, огурец, соус шеф' },
  // Жареные роллы
  { name: 'Морской', cat: 'rolls-fried', price: 85, img: '/img/menu/morskoy.jpg', desc: '8 шт · Креветка, лосось, сыр, огурец, спайси соус, соус шеф, кисло-сладкий соус, кунжут, кляр' },
  { name: 'Острый краб', cat: 'rolls-fried', price: 70, img: '/img/menu/ostry-krab.jpg', desc: '8 шт · Краб, сыр, огурец, спайси соус, кляр' },
  { name: 'Цезарь жареный', cat: 'rolls-fried', price: 66, img: '/img/menu/tsezar-zhareny.jpg', desc: '6 шт · Филе копчёное, салат айсберг, помидор, сыр, кляр' },
  { name: 'Темпура микс', cat: 'rolls-fried', price: 75, img: '/img/menu/tempura-miks.jpg', desc: '6 шт · Лосось, угорь, сыр, огурец, кляр' },
  { name: 'Темпура чиз', cat: 'rolls-fried', price: 80, img: '/img/menu/tempura-chiz.jpg', desc: '8 шт · Сыр, лосось, огурец, тамаго, кляр, сухари' },
  { name: 'Чикен спайси', cat: 'rolls-fried', price: 54, img: '/img/menu/chiken-spaysi.jpg', desc: '8 шт · Филе копчёное, сыр, огурец, спайси соус' },
  { name: 'Темпура с лососем', cat: 'rolls-fried', price: 68, img: '/img/menu/tempura-losos.jpg', desc: '6 шт · Лосось, сыр, икра масаго, огурец, кляр' },
  { name: 'Темпура с угрём', cat: 'rolls-fried', price: 68, img: '/img/menu/tempura-ugor.jpg', desc: '6 шт · Угорь, сыр, огурец, кляр' },
  { name: 'Темпура с тунцом', cat: 'rolls-fried', price: 68, img: '/img/menu/tempura-tunets.jpg', desc: '6 шт · Тунец, сыр, икра тобико, огурец, кляр' },
  { name: 'Темпура с креветками', cat: 'rolls-fried', price: 68, img: '/img/menu/tempura-krevetki.jpg', desc: '6 шт · Креветки, краб, сыр, огурец, кунжут' },
  { name: 'Темпура Филадельфия', cat: 'rolls-fried', price: 85, img: '/img/menu/tempura-filadelfiya.jpg', desc: '8 шт · Лосось, сыр, огурец, кляр' },
  { name: 'Хрустящий тамаго', cat: 'rolls-fried', price: 79, img: '/img/menu/hrustyashchy-tamago.jpg', desc: '8 шт · Японский омлет, сыр, угорь, огурец, кляр, сухари' },
  // Мини роллы
  { name: 'Ролл с тунцом', cat: 'rolls-mini', price: 45, img: '/img/menu/roll-tunets.jpg', desc: '8 шт · Тунец' },
  { name: 'Ролл с лососем', cat: 'rolls-mini', price: 45, img: '/img/menu/roll-losos.jpg', desc: '8 шт · Лосось' },
  { name: 'Ролл с огурцом', cat: 'rolls-mini', price: 18, img: '/img/menu/roll-ogurets.jpg', desc: '8 шт · Огурец' },
  { name: 'Ролл с угрём', cat: 'rolls-mini', price: 45, img: '/img/menu/roll-ugor.jpg', desc: '8 шт · Угорь, огурец, кунжут' },
  { name: 'Ролл с копчёным лососем', cat: 'rolls-mini', price: 45, img: '/img/menu/roll-kopcheny-losos.jpg', desc: '8 шт · Лосось копчёный, огурец, сыр' },
  { name: 'Авокадо', cat: 'rolls-mini', price: 25, img: '/img/menu/avokado.jpg', desc: '8 шт · Авокадо' },
  // Гунканы и онигири
  { name: 'Гункан с икрой', cat: 'gunkan', price: 40, img: '/img/menu/gunkan-ikra.jpg', desc: '1 шт' },
  { name: 'Гункан спайси лосось', cat: 'gunkan', price: 30, img: '/img/menu/gunkan-spaysi-losos.jpg', desc: '1 шт' },
  { name: 'Гункан спайси тунец', cat: 'gunkan', price: 25, img: '/img/menu/gunkan-spaysi-tunets.jpg', desc: '1 шт' },
  { name: 'Гункан спайси угорь', cat: 'gunkan', price: 28, img: '/img/menu/gunkan-spaysi-ugor.jpg', desc: '1 шт' },
  { name: 'Гункан спайси креветки', cat: 'gunkan', price: 30, img: '/img/menu/gunkan-spaysi-krevetki.jpg', desc: '1 шт' },
  { name: 'Гункан спайси краб', cat: 'gunkan', price: 25, img: '/img/menu/gunkan-spaysi-krab.jpg', desc: '1 шт' },
  { name: 'Онигири с лососем', cat: 'gunkan', price: 35, img: null, desc: '1 шт · Лосось, спайси соус, сыр, икра масаго, нори' },
  { name: 'Онигири с угрём', cat: 'gunkan', price: 35, img: '/img/menu/onigiri-ugor.jpg', desc: '1 шт · Угорь, спайси соус, сыр, икра масаго, нори' },
  { name: 'Онигири с креветками', cat: 'gunkan', price: 35, img: null, desc: '1 шт · Креветки тигровые, спайси соус, сыр, икра масаго, нори' },
  // Сеты
  { name: 'Сет Бенто', cat: 'sets', price: 123, img: '/img/menu/set-bento.jpg', desc: '16 шт · Калифорния классика 8 шт, бенто с копчёным лососем 8 шт' },
  { name: 'Сет Микс', cat: 'sets', price: 230, img: '/img/menu/set-miks.jpg', desc: '24 шт · Филадельфия 8 шт, краб хот 8 шт, темпура лосось 8 шт' },
  { name: 'Сет Фила', cat: 'sets', price: 160, img: '/img/menu/set-fila.jpg', desc: '16 шт · Филадельфия с угрём 4 шт, Филадельфия классика 4 шт, Калифорния классика 4 шт, Калифорния креветка 4 шт' },
  { name: 'Сет Эби', cat: 'sets', price: 170, img: '/img/menu/set-ebi.jpg', desc: '16 шт · Темпура с креветками 4 шт, Калифорния классика 4 шт, креветка запечённая 4 шт, эби маки 4 шт' },
  { name: 'Сет Горячий', cat: 'sets', price: 150, img: '/img/menu/set-goryachy.jpg', desc: '16 шт · Темпура с крабом 8 шт, сочный лосось 8 шт' },
  { name: 'Сет Гурман', cat: 'sets', price: 199, img: '/img/menu/set-gurman.jpg', desc: '24 шт · Цезарь 8 шт, Калифорния запечённая 8 шт, темпура с креветками 8 шт' },
  { name: 'Сет Бонсай', cat: 'sets', price: 310, img: '/img/menu/set-bonsay.jpg', desc: '32 шт · Филадельфия, Филадельфия угорь, темпура угорь, Нью-Йорк запечённый' },
  { name: 'Сет Цунами', cat: 'sets', price: 290, img: '/img/menu/set-tsunami.jpg', desc: '32 шт · Темпура краб, темпура тунец, Калифорния запечённая, унаги запечённый' },
  { name: 'Сет Сенсей', cat: 'sets', price: 290, img: '/img/menu/set-sensey.jpg', desc: '32 шт · Чикен хот 8 шт, Мьями запечённый 8 шт, эби чиз 8 шт, Black Roll 8 шт' },
  { name: 'Сет Флорида', cat: 'sets', price: 280, img: '/img/menu/set-florida.jpg', desc: '32 шт · Темпура с лососем 8 шт, ролл пирамида 8 шт, эби грин 8 шт, крабик хот 8 шт' },
  { name: 'Сет Самурай', cat: 'sets', price: 480, img: '/img/menu/set-samuray.jpg', desc: '56 шт · Темпура с тунцом 8 шт, темпура с крабом 8 шт, Филадельфия 8 шт, Калифорния креветка 8 шт, Цезарь запечённый 8 шт, Гейша 8 шт, ролл с огурцом 8 шт' },
  { name: 'Сет Океан', cat: 'sets', price: 200, img: '/img/menu/set-okean.jpg', desc: '24 шт · Острый краб 8 шт, Мидори 8 шт, окунь гриль 8 шт' },
  { name: 'Сет Пекин', cat: 'sets', price: 320, img: '/img/menu/set-pekin.jpg', desc: '32 шт · Темпура микс 8 шт, Калифорния микс 8 шт, сочный лосось 8 шт, Цезарь запечённый 8 шт' },
  // Салаты
  { name: 'Салат Цезарь', cat: 'salads', price: 33, img: '/img/menu/salat-tsezar.jpg', desc: null },
  { name: 'Салат с лососем и сливочным кремом', cat: 'salads', price: 70, img: '/img/menu/salat-losos-krem.jpg', desc: null },
  { name: 'Салат греческий', cat: 'salads', price: 30, img: '/img/menu/salat-grechesky.jpg', desc: null },
  { name: 'Салат чука', cat: 'salads', price: 33, img: '/img/menu/salat-chuka.jpg', desc: null },
  { name: 'Салат хрустящий баклажан', cat: 'salads', price: 45, img: '/img/menu/salat-baklazhan.jpg', desc: null },
  { name: 'Сладкая курочка', cat: 'salads', price: 58, img: '/img/menu/sladkaya-kurochka.jpg', desc: null },
  // Горячие
  { name: 'Крылышки', cat: 'hot', price: 45, img: '/img/menu/krylyshki.jpg', desc: '5 шт' },
  { name: 'Креветки в кляре', cat: 'hot', price: 95, img: '/img/menu/krevetki-v-klyare.jpg', desc: '5 шт · Креветки тигровые, кляр' },
  { name: 'Сырные палочки', cat: 'hot', price: 36, img: '/img/menu/syrnye-palochki.jpg', desc: '5 шт · Сыр моцарелла, кляр, сухари' },
  { name: 'Шашлычки из креветок', cat: 'hot', price: 95, img: '/img/menu/shashlychki-krevetki.jpg', desc: '6 шт · Креветки тигровые' },
  { name: 'Фри', cat: 'hot', price: 20, img: '/img/menu/fri.jpg', desc: null },
  { name: 'Наггетсы', cat: 'hot', price: 20, img: '/img/menu/naggetsy.jpg', desc: null },
  { name: 'Вок с курицей', cat: 'hot', price: 49, img: '/img/menu/vok-kuritsa.jpg', desc: 'Лапша удон, овощи микс, филе куриное, соевый соус, соус шрирача, кунжут' },
  { name: 'Вок с креветками', cat: 'hot', price: 65, img: '/img/menu/vok-krevetki.jpg', desc: 'Лапша удон, овощи микс, креветки тигровые, соевый соус, чеснок, соус шрирача, кунжут' },
  { name: 'Вок классический', cat: 'hot', price: 37, img: '/img/menu/vok-klassichesky.jpg', desc: 'Лапша удон, овощи микс, соус терияки, соевый соус, кунжут' },
  { name: 'Рис с курицей', cat: 'hot', price: 35, img: '/img/menu/ris-kuritsa.jpg', desc: 'Рис японский, филе куриное, соевый соус, овощи микс, терияки соус, кунжут' },
  { name: 'Паста фетучини с креветками', cat: 'hot', price: 68, img: '/img/menu/pasta-fetuchini.jpg', desc: 'Лапша фетучини, креветки тигровые, сыр пармезан, грибы шампиньоны, сливки' },
  { name: 'Рис', cat: 'hot', price: 10, img: '/img/menu/ris.jpg', desc: null },
  // Гамбургеры
  { name: 'Чиз бургер', cat: 'burgers', price: 35, img: '/img/menu/chiz-burger.jpg', desc: null },
  { name: 'Гамбургер', cat: 'burgers', price: 43, img: '/img/menu/gamburger.jpg', desc: null },
  { name: 'Суши бургер с лососем', cat: 'burgers', price: 45, img: '/img/menu/sushi-burger-losos.jpg', desc: null },
  { name: 'Суши бургер с угрём', cat: 'burgers', price: 45, img: '/img/menu/sushi-burger-ugor.jpg', desc: null },
  { name: 'Суши бургер с креветками', cat: 'burgers', price: 45, img: '/img/menu/sushi-burger-krevetki.jpg', desc: null },
  { name: 'Суши-дог с курицей', cat: 'burgers', price: 40, img: '/img/menu/sushi-dog.jpg', desc: null },
  // Десерты
  { name: 'Наполеон', cat: 'desserts', price: 30, img: '/img/menu/napoleon.jpg', desc: null },
  { name: 'Шоколадный', cat: 'desserts', price: 30, img: '/img/menu/shokoladny.jpg', desc: null },
  { name: 'Тирамису', cat: 'desserts', price: 25, img: '/img/menu/tiramisu.jpg', desc: null },
  { name: 'Фруктовый рай', cat: 'desserts', price: 50, img: '/img/menu/fruktovy-ray.jpg', desc: 'Сладкий ролл с фруктами' },
  { name: 'Choko Roll', cat: 'desserts', price: 50, img: '/img/menu/choko-roll.jpg', desc: 'Сладкий ролл в шоколаде' },
  // Напитки (в меню из Instagram не было — уточнить у бара)
  { name: 'Зелёный чай', cat: 'drinks', price: 8, img: null, desc: 'Классический японский' },
  { name: 'Кола', cat: 'drinks', price: 7, img: null, desc: '0.5 л охлаждённая' },
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
