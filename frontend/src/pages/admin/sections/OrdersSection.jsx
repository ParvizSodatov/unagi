import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Space, Modal, Select, Tag, Descriptions, Input, App } from 'antd'
import { ReloadOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons'
import { orders as ordersApi } from '../../../api'

const STATUS = {
  new: { label: 'Новый', color: 'blue' },
  accepted: { label: 'Принят', color: 'cyan' },
  delivering: { label: 'Доставка', color: 'orange' },
  done: { label: 'Выполнен', color: 'green' },
  canceled: { label: 'Отменён', color: 'red' },
}
const STATUS_OPTIONS = Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label }))

export default function OrdersSection() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState(null)
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null) // открытый заказ

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    const qDigits = q.replace(/\D/g, '')
    return rows.filter((r) => {
      if ((r.customer || '').toLowerCase().includes(q)) return true
      const phone = r.phone || ''
      if (phone.toLowerCase().includes(q)) return true
      return qDigits && phone.replace(/\D/g, '').includes(qDigits)
    })
  }, [rows, search])

  async function load() {
    setLoading(true)
    try {
      setRows(await ordersApi.listOrders(filter || undefined))
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function openDetail(id) {
    try {
      setDetail(await ordersApi.getOrder(id))
    } catch (err) {
      message.error(err.message)
    }
  }

  async function changeStatus(id, status) {
    try {
      await ordersApi.updateOrderStatus(id, status)
      message.success('Статус обновлён')
      load()
      if (detail?.id === id) setDetail({ ...detail, status })
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    { title: '№', dataIndex: 'id', width: 60 },
    { title: 'Клиент', dataIndex: 'customer' },
    { title: 'Телефон', dataIndex: 'phone', width: 150 },
    { title: 'Сумма', dataIndex: 'total', width: 100, render: (t) => `${t} c.` },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 170,
      render: (status, row) => (
        <Select
          size="small"
          value={status}
          style={{ width: 140 }}
          options={STATUS_OPTIONS}
          onChange={(v) => changeStatus(row.id, v)}
        />
      ),
    },
    {
      title: 'Создан',
      dataIndex: 'created_at',
      width: 170,
      render: (d) => (d ? new Date(d).toLocaleString('ru-RU') : '—'),
    },
    {
      title: '',
      width: 50,
      render: (_, row) => <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row.id)} />,
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Заказы</h2>
        <Space>
          <Input
            allowClear
            placeholder="Поиск: клиент или телефон"
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            allowClear
            placeholder="Все статусы"
            style={{ width: 160 }}
            value={filter}
            options={STATUS_OPTIONS}
            onChange={setFilter}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>
            Обновить
          </Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={detail ? `Заказ №${detail.id}` : ''}
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={null}
        width={560}
      >
        {detail && (
          <>
            <Descriptions column={1} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Клиент">{detail.customer}</Descriptions.Item>
              <Descriptions.Item label="Телефон">{detail.phone}</Descriptions.Item>
              <Descriptions.Item label="Адрес">{detail.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Комментарий">{detail.comment || '—'}</Descriptions.Item>
              <Descriptions.Item label="Статус">
                <Tag color={STATUS[detail.status]?.color}>{STATUS[detail.status]?.label || detail.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={detail.items || []}
              columns={[
                { title: 'Блюдо', dataIndex: 'name' },
                { title: 'Цена', dataIndex: 'price', width: 80, render: (p) => `${p} c.` },
                { title: 'Кол-во', dataIndex: 'qty', width: 70 },
                {
                  title: 'Сумма',
                  width: 90,
                  render: (_, it) => `${it.price * it.qty} c.`,
                },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <b>Итого</b>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <b>{detail.total} c.</b>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </>
        )}
      </Modal>
    </>
  )
}
