import { useEffect, useRef, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Switch, Tag, Popconfirm, App, Empty } from 'antd'
import { PlusOutlined, DeleteOutlined, LinkOutlined, ReloadOutlined } from '@ant-design/icons'
import { couriers as couriersApi } from '../../../api'
import CourierMap from './CourierMap'

// Ссылка курьера для его телефона.
function courierLink(token) {
  return `${window.location.origin}/courier/${token}`
}

// «сколько назад» из UTC-строки sqlite (datetime('now')).
function agoLabel(lastAt) {
  if (!lastAt) return '—'
  const t = new Date(lastAt.replace(' ', 'T') + 'Z').getTime()
  const sec = Math.round((Date.now() - t) / 1000)
  if (sec < 60) return `${sec} с назад`
  if (sec < 3600) return `${Math.floor(sec / 60)} мин назад`
  return `${Math.floor(sec / 3600)} ч назад`
}

export default function CouriersSection() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()
  const timer = useRef(null)

  async function load() {
    setLoading(true)
    try {
      setRows(await couriersApi.listCouriers())
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLocations() {
    try {
      setLocations(await couriersApi.listLocations())
    } catch {
      /* тихо — карта просто не обновится в этот тик */
    }
  }

  useEffect(() => {
    load()
    loadLocations()
    // Автообновление позиций на карте каждые 5 секунд.
    timer.current = setInterval(loadLocations, 5000)
    return () => clearInterval(timer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate() {
    const values = await form.validateFields()
    try {
      const created = await couriersApi.createCourier(values)
      setModalOpen(false)
      form.resetFields()
      load()
      // Сразу показываем ссылку и предлагаем скопировать.
      Modal.success({
        title: `Курьер «${created.name}» добавлен`,
        content: (
          <div>
            <p>Отправьте ему эту ссылку — он откроет её на телефоне:</p>
            <Input readOnly value={courierLink(created.token)} onFocus={(e) => e.target.select()} />
          </div>
        ),
        okText: 'Готово',
      })
    } catch (err) {
      message.error(err.message)
    }
  }

  async function toggleActive(row, active) {
    try {
      await couriersApi.updateCourier(row.id, { active: active ? 1 : 0 })
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await couriersApi.deleteCourier(id)
      message.success('Курьер удалён')
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  function copyLink(token) {
    navigator.clipboard?.writeText(courierLink(token)).then(
      () => message.success('Ссылка скопирована'),
      () => message.info(courierLink(token)),
    )
  }

  const columns = [
    { title: 'Курьер', dataIndex: 'name' },
    { title: 'Телефон', dataIndex: 'phone', render: (p) => p || '—' },
    {
      title: 'На смене',
      dataIndex: 'active',
      width: 100,
      render: (a, row) => <Switch checked={!!a} onChange={(v) => toggleActive(row, v)} />,
    },
    {
      title: 'Геопозиция',
      width: 150,
      render: (_, row) =>
        row.last_at ? (
          <Tag color={agoLabel(row.last_at).includes('с назад') ? 'green' : 'default'}>{agoLabel(row.last_at)}</Tag>
        ) : (
          <Tag>нет данных</Tag>
        ),
    },
    {
      title: 'Ссылка',
      width: 120,
      render: (_, row) => (
        <Button size="small" icon={<LinkOutlined />} onClick={() => copyLink(row.token)}>
          Копировать
        </Button>
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, row) => (
        <Popconfirm title="Удалить курьера?" okText="Да" cancelText="Нет" onConfirm={() => handleDelete(row.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Курьеры на карте</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadLocations}>
            Обновить карту
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Добавить курьера
          </Button>
        </Space>
      </div>

      {locations.length === 0 && (
        <p style={{ color: '#888', marginTop: -6, marginBottom: 12 }}>
          На карте появятся курьеры, которые вышли на смену со своего телефона.
        </p>
      )}
      <CourierMap couriers={locations} />

      <h3 style={{ margin: '24px 0 12px' }}>Список курьеров</h3>
      {rows.length === 0 && !loading ? (
        <Empty description="Курьеров пока нет — добавьте первого" />
      ) : (
        <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} />
      )}

      <Modal
        title="Новый курьер"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => setModalOpen(false)}
        okText="Создать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Имя курьера" rules={[{ required: true, message: 'Укажите имя' }]}>
            <Input placeholder="Напр. Далер" />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input placeholder="+992 __ ___ __ __" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
