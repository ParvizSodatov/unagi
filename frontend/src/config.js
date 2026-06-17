// Базовый URL API. В проде задаётся через переменную окружения VITE_API_URL.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4001/api'

// Хост бэкенда без /api — нужен, чтобы показывать загруженные фото из /uploads.
export const ASSET_URL = API_URL.replace(/\/api\/?$/, '')

// Превращает путь картинки в полный URL.
// /uploads/... лежит на бэке, /img/... — в public фронта, http(s) — внешняя ссылка.
export function imgUrl(p) {
  if (!p) return ''
  if (/^https?:\/\//.test(p)) return p
  if (p.startsWith('/uploads')) return ASSET_URL + p
  return p
}
