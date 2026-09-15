import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, InputNumber, Select, Input,
  Tag, App, Radio, DatePicker,
} from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { stock } from '../../../../api'
import { useConfirm } from '../../../../components/ConfirmDialog.jsx'
import { amount, money } from './format'

// Приход (закупки) и списания (брак, порча, питание персонала).
// Продажи сюда не попадают — они считаются из заказов по техкартам.
export default function MovesTab({ onChanged }) {
  const { message } = App.useApp()
  const { confirmDelete } = useConfirm()
  const [moves, setMoves] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      const [m, p] = await Promise.all([
        stock.getMoves(filter ? { type: filter } : {}),
        stock.getProducts(),
      ])
      setMoves(m)
      setProducts(p.products)
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter])

  function openCreate(type) {
    form.resetFields()
    form.setFieldsValue({ type, created_at: dayjs() })
    setModalOpen(true)
  }

  async function handleOk() {
    const values = await form.validateFields()
    try {
      await stock.createMove({
        ...values,
        created_at: values.created_at
          ? values.created_at.format('YYYY-MM-DD HH:mm:ss')
          : undefined,
      })
      message.success(values.type === 'in' ? 'Приход записан' : 'Списание записано')
      setModalOpen(false)
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await stock.deleteMove(id)
      message.success('Движение удалено')
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'created_at',
      width: 140,
      render: (v) => dayjs(v).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      width: 110,
      render: (t) => (t === 'in' ? <Tag color="green">приход</Tag> : <Tag color="orange">списание</Tag>),
    },
    { title: 'Продукт', dataIndex: 'product_name' },
    {
      title: 'Количество',
      dataIndex: 'qty',
      width: 130,
      render: (v, row) => (
        <span style={{ fontWeight: 600, color: row.type === 'in' ? '#389e0d' : '#d46b08' }}>
          {row.type === 'in' ? '+' : '−'}
          {amount(v, row.unit)}
        </span>
      ),
    },
    {
      title: 'Цена за ед.',
      dataIndex: 'price',
      width: 120,
      render: (v, row) => (v ? `${v} c./${row.unit}` : '—'),
    },
    {
      title: 'Сумма',
      width: 110,
      render: (_, row) => (row.price ? money(row.price * row.qty) : '—'),
    },
    { title: 'Комментарий', dataIndex: 'comment', render: (v) => v || <span style={{ color: 'var(--faint)' }}>—</span> },
    {
      title: '',
      width: 50,
      render: (_, row) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => confirmDelete({
            title: 'Удалить движение?',
            description: 'Остаток продукта пересчитается без этой операции.',
            name: row.product_name,
            onConfirm: () => handleDelete(row.id),
          })}
        />
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Radio.Group value={filter} onChange={(e) => setFilter(e.target.value)}>
          <Radio.Button value="">Все</Radio.Button>
          <Radio.Button value="in">Приход</Radio.Button>
          <Radio.Button value="out">Списания</Radio.Button>
        </Radio.Group>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openCreate('in')}>
            Приход
          </Button>
          <Button danger icon={<PlusOutlined />} onClick={() => openCreate('out')}>
            Списание
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={moves}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />

      <Modal
        title="Движение по складу"
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Записать"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="type" label="Тип" rules={[{ required: true }]}>
            <Radio.Group>
              <Radio.Button value="in">Приход (закупка)</Radio.Button>
              <Radio.Button value="out">Списание (брак, порча)</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="product_id" label="Продукт" rules={[{ required: true, message: 'Выберите продукт' }]}>
            <Select
              placeholder="Выберите продукт"
              showSearch
              optionFilterProp="label"
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
            />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prev, cur) => prev.product_id !== cur.product_id}
          >
            {({ getFieldValue }) => {
              const p = products.find((x) => x.id === getFieldValue('product_id'))
              const unit = p?.unit || ''
              return (
                <Form.Item
                  name="qty"
                  label="Количество"
                  tooltip={unit === 'г' ? 'В граммах. 5 кг — это 5000.' : undefined}
                  rules={[{ required: true, message: 'Укажите количество' }]}
                >
                  <InputNumber min={0.01} step={1} style={{ width: '100%' }} addonAfter={unit} />
                </Form.Item>
              )
            }}
          </Form.Item>
          <Form.Item name="price" label="Цена за единицу (c.)" tooltip="Необязательно. Нужна, чтобы считать сумму склада.">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="created_at" label="Дата">
            <DatePicker showTime style={{ width: '100%' }} format="DD.MM.YYYY HH:mm" />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={2} placeholder="Поставка от Рыбторг / списан по сроку" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
