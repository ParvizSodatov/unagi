import { request } from './client'

// ─── Публичное (страница курьера, по токену) ───
export const getCourierByToken = (token) => request(`/couriers/by-token/${token}`)
export const ping = (token, lat, lng) =>
  request('/couriers/ping', { method: 'POST', body: { token, lat, lng } })

// ─── Админ ───
export const listCouriers = () => request('/couriers', { auth: true })
export const listLocations = () => request('/couriers/locations', { auth: true })
export const createCourier = (data) => request('/couriers', { method: 'POST', body: data, auth: true })
export const updateCourier = (id, data) =>
  request(`/couriers/${id}`, { method: 'PUT', body: data, auth: true })
export const deleteCourier = (id) => request(`/couriers/${id}`, { method: 'DELETE', auth: true })
