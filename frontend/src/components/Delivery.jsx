import { PhoneOutlined, SendOutlined, InstagramOutlined } from '@ant-design/icons'

const channels = [
  { Icon: PhoneOutlined, title: 'Позвонить', value: '+992 00 000 00 00', href: 'tel:+992000000000' },
  { Icon: SendOutlined, title: 'Telegram', value: '@unagi_dushanbe', href: '#' },
  { Icon: InstagramOutlined, title: 'Instagram', value: '@unagi.tj', href: '#' },
]

export default function Delivery() {
  return (
    <section className="section" id="delivery">
      <div className="container">
        <div className="section-head section-head--center">
          <p className="eyebrow">доставка</p>
          <h2 className="section-title">Закажи прямо сейчас</h2>
          <p className="section-lead">Позвони нам или напиши в мессенджер — оформим заказ за пару минут</p>
        </div>
        <div className="channels">
          {channels.map(({ Icon, title, value, href }) => (
            <a className="channel" key={title} href={href}>
              <span className="channel__icon"><Icon /></span>
              <span className="channel__label">{title}</span>
              <b className="channel__value">{value}</b>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
