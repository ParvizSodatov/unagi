// Единая точка входа в API-слой.
// Использование: import { menu, auth, orders } from '@/api'  (или относительным путём)
export * as menu from './menu'
export * as auth from './auth'
export * as orders from './orders'
export * as staff from './staff'
export * as stats from './stats'
export { getToken, setToken } from './client'
