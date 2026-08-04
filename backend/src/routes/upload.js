import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import crypto from 'node:crypto'
import { requireAuth } from '../auth.js'
import { uploadsDir as uploadDir } from '../paths.js'

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const name = crypto.randomBytes(8).toString('hex') + ext
    cb(null, name)
  },
})

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 МБ
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Только изображения: jpeg, png, webp, gif'))
  },
})

const router = Router()

// POST /api/upload — загрузить фото (только админ), поле формы: "image"
// Возвращает { url } — относительный путь, который можно положить в dish.img
router.post('/', requireAuth, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'Файл не получен (поле image)' })
    res.status(201).json({ url: `/uploads/${req.file.filename}` })
  })
})

export default router
