import { ClockCircleOutlined, EnvironmentOutlined, WalletOutlined, GiftOutlined } from '@ant-design/icons'

const conditions = [
  { Icon: ClockCircleOutlined, title: '40–60 минут', text: 'Среднее время доставки по городу' },
  { Icon: EnvironmentOutlined, title: 'Весь Душанбе', text: 'Доставляем по всем районам города' },
  { Icon: WalletOutlined, title: 'От 50 c.', text: 'Минимальная сумма заказа' },
  { Icon: GiftOutlined, title: 'Бесплатно от 150 c.', text: 'Доставка в подарок при заказе от 150 c.' },
]

export default function DeliveryInfo() {
  return (
    <section className="section section--warm" id="delivery">
      <div className="container">
        <div className="section-head section-head--center">
          <p className="eyebrow">доставка</p>
          <h2 className="section-title">Условия доставки</h2>
          <p className="section-lead">Привозим горячими и свежими по всему Душанбе</p>
        </div>
        <div className="features__grid features__grid--4">
          {conditions.map(({ Icon, title, text }) => (
            <div className="feature" key={title}>
              <div className="feature__icon"><Icon /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
