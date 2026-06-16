import { EnvironmentOutlined, PhoneOutlined, ClockCircleOutlined, SendOutlined } from '@ant-design/icons'
import PageHero from '../components/PageHero'

const info = [
  { Icon: EnvironmentOutlined, title: 'Адрес', value: 'г. Душанбе, ул. Рудаки, 00' },
  { Icon: PhoneOutlined, title: 'Телефон', value: '+992 00 000 00 00', href: 'tel:+992000000000' },
  { Icon: ClockCircleOutlined, title: 'Часы работы', value: 'Каждый день, 10:00 – 23:00' },
  { Icon: SendOutlined, title: 'Telegram', value: '@unagi_dushanbe', href: '#' },
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
              src="https://maps.google.com/maps?q=Dushanbe%20Rudaki&z=14&output=embed"
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </section>
    </>
  )
}
