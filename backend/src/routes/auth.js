import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { signToken, requireAuth } from '../auth.js'

const router = Router()

// POST /api/auth/login — вход админа по логину/паролю, возвращает JWT
router.post('/login', (req, res) => {
  const { login, password } = req.body || {}
  if (!login || !password) {
    return res.status(400).json({ error: 'Укажите логин и пароль' })
  }
  const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login)
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' })
  }
  const token = signToken(user)
  res.json({ token, user: { id: user.id, login: user.login } })
})

// GET /api/auth/me — проверить токен и узнать, кто залогинен
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, login: req.user.login } })
})

export default router
