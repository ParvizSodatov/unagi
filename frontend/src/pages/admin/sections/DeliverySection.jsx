import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Switch, Tag, Popconfirm, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { delivery } from '../../../api'

export default function DeliverySection() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = создание
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      setRows(await delivery.listAllZones())
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ price: 0, min_order: 0, sort: 0, active: true })
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    form.setFieldsValue({ ...row, active: !!row.active })
    setModalOpen(true)
  }

  async function handleOk() {
    const values = await form.validateFields()
    const payload = {
      name: values.name,
      price: values.price ?? 0,
      min_order: values.min_order ?? 0,
      free_from: values.free_from ?? null,
      sort: values.sort ?? 0,
      active: values.active ? 1 : 0,
    }
    try {
      if (editing) {
        await delivery.updateZone(editing.id, payload)
        message.success('Зона обновлена')
      } else {
        await delivery.createZone(payload)
        message.success('Зона добавлена')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await delivery.deleteZone(id)
      message.success('Зона удалена')
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    { title: 'Зона', dataIndex: 'name' },
    { title: 'Стоимость', dataIndex: 'price', width: 120, render: (p) => `${p} c.` },
    { title: 'Мин. заказ', dataIndex: 'min_order', width: 120, render: (m) => `${m} c.` },
    {
      title: 'Бесплатно от',
      dataIndex: 'free_from',
      width: 130,
      render: (f) => (f != null ? `${f} c.` : '—'),
    },
    { title: 'Сорт.', dataIndex: 'sort', width: 80 },
    {
      title: 'Статус',
      dataIndex: 'active',
      width: 110,
      render: (a) => (a ? <Tag color="green">Активна</Tag> : <Tag>Выключена</Tag>),
    },
    {
      title: 'Действия',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Удалить зону?" okText="Да" cancelText="Нет" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Зоны доставки</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить зону
        </Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} />

      <Modal
        title={editing ? 'Редактировать зону' : 'Новая зона'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название зоны" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input placeholder="Центр" />
          </Form.Item>
          <Form.Item name="price" label="Стоимость доставки, c.">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="min_order" label="Минимальный заказ, c.">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="free_from"
            label="Бесплатная доставка от суммы, c. (пусто — нет)"
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="напр. 200" />
          </Form.Item>
          <Form.Item name="sort" label="Порядок в списке">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="active" label="Активна" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
