import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Каталог данных (база + загруженные фото).
// Локально — корень backend/, на хостинге задаётся DATA_DIR (на Railway это volume, напр. /data).
export const dataDir = process.env.DATA_DIR || path.join(__dirname, '..')
export const dbPath = path.join(dataDir, 'unagi.db')
export const uploadsDir = path.join(dataDir, 'uploads')

fs.mkdirSync(uploadsDir, { recursive: true })
