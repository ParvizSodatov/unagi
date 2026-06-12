import { ThunderboltOutlined, CrownOutlined, RocketOutlined } from '@ant-design/icons'

const items = [
  { Icon: CrownOutlined, title: 'Свежая рыба', text: 'Только качественные ингредиенты каждый день' },
  { Icon: ThunderboltOutlined, title: 'Японские рецепты', text: 'Готовим по традиционным технологиям' },
  { Icon: RocketOutlined, title: 'Быстрая доставка', text: 'По всему Душанбе за 40–60 минут' },
]

export default function Features() {
  return (
    <section className="section">
      <div className="container features__grid">
        {items.map(({ Icon, title, text }) => (
          <div className="feature" key={title}>
            <div className="feature__icon"><Icon /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
