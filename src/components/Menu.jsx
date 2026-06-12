import { useState } from 'react'
import { Link } from 'react-router-dom'
import { categories, dishes } from '../data/menu'

// preview=true — короткая версия для главной (без табов, несколько блюд + кнопка)
export default function Menu({ preview = false }) {
  const [active, setActive] = useState('all')

  const list = preview
    ? dishes.slice(0, 6)
    : active === 'all'
      ? dishes
      : dishes.filter(d => d.cat === active)

  return (
    <section className={`section${preview ? ' section--warm' : ''}`}>
      <div className="container">
        {preview && (
          <div className="section-head section-head--center">
            <p className="eyebrow">наше меню</p>
            <h2 className="section-title">Популярное</h2>
          </div>
        )}

        {!preview && (
          <div className="menu__tabs">
            {categories.map(c => (
              <button
                key={c.id}
                className={`menu__tab${active === c.id ? ' is-active' : ''}`}
                onClick={() => setActive(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="menu__grid">
          {list.map(d => (
            <article className="dish" key={d.id}>
              <div className="dish__media">
                <img src={d.img} alt={d.name} loading="lazy" />
              </div>
              <div className="dish__body">
                <div className="dish__head">
                  <h3 className="dish__name">{d.name}</h3>
                  <span className="dish__price">{d.price} c.</span>
                </div>
                <p className="dish__desc">{d.desc}</p>
                <button className="btn btn--primary dish__btn">В корзину</button>
              </div>
            </article>
          ))}
        </div>

        {preview && (
          <div className="menu__more">
            <Link to="/menu" className="btn btn--ghost">Смотреть всё меню →</Link>
          </div>
        )}
      </div>
    </section>
  )
}
