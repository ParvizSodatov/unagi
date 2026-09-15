import { request } from './client'

// Собирает ?from=…&to=… из объекта, пропуская пустые значения.
const qs = (params = {}) => {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

// ─── Продукты ───
// Возвращает { since, products: [...] }, где since — дата последней ревизии,
// от которой посчитаны текущие остатки.
export const getProducts = () => request('/stock/products', { auth: true })
export const createProduct = (data) =>
  request('/stock/products', { method: 'POST', body: data, auth: true })
export const updateProduct = (id, data) =>
  request(`/stock/products/${id}`, { method: 'PUT', body: data, auth: true })
export const deleteProduct = (id) =>
  request(`/stock/products/${id}`, { method: 'DELETE', auth: true })
export const mergeProduct = (id, into) =>
  request(`/stock/products/${id}/merge`, { method: 'POST', body: { into }, auth: true })

// ─── Техкарты ───
export const getRecipes = () => request('/stock/recipes', { auth: true })
export const getRecipe = (dishId) => request(`/stock/recipes/${dishId}`, { auth: true })
export const saveRecipe = (dishId, items) =>
  request(`/stock/recipes/${dishId}`, { method: 'PUT', body: { items }, auth: true })
export const deleteRecipe = (dishId) =>
  request(`/stock/recipes/${dishId}`, { method: 'DELETE', auth: true })

// ─── Приход и списания ───
export const getMoves = (params) => request(`/stock/moves${qs(params)}`, { auth: true })
export const createMove = (data) =>
  request('/stock/moves', { method: 'POST', body: data, auth: true })
export const deleteMove = (id) => request(`/stock/moves/${id}`, { method: 'DELETE', auth: true })

// ─── Расход за период ───
export const getConsumption = (params) =>
  request(`/stock/consumption${qs(params)}`, { auth: true })

// ─── Ревизия ───
export const getRevisions = () => request('/stock/revisions', { auth: true })
export const getRevision = (id) => request(`/stock/revisions/${id}`, { auth: true })
export const createRevision = (data) =>
  request('/stock/revisions', { method: 'POST', body: data, auth: true })
export const saveRevision = (id, items) =>
  request(`/stock/revisions/${id}`, { method: 'PUT', body: { items }, auth: true })
export const applyRevision = (id) =>
  request(`/stock/revisions/${id}/apply`, { method: 'POST', auth: true })
export const deleteRevision = (id) =>
  request(`/stock/revisions/${id}`, { method: 'DELETE', auth: true })
