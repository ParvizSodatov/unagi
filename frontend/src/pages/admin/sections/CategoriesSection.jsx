import { useEffect, useMemo, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Popconfirm, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons'
import { menu } from '../../../api'

// Транслитерация названия в латинский слаг: «Жареные роллы» → «zharenye-rolly»
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(label) {
  const slug = label
    .toLowerCase()
    .split('')
    .map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || `cat-${Date.now()}`
}

export default function CategoriesSection() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = создание
  const [search, setSearch] = useState('')
  const [form] = Form.useForm()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => (r.label || '').toLowerCase().includes(q))
  }, [rows, search])

  async function load() {
    setLoading(true)
    try {
      setRows(await menu.getCategories())
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
    form.setFieldsValue({ sort: 0 })
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    form.setFieldsValue(row)
    setModalOpen(true)
  }

  async function handleOk() {
    const values = await form.validateFields()
    try {
      if (editing) {
        await menu.updateCategory(editing.id, { label: values.label, sort: values.sort })
        message.success('Категория обновлена')
      } else {
        await menu.createCategory({ ...values, id: slugify(values.label) })
        message.success('Категория добавлена')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await menu.deleteCategory(id)
      message.success('Категория удалена')
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    { title: 'Название', dataIndex: 'label' },
    { title: 'Сортировка', dataIndex: 'sort', width: 120 },
    {
      title: 'Действия',
      width: 160,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Удалить категорию?"
            okText="Да"
            cancelText="Нет"
            onConfirm={() => handleDelete(row.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Категории</h2>
        <Space>
          <Input
            allowClear
            placeholder="Поиск по названию"
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Добавить
          </Button>
        </Space>
      </div>

      <Table rowKey="id" columns={columns} dataSource={filtered} loading={loading} pagination={false} />

      <Modal
        title={editing ? 'Редактировать категорию' : 'Новая категория'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="label"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="Роллы" />
          </Form.Item>
          <Form.Item name="sort" label="Сортировка">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
