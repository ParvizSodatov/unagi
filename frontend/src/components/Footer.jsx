import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__col">
          <Logo light />
          <p className="footer__desc">Улетные роллы в городе.<br />Свежо. Вкусно. С доставкой.</p>
        </div>
        <div className="footer__col">
          <h4>Контакты</h4>
          <p>г. Душанбе, ТЦ «Гулдаста», 92 мкр</p>
          <p><a href="tel:+992905753300">+992 90 575 33 00</a></p>
          <p>каждый день 10:00 – 00:00</p>
        </div>
        <div className="footer__col">
          <h4>Разделы</h4>
          <Link to="/">Главная</Link>
          <Link to="/menu">Меню</Link>
          <Link to="/about">О нас</Link>
          <Link to="/contacts">Контакты</Link>
          <Link to="/cart">Корзина</Link>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">© 2026 Унаги · Все права защищены</div>
      </div>
    </footer>
  )
}
