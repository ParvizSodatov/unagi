import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'dev-secret'

export function signToken(user) {
  return jwt.sign({ id: user.id, login: user.login }, SECRET, { expiresIn: '7d' })
}

// Middleware: пускает дальше только с валидным токеном в заголовке Authorization: Bearer <token>
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' })
  }
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' })
  }
}
