import { useEffect, useMemo, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  Tag, App, Alert, Switch,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, MergeCellsOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { stock } from '../../../../api'
import { useConfirm } from '../../../../components/ConfirmDialog.jsx'
import { amount, money, UNITS } from './format'

export default function ProductsTab({ onChanged }) {
  const { message } = App.useApp()
  const { confirmDelete } = useConfirm()
  const [products, setProducts] = useState([])
  const [since, setSince] = useState(null)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [mergeFrom, setMergeFrom] = useState(null)
  const [mergeInto, setMergeInto] = useState(null)
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      const data = await stock.getProducts()
      setProducts(data.products)
      setSince(data.since)
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const lowCount = products.filter((p) => p.low).length

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ unit: 'г', price: 0, min_stock: 0, active: true })
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    form.setFieldsValue({ ...row, active: !!row.active })
    setModalOpen(true)
  }

  async function handleOk() {
    const values = await form.validateFields()
    try {
      if (editing) await stock.updateProduct(editing.id, { ...values, active: values.active ? 1 : 0 })
      else await stock.createProduct(values)
      message.success(editing ? 'Продукт обновлён' : 'Продукт добавлен')
      setModalOpen(false)
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await stock.deleteProduct(id)
      message.success('Продукт удалён')
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleMerge() {
    try {
      const res = await stock.mergeProduct(mergeFrom.id, mergeInto)
      message.success(`«${res.merged}» влит в «${res.into}»`)
      setMergeFrom(null)
      setMergeInto(null)
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    {
      title: 'Продукт',
      dataIndex: 'name',
      render: (name, row) => (
        <Space>
          <span>{name}</span>
          {!row.active && <Tag>скрыт</Tag>}
          {row.low && <Tag color="red">мало</Tag>}
        </Space>
      ),
    },
    {
      title: 'Остаток',
      dataIndex: 'stock',
      width: 130,
      sorter: (a, b) => a.stock - b.stock,
      render: (v, row) => (
        <span style={{ color: row.low ? '#cf1322' : undefined, fontWeight: row.low ? 600 : undefined }}>
          {amount(v, row.unit)}
        </span>
      ),
    },
    { title: 'Приход', dataIndex: 'income', width: 110, render: (v, r) => amount(v, r.unit) },
    { title: 'Продажи', dataIndex: 'sold', width: 110, render: (v, r) => amount(v, r.unit) },
    { title: 'Списано', dataIndex: 'written_off', width: 110, render: (v, r) => amount(v, r.unit) },
    {
      title: 'Цена за ед.',
      dataIndex: 'price',
      width: 120,
      render: (v, r) => (v ? `${v} c./${r.unit}` : <span style={{ color: 'var(--faint)' }}>не задана</span>),
    },
    {
      title: 'Сумма',
      dataIndex: 'value',
      width: 110,
      sorter: (a, b) => a.value - b.value,
      render: (v) => money(v),
    },
    {
      title: 'Мин.',
      dataIndex: 'min_stock',
      width: 90,
      render: (v, r) => (v > 0 ? amount(v, r.unit) : '—'),
    },
    {
      title: '',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button
            size="small"
            icon={<MergeCellsOutlined />}
            title="Слить с другим продуктом"
            onClick={() => {
              setMergeFrom(row)
              setMergeInto(null)
            }}
          />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => confirmDelete({
              title: 'Удалить продукт?',
              description: 'Продукт пропадёт со склада и из техкарт.',
              name: row.name,
              onConfirm: () => handleDelete(row.id),
            })}
          />
        </Space>
      ),
    },
  ]

  const totalValue = products.reduce((s, p) => s + (p.value || 0), 0)

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={
          since && !since.startsWith('1970')
            ? `Остатки считаются от ревизии за ${dayjs(since).format('DD.MM.YYYY')}: факт ревизии + приход − списания − продажи.`
            : 'Ревизий ещё не было, поэтому остаток на начало у всех продуктов нулевой. Внесите приход или проведите первую ревизию.'
        }
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Space>
          <span style={{ color: 'var(--muted)' }}>
            Продуктов: <b>{products.length}</b> · склад на <b>{money(totalValue)}</b>
            {lowCount > 0 && <span style={{ color: '#cf1322' }}> · заканчивается: {lowCount}</span>}
          </span>
        </Space>
        <Space>
          <Input
            allowClear
            placeholder="Поиск по названию"
            prefix={<SearchOutlined style={{ color: 'var(--faint)' }} />}
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: false }}
      />

      <Modal
        title={editing ? 'Редактировать продукт' : 'Новый продукт'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input placeholder="Лосось" />
          </Form.Item>
          <Form.Item
            name="unit"
            label="Единица измерения"
            tooltip="Базовая единица, в которой ведётся учёт. Килограммы показываются автоматически."
            rules={[{ required: true }]}
          >
            <Select options={UNITS} disabled={!!editing} />
          </Form.Item>
          <Form.Item name="price" label="Себестоимость за единицу (c.)" tooltip="Например, лосось по 120 c./кг — это 0.12 c. за грамм">
            <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="min_stock" label="Минимальный остаток" tooltip="Ниже этого значения продукт подсвечивается красным. 0 — не следить.">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          {editing && (
            <Form.Item name="active" label="Учитывать в ревизии" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={`Слить «${mergeFrom?.name}» в другой продукт`}
        open={!!mergeFrom}
        onOk={handleMerge}
        okButtonProps={{ disabled: !mergeInto }}
        onCancel={() => setMergeFrom(null)}
        okText="Слить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Техкарты и движения переедут на выбранный продукт, а этот удалится. Отменить нельзя."
        />
        <Select
          style={{ width: '100%' }}
          placeholder="Во что сливаем"
          showSearch
          optionFilterProp="label"
          value={mergeInto}
          onChange={setMergeInto}
          options={products
            .filter((p) => p.id !== mergeFrom?.id && p.unit === mergeFrom?.unit)
            .map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
        />
      </Modal>
    </>
  )
}
