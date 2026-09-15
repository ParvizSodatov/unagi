import { useEffect, useMemo, useState } from 'react'
import {
  Table, Button, Space, Modal, Input, InputNumber, Select,
  Tag, App, Alert, Empty,
} from 'antd'
import { EditOutlined, SearchOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { stock } from '../../../../api'
import { useConfirm } from '../../../../components/ConfirmDialog.jsx'
import { money } from './format'

// Техкарта — основа всего расчёта: без неё продажи блюда не тратят продукты.
export default function RecipesTab({ onChanged }) {
  const { message } = App.useApp()
  const { confirmDelete } = useConfirm()
  const [dishes, setDishes] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [onlyEmpty, setOnlyEmpty] = useState(false)

  const [editing, setEditing] = useState(null) // блюдо
  const [rows, setRows] = useState([]) // [{ product_id, qty }]
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [r, p] = await Promise.all([stock.getRecipes(), stock.getProducts()])
      setDishes(r)
      setProducts(p.products)
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
    return dishes.filter(
      (d) => (!q || d.name.toLowerCase().includes(q)) && (!onlyEmpty || d.items === 0),
    )
  }, [dishes, search, onlyEmpty])

  const emptyCount = dishes.filter((d) => d.items === 0).length

  async function openEdit(dish) {
    try {
      const data = await stock.getRecipe(dish.id)
      setRows(data.items.map((i) => ({ product_id: i.product_id, qty: i.qty })))
      // items — сколько позиций сохранено сейчас: по нему решаем, есть ли что удалять.
      setEditing({ ...data.dish, items: data.items.length })
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleSave() {
    const clean = rows.filter((r) => r.product_id && r.qty > 0)
    setSaving(true)
    try {
      await stock.saveRecipe(editing.id, clean)
      message.success('Техкарта сохранена')
      setEditing(null)
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Удаляем только состав. Само блюдо остаётся в меню и продаётся дальше —
  // просто его продажи перестают списывать продукты со склада.
  async function handleDelete(dishId) {
    try {
      await stock.deleteRecipe(dishId)
      message.success('Техкарта удалена')
      if (editing?.id === dishId) setEditing(null)
      load()
      onChanged?.()
    } catch (err) {
      message.error(err.message)
    }
  }

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  )

  // Себестоимость прямо в модалке, чтобы было видно, что получается.
  const draftCost = rows.reduce((sum, r) => {
    const p = productById[r.product_id]
    return sum + (p ? (r.qty || 0) * p.price : 0)
  }, 0)

  const columns = [
    { title: 'Блюдо', dataIndex: 'name' },
    {
      title: 'Позиций',
      dataIndex: 'items',
      width: 110,
      sorter: (a, b) => a.items - b.items,
      render: (n) => (n === 0 ? <Tag color="red">нет карты</Tag> : n),
    },
    {
      title: 'Себестоимость',
      dataIndex: 'cost',
      width: 140,
      sorter: (a, b) => a.cost - b.cost,
      render: (v) => (v > 0 ? money(v) : <span style={{ color: 'var(--faint)' }}>—</span>),
    },
    { title: 'Цена', dataIndex: 'price', width: 90, render: (v) => money(v) },
    {
      title: 'Food cost',
      dataIndex: 'food_cost',
      width: 110,
      sorter: (a, b) => (a.food_cost ?? 0) - (b.food_cost ?? 0),
      render: (v, row) =>
        row.cost > 0 && v != null ? (
          <Tag color={v > 40 ? 'red' : v > 30 ? 'orange' : 'green'}>{v}%</Tag>
        ) : (
          <span style={{ color: 'var(--faint)' }}>—</span>
        ),
    },
    {
      title: '',
      width: 100,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            disabled={row.items === 0}
            title={row.items === 0 ? 'Техкарты нет' : 'Удалить техкарту'}
            onClick={() => confirmDelete({
              title: 'Удалить техкарту?',
              description: 'Блюдо останется в меню, но его продажи перестанут списывать продукты со склада.',
              name: row.name,
              onConfirm: () => handleDelete(row.id),
            })}
          />
        </Space>
      ),
    },
  ]

  return (
    <>
      {emptyCount > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Без техкарты: ${emptyCount} блюд`}
          description="Продажи этих блюд не списывают продукты — в расходе и ревизии их не будет видно. Обычно это сеты: у них в описании общий вес, а не ингредиенты."
          action={
            <Button size="small" onClick={() => setOnlyEmpty((v) => !v)}>
              {onlyEmpty ? 'Показать все' : 'Показать их'}
            </Button>
          }
        />
      )}

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ color: 'var(--muted)' }}>
          Food cost — доля себестоимости в цене. Считается только если у продуктов заданы цены.
        </span>
        <Input
          allowClear
          placeholder="Поиск по блюду"
          prefix={<SearchOutlined style={{ color: 'var(--faint)' }} />}
          style={{ width: 220 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
        title={`Техкарта: ${editing?.name || ''}`}
        open={!!editing}
        onOk={handleSave}
        confirmLoading={saving}
        onCancel={() => setEditing(null)}
        okText="Сохранить"
        cancelText="Отмена"
        width={640}
        destroyOnHidden
      >
        {editing?.composition && (
          <Alert
            type="info"
            style={{ marginBottom: 12 }}
            message={<span style={{ fontSize: 13 }}>Состав из карточки: {editing.composition}</span>}
          />
        )}

        {rows.length === 0 && <Empty description="Пока пусто" style={{ margin: '16px 0' }} />}

        {rows.map((row, i) => (
          <Space key={i} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Select
              style={{ width: 340 }}
              placeholder="Продукт"
              showSearch
              optionFilterProp="label"
              value={row.product_id}
              onChange={(v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, product_id: v } : r)))}
              options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.unit})` }))}
            />
            <InputNumber
              style={{ width: 120 }}
              min={0}
              step={1}
              placeholder="Кол-во"
              addonAfter={productById[row.product_id]?.unit || ''}
              value={row.qty}
              onChange={(v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, qty: v } : r)))}
            />
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
            />
          </Space>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Button
            block
            icon={<PlusOutlined />}
            onClick={() => setRows((rs) => [...rs, { product_id: null, qty: null }])}
          >
            Добавить продукт
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            disabled={!editing?.items}
            onClick={() => confirmDelete({
              title: 'Удалить техкарту?',
              description: 'Блюдо останется в меню, но его продажи перестанут списывать продукты со склада.',
              name: editing?.name,
              onConfirm: () => handleDelete(editing.id),
            })}
          >
            Удалить карту
          </Button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)', textAlign: 'right' }}>
          Себестоимость порции: <b>{money(draftCost)}</b>
          {editing?.price > 0 && (
            <span style={{ color: 'var(--muted)' }}>
              {' '}
              из {money(editing.price)} — food cost{' '}
              <b>{Math.round((draftCost / editing.price) * 100)}%</b>
            </span>
          )}
        </div>
      </Modal>
    </>
  )
}
