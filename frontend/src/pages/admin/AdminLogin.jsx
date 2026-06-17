import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Form, Input, Button, App } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import Logo from '../../components/Logo'
import { auth } from '../../api'

// Форма входа в админку. При успехе вызывает onSuccess(user).
export default function AdminLogin({ onSuccess }) {
  const { message } = App.useApp()
  const [loading, setLoading] = useState(false)

  async function handleSubmit({ login, password }) {
    setLoading(true)
    try {
      const user = await auth.login(login, password)
      message.success(`Добро пожаловать, ${user.login}!`)
      onSuccess(user)
    } catch (err) {
      message.error(err.message || 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  // Рендерим через портал в body, чтобы выйти из зажимающих обёрток antd
  // и занять весь экран (position: fixed работает относительно вьюпорта).
  return createPortal(
    <div className="admin-login">
      <div
        className="admin-login__photo"
        style={{ backgroundImage: 'url(/img/dish3.jpg)' }}
      >
        <Logo light />
        <div className="admin-login__slogan">
          <h2>Панель управления «Унаги»</h2>
          <p>Управляйте меню, категориями и заказами суши-бара в одном месте.</p>
        </div>
      </div>

      <div className="admin-login__form">
        <div style={{ width: 360, maxWidth: '100%' }}>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Вход в админку</h1>
          <p style={{ color: '#888', marginBottom: 28 }}>
            Введите данные, чтобы продолжить
          </p>
          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false} size="large">
            <Form.Item
              name="login"
              label="Логин"
              rules={[{ required: true, message: 'Введите логин' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="admin" autoComplete="username" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} size="large">
              Войти
            </Button>
          </Form>
        </div>
      </div>
    </div>,
    document.body,
  )
}
