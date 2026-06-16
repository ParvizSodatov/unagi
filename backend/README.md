# Унаги — бэкенд (API)

Node + Express + SQLite (встроенный модуль `node:sqlite`, нативных зависимостей нет).

## Запуск

```bash
cd server
npm install        # один раз
cp .env.example .env   # настроить при необходимости (на Windows скопировать вручную)
npm run seed       # заполнить базу стартовым меню и создать админа (один раз)
npm run dev        # запуск с авто-перезагрузкой (node --watch)
# или
npm start          # обычный запуск
```

По умолчанию API поднимается на `http://localhost:4001` (порт 4000 был занят другим приложением — меняется в `.env`).

Админ по умолчанию: **admin / admin123** (задаётся в `.env`, поменяйте на проде).

## Эндпоинты

### Публичные
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | проверка живости |
| GET | `/api/menu` | всё меню: `{ categories, dishes }` |
| GET | `/api/menu/categories` | список категорий |
| GET | `/api/menu/dishes` | блюда (`?all=1` — включая скрытые) |
| POST | `/api/orders` | оформить заказ из корзины |

### Авторизация
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/login` | вход: `{ login, password }` → `{ token, user }` |
| GET | `/api/auth/me` | кто залогинен (нужен токен) |

### Только для админа (заголовок `Authorization: Bearer <token>`)
| Метод | Путь | Описание |
|-------|------|----------|
| POST/PUT/DELETE | `/api/menu/categories[/:id]` | CRUD категорий |
| POST/PUT/DELETE | `/api/menu/dishes[/:id]` | CRUD блюд |
| GET | `/api/orders` | список заказов (`?status=new`) |
| GET | `/api/orders/:id` | заказ с позициями |
| PATCH | `/api/orders/:id/status` | сменить статус (`new`/`accepted`/`delivering`/`done`/`canceled`) |
| POST | `/api/upload` | загрузить фото (multipart, поле `image`) → `{ url }` |

### Формат заказа (POST /api/orders)
```json
{
  "customer": "Имя",
  "phone": "+992...",
  "address": "адрес (необязательно)",
  "comment": "коммент (необязательно)",
  "items": [{ "dish_id": 1, "qty": 2 }]
}
```
Сумма заказа считается на сервере по ценам из базы — клиентские цены не принимаются.

## Файлы
- `src/index.js` — сборка приложения и роутов
- `src/db.js` — подключение к SQLite и схема
- `src/seed.js` — стартовые данные
- `src/auth.js` — JWT (подпись + middleware)
- `src/routes/` — auth, menu, orders, upload
- `uploads/` — загруженные фото (раздаются на `/uploads/...`)
- `unagi.db` — файл базы (создаётся автоматически, в git не коммитится)
