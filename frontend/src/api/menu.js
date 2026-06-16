import { request } from './client'

// ─── Чтение (публично) ───
export const getMenu = () => request('/menu')
export const getCategories = () => request('/menu/categories')
export const getDishes = (all = false) => request(`/menu/dishes${all ? '?all=1' : ''}`)

// ─── Категории (админ) ───
export const createCategory = (data) =>
  request('/menu/categories', { method: 'POST', body: data, auth: true })
export const updateCategory = (id, data) =>
  request(`/menu/categories/${id}`, { method: 'PUT', body: data, auth: true })
export const deleteCategory = (id) =>
  request(`/menu/categories/${id}`, { method: 'DELETE', auth: true })

// ─── Блюда (админ) ───
export const createDish = (data) =>
  request('/menu/dishes', { method: 'POST', body: data, auth: true })
export const updateDish = (id, data) =>
  request(`/menu/dishes/${id}`, { method: 'PUT', body: data, auth: true })
export const deleteDish = (id) =>
  request(`/menu/dishes/${id}`, { method: 'DELETE', auth: true })

// ─── Загрузка фото блюда (админ) → возвращает { url } ───
export async function uploadImage(file) {
  const form = new FormData()
  form.append('image', file)
  return request('/upload', { method: 'POST', body: form, auth: true, isForm: true })
}
