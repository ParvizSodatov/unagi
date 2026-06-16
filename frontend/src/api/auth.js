import { request, setToken, getToken } from './client'

// Вход админа: сохраняет токен и возвращает пользователя
export async function login(loginValue, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: { login: loginValue, password },
  })
  setToken(data.token)
  return data.user
}

// Проверить текущий токен (кто залогинен)
export const me = () => request('/auth/me', { auth: true })

// Залогинен ли (есть ли токен локально)
export const isLoggedIn = () => Boolean(getToken())

// Выход
export function logout() {
  setToken(null)
}
