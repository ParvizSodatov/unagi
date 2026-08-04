import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMenu } from '../api/menu'
import { useCart } from '../context/CartContext'

// Сколько блюд показываем на одной странице меню
const PAGE_SIZE = 12

// preview=true — короткая версия для главной (без табов, несколько блюд + кнопка)
export default function Menu({ preview = false }) {
  const [categories, setCategories] = useState([])
  const [dishes, setDishes] = useState([])
  const [active, setActive] = useState('all')
  const [page, setPage] = useState(1)
  const gridRef = useRef(null)
  const { add } = useCart()
  // id блюда, у которого только что нажали кнопку — для короткой надписи «Добавлено ✓»
  const [added, setAdded] = useState(null)

  useEffect(() => {
    getMenu()
      .then((data) => {
        setCategories(data.categories)
        setDishes(data.dishes.filter((d) => d.available))
      })
      .catch(() => {})
  }, [])

  function handleAdd(dish) {
    add(dish)
    setAdded(dish.id)
    setTimeout(() => setAdded((cur) => (cur === dish.id ? null : cur)), 1200)
  }

  function selectTab(id) {
    setActive(id)
    setPage(1)
  }

  function goToPage(p) {
    setPage(p)
    // Возвращаемся к началу списка, чтобы не оставаться внизу страницы
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const filtered = active === 'all' ? dishes : dishes.filter(d => d.cat === active)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const list = preview
    ? dishes.slice(0, 6)
    : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
            {[{ id: 'all', label: 'Всё' }, ...categories].map(c => (
              <button
                key={c.id}
                className={`menu__tab${active === c.id ? ' is-active' : ''}`}
                onClick={() => selectTab(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        <div className="menu__grid" ref={gridRef}>
          {list.map(d => (
            <article className="dish" key={d.id}>
              <div className="dish__media">
                {d.img
                  ? <img src={d.img} alt={d.name} loading="lazy" />
                  : <span className="dish__placeholder" aria-hidden="true">🍣</span>}
              </div>
              <div className="dish__body">
                <div className="dish__head">
                  <h3 className="dish__name">{d.name}</h3>
                  <span className="dish__price">{d.price} c.</span>
                </div>
                <p className="dish__desc">{d.desc}</p>
                <button
                  className="btn btn--primary dish__btn"
                  onClick={() => handleAdd(d)}
                >
                  {added === d.id ? 'Добавлено ✓' : 'В корзину'}
                </button>
              </div>
            </article>
          ))}
        </div>

        {!preview && totalPages > 1 && (
          <div className="menu__pager">
            <button
              className="menu__page-btn"
              disabled={page === 1}
              onClick={() => goToPage(page - 1)}
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`menu__page-btn${page === p ? ' is-active' : ''}`}
                onClick={() => goToPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="menu__page-btn"
              disabled={page === totalPages}
              onClick={() => goToPage(page + 1)}
            >
              →
            </button>
          </div>
        )}

        {preview && (
          <div className="menu__more">
            <Link to="/menu" className="btn btn--ghost">Смотреть всё меню →</Link>
          </div>
        )}
      </div>
    </section>
  )
}
