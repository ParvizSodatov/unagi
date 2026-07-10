// Telegram-интеграция для персонала (кухня/менеджер):
//  1) оповещение о новом заказе с кнопками смены статуса;
//  2) «слушатель» нажатий (long polling), который меняет статус заказа прямо из чата.
// Настраивается через .env: TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID.
// Если токен/чат не заданы — модуль молча ничего не делает.

import db from './db.js'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''
const API = `https://api.telegram.org/bot${TOKEN}`

export const telegramEnabled = Boolean(TOKEN && CHAT_ID)

// Статусы и их подписи (совпадают со списком в routes/orders.js).
const STATUS_LABEL = {
  new: 'Новый',
  accepted: 'Принят ✅',
  delivering: 'На доставку 🛵',
  done: 'Выполнен 🎉',
  canceled: 'Отменён ✖',
}

// Экранируем спецсимволы HTML, чтобы имя/адрес клиента не ломали разметку.
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Клавиатура под сообщением заказа: кнопки меняют статус (callback_data: st:<id>:<status>).
function orderKeyboard(orderId) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Принять', callback_data: `st:${orderId}:accepted` },
        { text: '🛵 Доставка', callback_data: `st:${orderId}:delivering` },
      ],
      [
        { text: '🎉 Выполнен', callback_data: `st:${orderId}:done` },
        { text: '✖ Отменить', callback_data: `st:${orderId}:canceled` },
      ],
    ],
  }
}

// Текст сообщения о новом заказе.
function formatNewOrder(order, items) {
  const lines = items.map((it) => `• ${esc(it.name)} × ${it.qty} — ${it.price * it.qty} с.`)
  const parts = [`🍣 <b>Новый заказ #${order.id}</b>`, '', lines.join('\n'), '']

  // Если была доставка — показываем разбивку (блюда + доставка).
  if (order.deliveryFee != null && order.zoneName) {
    parts.push(`Блюда: ${order.subtotal} с.`)
    parts.push(`🚚 Доставка (${esc(order.zoneName)}): ${order.deliveryFee ? `${order.deliveryFee} с.` : 'бесплатно'}`)
  }

  parts.push(`💰 <b>Итого: ${order.total} с.</b>`, '', `👤 ${esc(order.customer)}`, `☎️ ${esc(order.phone)}`)
  if (order.address) parts.push(`📍 ${esc(order.address)}`)
  if (order.comment) parts.push(`💬 ${esc(order.comment)}`)
  return parts.join('\n')
}

// ─── Низкоуровневые вызовы Telegram API (ошибки логируем, не пробрасываем) ───

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.warn(`[telegram] ${method} → ${res.status}: ${text}`)
  }
  return res
}

// ─── Публичное: оповестить о новом заказе (вызывать без await) ───

export function notifyNewOrder(order, items) {
  if (!telegramEnabled) return
  return tg('sendMessage', {
    chat_id: CHAT_ID,
    text: formatNewOrder(order, items),
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: orderKeyboard(order.id),
  }).catch((err) => console.warn('[telegram] ошибка отправки:', err.message))
}

// ─── «Слушатель» нажатий на кнопки (long polling) ───

// Обрабатываем нажатие: меняем статус в базе, отвечаем и обновляем сообщение.
async function handleCallback(cq) {
  const data = cq.data || ''
  const [, idStr, status] = data.split(':')
  const id = Number(idStr)
  const label = STATUS_LABEL[status]

  if (!id || !label) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id })
    return
  }

  const info = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id)
  if (info.changes === 0) {
    await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'Заказ не найден', show_alert: true })
    return
  }

  // Всплывающее подтверждение тому, кто нажал.
  await tg('answerCallbackQuery', { callback_query_id: cq.id, text: `Статус: ${label}` })

  // Обновляем текст сообщения — дописываем актуальный статус (кнопки оставляем).
  const msg = cq.message
  if (msg) {
    const base = (msg.text || '').split('\n\n📦 Статус')[0]
    await tg('editMessageText', {
      chat_id: msg.chat.id,
      message_id: msg.message_id,
      text: `${base}\n\n📦 Статус: ${label}`,
      reply_markup: orderKeyboard(id),
    })
  }
  console.log(`[telegram] заказ #${id} → ${status}`)
}

// Бесконечный цикл опроса Telegram. Слушаем только нажатия кнопок.
async function pollLoop() {
  let offset = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(`${API}/getUpdates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset, timeout: 25, allowed_updates: ['callback_query'] }),
      })
      const data = await res.json()
      if (data.ok && Array.isArray(data.result)) {
        for (const upd of data.result) {
          offset = upd.update_id + 1
          if (upd.callback_query) await handleCallback(upd.callback_query)
        }
      }
    } catch (err) {
      console.warn('[telegram] опрос прерван, повтор через 3с:', err.message)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
}

// Запустить слушатель кнопок (вызывается один раз при старте сервера).
export function startTelegramBot() {
  if (!telegramEnabled) return
  pollLoop()
  console.log('[telegram] слушатель кнопок запущен')
}
