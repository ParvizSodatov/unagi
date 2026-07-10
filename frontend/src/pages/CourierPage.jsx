import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getCourierByToken, ping } from '../api/couriers'

// Страница курьера. Открывается по личной ссылке /courier/<token> на телефоне.
// Курьер жмёт «На смене» — браузер начинает слать GPS-координаты на сервер.
export default function CourierPage() {
  const { token } = useParams()
  const [courier, setCourier] = useState(null)
  const [error, setError] = useState('')
  const [on, setOn] = useState(false)
  const [pos, setPos] = useState(null) // { lat, lng, acc }
  const [sentAt, setSentAt] = useState(null)
  const watchId = useRef(null)
  const lastSent = useRef(0)

  // Узнаём, кто это по токену.
  useEffect(() => {
    getCourierByToken(token)
      .then(setCourier)
      .catch((e) => setError(e.message || 'Ссылка недействительна'))
  }, [token])

  // Останавливаем слежение при уходе со страницы.
  useEffect(() => {
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    }
  }, [])

  function start() {
    if (!navigator.geolocation) {
      setError('Геолокация не поддерживается этим устройством')
      return
    }
    setError('')
    setOn(true)
    watchId.current = navigator.geolocation.watchPosition(
      async (p) => {
        const lat = p.coords.latitude
        const lng = p.coords.longitude
        setPos({ lat, lng, acc: Math.round(p.coords.accuracy) })
        // Шлём не чаще раза в 5 секунд, чтобы не грузить сеть.
        const now = Date.now()
        if (now - lastSent.current < 5000) return
        lastSent.current = now
        try {
          await ping(token, lat, lng)
          setSentAt(new Date().toLocaleTimeString('ru-RU'))
        } catch (e) {
          setError(e.message)
        }
      },
      (err) => setError(`Не удалось получить геолокацию: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    )
  }

  function stop() {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
    setOn(false)
  }

  if (error && !courier) {
    return (
      <div className="courier">
        <div className="courier__card">
          <h2>Ошибка</h2>
          <p className="courier__err">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="courier">
      <div className="courier__card">
        <p className="courier__eyebrow">Унаги · курьер</p>
        <h2 className="courier__name">{courier ? courier.name : '…'}</h2>

        <div className={`courier__status ${on ? 'is-on' : ''}`}>
          {on ? '🟢 На смене — передаю геолокацию' : '⚪ Не на смене'}
        </div>

        {pos && (
          <div className="courier__pos">
            <div>Широта: {pos.lat.toFixed(5)}</div>
            <div>Долгота: {pos.lng.toFixed(5)}</div>
            <div>Точность: ±{pos.acc} м</div>
            {sentAt && <div className="courier__sent">Отправлено: {sentAt}</div>}
          </div>
        )}

        {error && <p className="courier__err">{error}</p>}

        {!on ? (
          <button className="courier__btn courier__btn--go" onClick={start}>
            Выйти на смену
          </button>
        ) : (
          <button className="courier__btn courier__btn--stop" onClick={stop}>
            Завершить смену
          </button>
        )}

        <p className="courier__hint">
          Не закрывайте страницу и разрешите доступ к геолокации, пока вы на смене.
        </p>
      </div>
    </div>
  )
}
