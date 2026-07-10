import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Центр Душанбе — стартовый вид карты.
const DUSHANBE = [38.5598, 68.787]

// Карта с метками курьеров. couriers: [{ id, name, last_lat, last_lng, seconds_ago }]
export default function CourierMap({ couriers }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const fittedRef = useRef(false)

  // Инициализация карты один раз.
  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(elRef.current).setView(DUSHANBE, 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    // Карта монтируется в скрытом/анимированном контейнере — пересчитываем размер.
    setTimeout(() => map.invalidateSize(), 150)
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Перерисовка меток при обновлении данных.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer || !mapRef.current) return
    layer.clearLayers()
    const points = []
    couriers.forEach((c) => {
      if (c.last_lat == null || c.last_lng == null) return
      const ll = [c.last_lat, c.last_lng]
      points.push(ll)
      const stale = c.seconds_ago != null && c.seconds_ago > 120 // >2 мин без связи
      const marker = L.circleMarker(ll, {
        radius: 9,
        color: '#fff',
        weight: 2,
        fillColor: stale ? '#9a9a9a' : '#e8622e',
        fillOpacity: 1,
      })
      marker.bindTooltip(`${c.name}${stale ? ' · нет связи' : ''}`, {
        permanent: true,
        direction: 'top',
        offset: [0, -8],
      })
      layer.addLayer(marker)
    })
    // Подгоняем масштаб под курьеров один раз (чтобы карта не «прыгала» каждые 5с).
    if (points.length && !fittedRef.current) {
      mapRef.current.fitBounds(points, { padding: [40, 40], maxZoom: 15 })
      fittedRef.current = true
    }
  }, [couriers])

  return <div ref={elRef} className="courier-map" />
}
