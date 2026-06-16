// Единая точка входа в API-слой.
// Использование: import { menu, auth, orders } from '@/api'  (или относительным путём)
export * as menu from './menu'
export * as auth from './auth'
export * as orders from './orders'
export { getToken, setToken } from './client'
