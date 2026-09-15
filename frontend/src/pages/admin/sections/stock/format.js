// Округление до двух знаков — в остатках копится мусор от float.
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

// 12400 г → «12.4 кг», 450 г → «450 г». Крупные числа в граммах читать невозможно.
export function amount(qty, unit) {
  if (qty == null || Number.isNaN(Number(qty))) return '—'
  const n = Number(qty)
  if (unit === 'г' && Math.abs(n) >= 1000) return `${round2(n / 1000)} кг`
  if (unit === 'мл' && Math.abs(n) >= 1000) return `${round2(n / 1000)} л`
  return `${round2(n)} ${unit}`
}

// Деньги в сомони.
export const money = (n) => `${round2(n)} c.`

export const UNITS = [
  { value: 'г', label: 'г (граммы)' },
  { value: 'мл', label: 'мл (миллилитры)' },
  { value: 'шт', label: 'шт (штуки)' },
]
