import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Глобальная корзина: хранит позиции, считает сумму/количество,
// переживает перезагрузку страницы (localStorage).
const CartContext = createContext(null)

const STORAGE_KEY = 'unagi_cart'

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadInitial)

  // Сохраняем корзину при каждом изменении.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  // Добавить блюдо (или +1, если уже в корзине).
  function add(dish) {
    setItems((prev) => {
      const found = prev.find((it) => it.id === dish.id)
      if (found) {
        return prev.map((it) => (it.id === dish.id ? { ...it, qty: it.qty + 1 } : it))
      }
      return [...prev, { id: dish.id, name: dish.name, price: dish.price, img: dish.img, qty: 1 }]
    })
  }

  // Задать количество (< 1 — удаляем позицию).
  function setQty(id, qty) {
    setItems((prev) =>
      qty < 1 ? prev.filter((it) => it.id !== id) : prev.map((it) => (it.id === id ? { ...it, qty } : it)),
    )
  }

  function remove(id) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  function clear() {
    setItems([])
  }

  const count = useMemo(() => items.reduce((s, it) => s + it.qty, 0), [items])
  const total = useMemo(() => items.reduce((s, it) => s + it.price * it.qty, 0), [items])

  const value = { items, add, setQty, remove, clear, count, total }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// Хук доступа к корзине из любого компонента.
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart должен использоваться внутри <CartProvider>')
  return ctx
}
