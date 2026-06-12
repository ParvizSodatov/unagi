import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero__overlay"></div>
      <div className="container">
        <div className="hero__content">
          <span className="hero__badge"><span className="dot"></span> суши-бар · Душанбе</span>
          <h1 className="hero__title">Свежие суши<br />каждый день</h1>
          <p className="hero__subtitle">
            Готовим роллы и суши по японским рецептам из свежих ингредиентов.
            Доставим по всему Душанбе за 40–60 минут.
          </p>
          <div className="hero__actions">
            <Link to="/menu" className="btn btn--primary">Смотреть меню</Link>
            <Link to="/cart" className="btn btn--ghost">Заказать доставку</Link>
          </div>
          <div className="hero__meta">
            <div className="hero__meta-item"><b>50+</b><span>блюд в меню</span></div>
            <div className="hero__meta-item"><b>40 мин</b><span>доставка</span></div>
            <div className="hero__meta-item"><b>5★</b><span>оценка гостей</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
