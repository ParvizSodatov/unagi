import { API_URL } from '../config'

// Токен админа храним в localStorage.
const TOKEN_KEY = 'unagi_admin_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

/**
 * Универсальная обёртка над fetch.
 * @param {string} path - путь после /api, например '/menu'
 * @param {object} opts
 * @param {string} [opts.method='GET']
 * @param {*} [opts.body] - тело (для JSON) или FormData (если isForm)
 * @param {boolean} [opts.auth=false] - подставить Bearer-токен
 * @param {boolean} [opts.isForm=false] - тело является FormData (для загрузки файлов)
 */
export async function request(path, { method = 'GET', body, auth = false, isForm = false } = {}) {
  const headers = {}
  if (!isForm) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isForm ? body : body != null ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error((data && data.error) || `Ошибка запроса (${res.status})`)
  }
  return data
}
