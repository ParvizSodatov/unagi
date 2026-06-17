import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Spin, App, Empty } from 'antd'
import {
  ShoppingOutlined, DollarOutlined, TeamOutlined, BellOutlined,
} from '@ant-design/icons'
import { stats } from '../../../api'

const money = (n) => `${Number(n || 0).toLocaleString('ru-RU')} c.`

const STATUS_LABELS = {
  new: { label: 'Новые', color: 'red' },
  accepted: { label: 'Приняты', color: 'orange' },
  delivering: { label: 'Доставка', color: 'blue' },
  done: { label: 'Выполнены', color: 'green' },
  canceled: { label: 'Отменены', color: 'default' },
}

export default function DashboardSection() {
  const { message } = App.useApp()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    stats
      .getDashboard()
      .then(setData)
      .catch((err) => message.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    )
  }
  if (!data) return <Empty description="Нет данных" />

  const { orders, revenue, topDishes, staff } = data

  const topColumns = [
    { title: 'Блюдо', dataIndex: 'name' },
    { title: 'Продано', dataIndex: 'qty', width: 100, align: 'right' },
    { title: 'Сумма', dataIndex: 'sum', width: 130, align: 'right', render: money },
  ]

  return (
    <>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Дашборд</h2>

      {/* Выручка */}
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Выручка сегодня"
              value={revenue.today}
              suffix="c."
              prefix={<DollarOutlined style={{ color: '#F15A24' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Выручка за неделю" value={revenue.week} suffix="c." />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Средний чек" value={revenue.avgCheck} suffix="c." />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Выручка всего" value={revenue.total} suffix="c." />
          </Card>
        </Col>
      </Row>

      {/* Заказы и персонал */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Заказов сегодня"
              value={orders.today}
              prefix={<ShoppingOutlined style={{ color: '#F15A24' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Новые (ждут обработки)"
              value={orders.new}
              prefix={<BellOutlined style={{ color: '#cf1322' }} />}
              valueStyle={orders.new ? { color: '#cf1322' } : undefined}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Сотрудников"
              value={staff.active}
              prefix={<TeamOutlined style={{ color: '#F15A24' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic title="Фонд зарплат/мес" value={staff.payrollFund} suffix="c." />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Топ блюд */}
        <Col xs={24} lg={14}>
          <Card title="Топ блюд" size="small">
            <Table
              rowKey="name"
              size="small"
              columns={topColumns}
              dataSource={topDishes}
              pagination={false}
              locale={{ emptyText: <Empty description="Пока нет продаж" /> }}
            />
          </Card>
        </Col>

        {/* Заказы по статусам + зарплата за месяц */}
        <Col xs={24} lg={10}>
          <Card title="Заказы по статусам" size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[8, 8]}>
              {Object.entries(STATUS_LABELS).map(([key, s]) => (
                <Col span={12} key={key}>
                  <Tag color={s.color} style={{ width: '100%', textAlign: 'center', padding: '4px 0' }}>
                    {s.label}: {orders.byStatus?.[key] || 0}
                  </Tag>
                </Col>
              ))}
            </Row>
          </Card>
          <Card title="Зарплата за месяц" size="small">
            <Row gutter={8} style={{ textAlign: 'center' }}>
              <Col span={8}>
                <Statistic title="Выплачено" value={staff.paidMonth} suffix="c." />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Премии"
                  value={staff.bonusesMonth}
                  suffix="c."
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Штрафы"
                  value={staff.finesMonth}
                  suffix="c."
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </>
  )
}
