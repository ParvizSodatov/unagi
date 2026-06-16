# Унаги — суши-бар (Душанбе)

Монорепо сайта суши-бара «Унаги».

```
unagi/
├── frontend/   # React + Vite + React Router + Ant Design — витрина, корзина, админка
├── backend/    # Node + Express + SQLite — API: меню, заказы, авторизация, загрузка фото
├── package.json  # корневые скрипты (запуск обоих разом)
└── vercel.json   # деплой фронтенда на Vercel
```

## Быстрый старт

```bash
# 1. Установить зависимости обоих проектов
npm run install:all

# 2. Заполнить базу стартовым меню и создать админа (один раз)
npm run seed

# 3. Запустить фронт и бэк одной командой
npm run dev
```

- Фронтенд: http://localhost:5173
- Бэкенд (API): http://localhost:4001/api
- Админ по умолчанию: **admin / admin123** (меняется в `backend/.env`)

Можно запускать по отдельности: `npm run dev:front` и `npm run dev:back`.

## Подробнее
- Архитектура и эндпоинты API — [backend/README.md](backend/README.md)
- Фронтенд общается с API через слой [frontend/src/api/](frontend/src/api/); адрес API задаётся в `frontend/.env` (`VITE_API_URL`).

## Деплой
- **Фронтенд** — Vercel (см. `vercel.json`): собирается из `frontend/`, SPA-роутинг через rewrites. На проде задать `VITE_API_URL` на публичный адрес бэкенда.
- **Бэкенд** — отдельный хостинг с поддержкой Node (Railway / Render / VPS). SQLite-файл `backend/unagi.db` должен лежать на постоянном диске.
