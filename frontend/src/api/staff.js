import { request } from './client'

// ─── Сотрудники (админ) ───
export const getStaff = () => request('/staff', { auth: true })
export const createStaff = (data) =>
  request('/staff', { method: 'POST', body: data, auth: true })
export const updateStaff = (id, data) =>
  request(`/staff/${id}`, { method: 'PUT', body: data, auth: true })
export const deleteStaff = (id) =>
  request(`/staff/${id}`, { method: 'DELETE', auth: true })

// ─── Выплаты зарплат (админ) ───
export const getPayments = (id) =>
  request(`/staff/${id}/payments`, { auth: true })
export const addPayment = (id, data) =>
  request(`/staff/${id}/payments`, { method: 'POST', body: data, auth: true })
export const deletePayment = (id, pid) =>
  request(`/staff/${id}/payments/${pid}`, { method: 'DELETE', auth: true })

// ─── Штрафы и премии (админ) ───
export const getAdjustments = (id) =>
  request(`/staff/${id}/adjustments`, { auth: true })
export const addAdjustment = (id, data) =>
  request(`/staff/${id}/adjustments`, { method: 'POST', body: data, auth: true })
export const deleteAdjustment = (id, aid) =>
  request(`/staff/${id}/adjustments/${aid}`, { method: 'DELETE', auth: true })

// ─── Табель / смены (админ) ───
export const getShiftsSummary = (month) =>
  request(`/staff/shifts?month=${month}`, { auth: true })
export const getShifts = (id, month) =>
  request(`/staff/${id}/shifts${month ? `?month=${month}` : ''}`, { auth: true })
export const addShift = (id, data) =>
  request(`/staff/${id}/shifts`, { method: 'POST', body: data, auth: true })
export const deleteShift = (id, sid) =>
  request(`/staff/${id}/shifts/${sid}`, { method: 'DELETE', auth: true })
