// Данные меню. Пока захардкожены — позже будут приходить из админки.
export const categories = [
  { id: 'all', label: 'Всё' },
  { id: 'rolls', label: 'Роллы' },
  { id: 'sushi', label: 'Суши' },
  { id: 'sets', label: 'Сеты' },
  { id: 'drinks', label: 'Напитки' },
]

export const dishes = [
  { id: 1, name: 'Филадельфия', cat: 'rolls', price: 38, img: '/img/dish1.jpg', desc: 'Лосось, сливочный сыр, огурец' },
  { id: 2, name: 'Калифорния', cat: 'rolls', price: 34, img: '/img/dish2.jpg', desc: 'Краб, авокадо, икра тобико' },
  { id: 3, name: 'Дракон', cat: 'rolls', price: 42, img: '/img/dish3.jpg', desc: 'Угорь, унаги соус, кунжут' },
  { id: 4, name: 'Запечённый ролл', cat: 'rolls', price: 36, img: '/img/dish4.jpg', desc: 'Под сырной шапкой, креветка' },
  { id: 5, name: 'Нигири с лососем', cat: 'sushi', price: 14, img: '/img/dish5.jpg', desc: 'Рис и свежий лосось' },
  { id: 6, name: 'Нигири с тунцом', cat: 'sushi', price: 16, img: '/img/dish6.jpg', desc: 'Рис и нежный тунец' },
  { id: 7, name: 'Гункан с икрой', cat: 'sushi', price: 18, img: '/img/dish7.jpg', desc: 'С икрой тобико' },
  { id: 8, name: 'Сет «Унаги»', cat: 'sets', price: 120, img: '/img/dish8.jpg', desc: '32 шт — выбор шефа' },
  { id: 9, name: 'Сет «Компания»', cat: 'sets', price: 190, img: '/img/dish9.jpg', desc: '48 шт — на всех хватит' },
  { id: 10, name: 'Сет «Лосось»', cat: 'sets', price: 140, img: '/img/dish10.jpg', desc: '24 шт — для любителей лосося' },
  { id: 11, name: 'Зелёный чай', cat: 'drinks', price: 8, img: '/img/dish11.jpg', desc: 'Классический японский' },
  { id: 12, name: 'Кола', cat: 'drinks', price: 7, img: '/img/dish12.jpg', desc: '0.5 л охлаждённая' },
]
