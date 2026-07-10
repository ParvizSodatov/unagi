import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCartOutlined, CheckCircleFilled, DeleteOutlined } from '@ant-design/icons'
import PageHero from '../components/PageHero'
import { useCart } from '../context/CartContext'
import { createOrder } from '../api/orders'
import { listZones } from '../api/delivery'

export default function CartPage() {
  const { items, setQty, remove, clear, total: subtotal } = useCart()
  const [zones, setZones] = useState([])
  const [zoneId, setZoneId] = useState('pickup') // 'pickup' — самовывоз
  const [form, setForm] = useState({ customer: '', phone: '', address: '', comment: '' })
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null) // { id, total } после успешного заказа

  // Подгружаем зоны доставки.
  useEffect(() => {
    listZones()
      .then(setZones)
      .catch(() => setZones([]))
  }, [])

  const zone = zones.find((z) => String(z.id) === String(zoneId)) || null
  const isPickup = zoneId === 'pickup'

  // Стоимость доставки: самовывоз — 0; бесплатно, если достигнут порог free_from.
  const deliveryFee = isPickup || !zone ? 0 : zone.free_from != null && subtotal >= zone.free_from ? 0 : zone.price
  const belowMin = zone ? subtotal < zone.min_order : false
  const grandTotal = subtotal + deliveryFee

  function upd(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.customer.trim() || !form.phone.trim()) {
      setError('Укажите имя и телефон')
      return
    }
    if (!isPickup && !form.address.trim()) {
      setError('Укажите адрес доставки')
      return
    }
    if (belowMin) {
      setError(`Минимальный заказ для зоны «${zone.name}» — ${zone.min_order} c.`)
      return
    }
    setSending(true)
    try {
      const res = await createOrder({
        customer: form.customer.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
        comment: form.comment.trim() || null,
        zone_id: isPickup ? null : zone.id,
        items: items.map((it) => ({ name: it.name, price: it.price, qty: it.qty })),
      })
      setDone(res)
      clear()
    } catch (err) {
      setError(err.message || 'Не удалось оформить заказ. Попробуйте ещё раз.')
    } finally {
      setSending(false)
    }
  }

  // Экран успеха
  if (done) {
    return (
      <>
        <PageHero eyebrow="заказ" title="Заказ оформлен" />
        <section className="section">
          <div className="container">
            <div className="cart-empty">
              <div className="cart-empty__icon cart-empty__icon--ok"><CheckCircleFilled /></div>
              <h3>Спасибо! Заказ №{done.id} принят</h3>
              <p>Сумма: {done.total} c. Мы скоро свяжемся с вами для подтверждения.</p>
              <Link to="/menu" className="btn btn--primary">Вернуться в меню</Link>
            </div>
          </div>
        </section>
      </>
    )
  }

  // Пустая корзина
  if (items.length === 0) {
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

  // Корзина с позициями + форма
  return (
    <>
      <PageHero eyebrow="заказ" title="Корзина" />
      <section className="section">
        <div className="container cart-layout">
          {/* Список позиций */}
          <div className="cart-list">
            {items.map((it) => (
              <div className="cart-row" key={it.id}>
                <div className="cart-row__img">
                  {it.img ? <img src={it.img} alt={it.name} /> : <ShoppingCartOutlined />}
                </div>
                <div className="cart-row__info">
                  <span className="cart-row__name">{it.name}</span>
                  <span className="cart-row__price">{it.price} c.</span>
                </div>
                <div className="cart-qty">
                  <button type="button" onClick={() => setQty(it.id, it.qty - 1)} aria-label="Меньше">−</button>
                  <span>{it.qty}</span>
                  <button type="button" onClick={() => setQty(it.id, it.qty + 1)} aria-label="Больше">+</button>
                </div>
                <span className="cart-row__sum">{it.price * it.qty} c.</span>
                <button className="cart-row__del" type="button" onClick={() => remove(it.id)} aria-label="Удалить">
                  <DeleteOutlined />
                </button>
              </div>
            ))}
          </div>

          {/* Оформление */}
          <form className="cart-checkout" onSubmit={submit}>
            <label className="cart-field">
              <span>Доставка</span>
              <select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                <option value="pickup">Самовывоз — бесплатно</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {z.price} c.{z.free_from != null ? ` (от ${z.free_from} c. бесплатно)` : ''}
                  </option>
                ))}
              </select>
            </label>

            {zone && (
              <p className="cart-zone-hint">
                Мин. заказ: {zone.min_order} c.
                {zone.free_from != null && ` · бесплатно от ${zone.free_from} c.`}
              </p>
            )}

            {/* Разбивка суммы */}
            <div className="cart-sum">
              <div className="cart-sum__row"><span>Блюда</span><span>{subtotal} c.</span></div>
              <div className="cart-sum__row">
                <span>Доставка</span>
                <span>{isPickup ? 'самовывоз' : deliveryFee ? `${deliveryFee} c.` : 'бесплатно'}</span>
              </div>
              <div className="cart-sum__row cart-sum__row--total"><span>Итого</span><b>{grandTotal} c.</b></div>
            </div>

            <label className="cart-field">
              <span>Имя *</span>
              <input value={form.customer} onChange={(e) => upd('customer', e.target.value)} placeholder="Как к вам обращаться" />
            </label>
            <label className="cart-field">
              <span>Телефон *</span>
              <input value={form.phone} onChange={(e) => upd('phone', e.target.value)} placeholder="+992 __ ___ __ __" />
            </label>
            {!isPickup && (
              <label className="cart-field">
                <span>Адрес доставки *</span>
                <input value={form.address} onChange={(e) => upd('address', e.target.value)} placeholder="Улица, дом, квартира" />
              </label>
            )}
            <label className="cart-field">
              <span>Комментарий</span>
              <textarea value={form.comment} onChange={(e) => upd('comment', e.target.value)} rows={2} placeholder="Пожелания к заказу" />
            </label>

            {(error || belowMin) && (
              <p className="cart-error">
                {error || `До минимального заказа не хватает ${zone.min_order - subtotal} c.`}
              </p>
            )}

            <button className="btn btn--primary cart-submit" type="submit" disabled={sending || belowMin}>
              {sending ? 'Отправляем…' : `Оформить заказ · ${grandTotal} c.`}
            </button>
          </form>
        </div>
      </section>
    </>
  )
}
