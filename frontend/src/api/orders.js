import { request } from './client'

/**
 * Оформить заказ (публично).
 * @param {object} order { customer, phone, address?, comment?, items: [{ dish_id, qty }] }
 */
export const createOrder = (order) => request('/orders', { method: 'POST', body: order })

// ─── Админ ───
export const listOrders = (status) =>
  request(`/orders${status ? `?status=${status}` : ''}`, { auth: true })
export const getOrder = (id) => request(`/orders/${id}`, { auth: true })
export const updateOrderStatus = (id, status) =>
  request(`/orders/${id}/status`, { method: 'PATCH', body: { status }, auth: true })
