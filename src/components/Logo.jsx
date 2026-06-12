import { Link } from 'react-router-dom'

// Логотип Унаги: оранжевый скруглённый квадрат с роллом + надпись
export default function Logo({ light = false }) {
  return (
    <Link to="/" className={`logo${light ? ' logo--light' : ''}`}>
      <span className="logo__icon">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M5 8c4-2 10-2 14 0M5 12c4-2 10-2 14 0M5 16c4-2 10-2 14 0"
            stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="logo__word">unagi</span>
    </Link>
  )
}
