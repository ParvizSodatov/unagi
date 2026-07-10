import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import './db.js' // создаёт таблицы при старте
import authRoutes from './routes/auth.js'
import menuRoutes from './routes/menu.js'
import orderRoutes from './routes/orders.js'
import uploadRoutes from './routes/upload.js'
import staffRoutes from './routes/staff.js'
import statsRoutes from './routes/stats.js'
import deliveryRoutes from './routes/delivery.js'
import courierRoutes from './routes/couriers.js'
import { telegramEnabled, startTelegramBot } from './notify.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()

const origins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())

app.use(cors({ origin: origins }))
app.use(express.json())

// Раздаём загруженные фото статикой
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// Проверка живости
app.get('/api/health', (req, res) => res.json({ ok: true, ts: Date.now() }))

app.use('/api/auth', authRoutes)
app.use('/api/menu', menuRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/couriers', courierRoutes)

// 404 для неизвестных API-роутов
app.use('/api', (req, res) => res.status(404).json({ error: 'Не найдено' }))

// Общий обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Внутренняя ошибка сервера' })
})

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Унаги API запущен: http://localhost:${PORT}`)
  console.log(`Разрешённые origin: ${origins.join(', ')}`)
  console.log(`Telegram-оповещения: ${telegramEnabled ? 'включены' : 'выключены (не задан TELEGRAM_BOT_TOKEN/CHAT_ID)'}`)
  startTelegramBot()
})
