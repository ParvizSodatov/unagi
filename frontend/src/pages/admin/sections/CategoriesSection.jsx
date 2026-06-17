import { useEffect, useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, InputNumber, Popconfirm, App } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { menu } from '../../../api'

export default function CategoriesSection() {
  const { message } = App.useApp()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = создание
  const [form] = Form.useForm()

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
        await menu.createCategory(values)
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
    { title: 'ID', dataIndex: 'id', width: 160 },
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Категории</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить
        </Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={rows} loading={loading} pagination={false} />

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
            name="id"
            label="ID (латиницей, напр. rolls)"
            rules={[{ required: true, message: 'Укажите id' }]}
          >
            <Input disabled={!!editing} placeholder="rolls" />
          </Form.Item>
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
