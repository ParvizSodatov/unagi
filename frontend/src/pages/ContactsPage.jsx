import { EnvironmentOutlined, PhoneOutlined, ClockCircleOutlined, InstagramOutlined } from '@ant-design/icons'
import PageHero from '../components/PageHero'

const info = [
  { Icon: EnvironmentOutlined, title: 'Адрес', value: 'г. Душанбе, ТЦ «Гулдаста», 92 мкр' },
  { Icon: PhoneOutlined, title: 'Телефон', value: '+992 90 575 33 00', href: 'tel:+992905753300' },
  { Icon: ClockCircleOutlined, title: 'Часы работы', value: 'Каждый день, 10:00 – 00:00' },
  { Icon: InstagramOutlined, title: 'Instagram', value: '@unagi_tj', href: 'https://www.instagram.com/unagi_tj/' },
]

export default function ContactsPage() {
  return (
    <>
      <PageHero
        eyebrow="контакты"
        title="Как нас найти"
        lead="Заходи в гости или заказывай доставку — мы всегда на связи"
      />
      <section className="section">
        <div className="container contacts__inner">
          <div className="contacts__list">
            {info.map(({ Icon, title, value, href }) => (
              <div className="contacts__item" key={title}>
                <span className="contacts__icon"><Icon /></span>
                <div>
                  <span className="contacts__label">{title}</span>
                  {href
                    ? <a className="contacts__value" href={href}>{value}</a>
                    : <span className="contacts__value">{value}</span>}
                </div>
              </div>
            ))}
          </div>
          <div className="contacts__map">
            <iframe
              title="Карта"
              src="https://maps.google.com/maps?q=%D0%A2%D0%A6%20%D0%93%D1%83%D0%BB%D0%B4%D0%B0%D1%81%D1%82%D0%B0%2C%2092%20%D0%BC%D0%BA%D1%80%2C%20%D0%94%D1%83%D1%88%D0%B0%D0%BD%D0%B1%D0%B5&z=15&output=embed"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>
    </>
  )
}
