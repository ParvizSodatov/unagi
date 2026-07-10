import { request } from './client'

// ─── Публичное ───
// Активные зоны доставки (для корзины).
export const listZones = () => request('/delivery')

// ─── Админ ───
export const listAllZones = () => request('/delivery/all', { auth: true })
export const createZone = (zone) => request('/delivery', { method: 'POST', body: zone, auth: true })
export const updateZone = (id, zone) =>
  request(`/delivery/${id}`, { method: 'PUT', body: zone, auth: true })
export const deleteZone = (id) => request(`/delivery/${id}`, { method: 'DELETE', auth: true })
