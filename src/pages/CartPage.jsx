import { Link } from 'react-router-dom'
import { ShoppingCartOutlined } from '@ant-design/icons'
import PageHero from '../components/PageHero'

export default function CartPage() {
  // Пока корзина пустая. Логику добавления блюд сделаем позже.
  return (
    <>
      <PageHero eyebrow="заказ" title="Корзина" />
      <section className="section">
        <div className="container">
          <div className="cart-empty">
            <div className="cart-empty__icon"><ShoppingCartOutlined /></div>
            <h3>Корзина пока пустая</h3>
            <p>Загляни в меню и выбери, что хочешь заказать</p>
            <Link to="/menu" className="btn btn--primary">Перейти в меню</Link>
          </div>
        </div>
      </section>
    </>
  )
}
