import { useEffect, useState } from 'react'
import { ConfigProvider, App as AntApp, Layout, Menu, Button, Spin } from 'antd'
import {
  DashboardOutlined, ShoppingOutlined, AppstoreOutlined, TagsOutlined,
  TeamOutlined, ClockCircleOutlined, LogoutOutlined, CarOutlined, EnvironmentOutlined,
} from '@ant-design/icons'
import { auth } from '../api'
import AdminLogin from './admin/AdminLogin'
import DashboardSection from './admin/sections/DashboardSection'
import OrdersSection from './admin/sections/OrdersSection'
import DishesSection from './admin/sections/DishesSection'
import CategoriesSection from './admin/sections/CategoriesSection'
import StaffSection from './admin/sections/StaffSection'
import TimesheetSection from './admin/sections/TimesheetSection'
import DeliverySection from './admin/sections/DeliverySection'
import CouriersSection from './admin/sections/CouriersSection'

const { Sider, Content, Header } = Layout

const MENU_ITEMS = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Дашборд' },
  { key: 'orders', icon: <ShoppingOutlined />, label: 'Заказы' },
  { key: 'dishes', icon: <AppstoreOutlined />, label: 'Блюда' },
  { key: 'categories', icon: <TagsOutlined />, label: 'Категории' },
  { key: 'delivery', icon: <CarOutlined />, label: 'Доставка' },
  { key: 'couriers', icon: <EnvironmentOutlined />, label: 'Курьеры' },
  { key: 'staff', icon: <TeamOutlined />, label: 'Сотрудники' },
  { key: 'timesheet', icon: <ClockCircleOutlined />, label: 'Табель' },
]

const SECTIONS = {
  dashboard: DashboardSection,
  orders: OrdersSection,
  dishes: DishesSection,
  categories: CategoriesSection,
  delivery: DeliverySection,
  couriers: CouriersSection,
  staff: StaffSection,
  timesheet: TimesheetSection,
}

function AdminRoot() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [section, setSection] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)

  // При загрузке проверяем сохранённый токен.
  useEffect(() => {
    if (!auth.isLoggedIn()) {
      setChecking(false)
      return
    }
    auth
      .me()
      .then((data) => setUser(data.user))
      .catch(() => auth.logout())
      .finally(() => setChecking(false))
  }, [])

  function handleLogout() {
    auth.logout()
    setUser(null)
  }

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!user) return <AdminLogin onSuccess={setUser} />

  const Section = SECTIONS[section]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={260}
        style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'auto' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 11,
            padding: collapsed ? '16px 8px' : '16px 20px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: '#F15A24',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 22, height: 22 }}>
              <path
                d="M5 8c4-2 10-2 14 0M5 12c4-2 10-2 14 0M5 16c4-2 10-2 14 0"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </span>
          {!collapsed && (
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>
              Унаги · админ
            </span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[section]}
          items={MENU_ITEMS}
          onClick={(e) => setSection(e.key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <span style={{ marginRight: 16, color: '#555' }}>👤 {user.login}</span>
          <Button icon={<LogoutOutlined />} onClick={handleLogout}>
            Выйти
          </Button>
        </Header>
        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8 }}>
            <Section />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function AdminPage() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#F15A24' } }}>
      <AntApp>
        <AdminRoot />
      </AntApp>
    </ConfigProvider>
  )
}
