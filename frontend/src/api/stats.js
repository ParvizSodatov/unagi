import { request } from './client'

// Сводка для дашборда (админ)
export const getDashboard = () => request('/stats/dashboard', { auth: true })
