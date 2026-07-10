import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ShoppingCartOutlined } from '@ant-design/icons'
import Logo from './Logo'
import { useCart } from '../context/CartContext'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { count } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = [
    { to: '/', label: 'Главная', end: true },
    { to: '/menu', label: 'Меню' },
    { to: '/about', label: 'О нас' },
    { to: '/contacts', label: 'Контакты' },
  ]

  // На главной шапка лежит поверх тёмного hero — текст делаем белым, пока не прокрутили
  const overHero = pathname === '/' && !scrolled

  return (
    <header className={`header${scrolled ? ' is-scrolled' : ''}${overHero ? ' header--over-hero' : ''}`}>
      <div className="container header__inner">
        <Logo />

        <nav className={`nav${open ? ' is-open' : ''}`}>
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => `nav__link${isActive ? ' is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__actions">
          <NavLink to="/cart" className="cart-btn" aria-label="Корзина">
            <ShoppingCartOutlined />
            {count > 0 && <span className="cart-btn__count">{count}</span>}
          </NavLink>
          <NavLink to="/admin" className="btn btn--ghost admin-btn">Админ</NavLink>
          <button className="burger" aria-label="Меню" onClick={() => setOpen(o => !o)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>
    </header>
  )
}
