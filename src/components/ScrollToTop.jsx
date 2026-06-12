import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// При смене страницы прокручиваем наверх
export default function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
