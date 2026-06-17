import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  Switch, Popconfirm, Upload, Image, Tag, App,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import { menu } from '../../../api'
import { imgUrl } from '../../../config'

export default function DishesSection() {
  const { message } = App.useApp()
  const [dishes, setDishes] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [img, setImg] = useState(null) // путь к фото в форме
  const [uploading, setUploading] = useState(false)
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([menu.getDishes(true), menu.getCategories()])
      setDishes(d)
      setCategories(c)
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
    setImg(null)
    form.resetFields()
    form.setFieldsValue({ available: true })
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    setImg(row.img || null)
    form.setFieldsValue({ ...row, available: !!row.available })
    setModalOpen(true)
  }

  async function handleUpload(file) {
    setUploading(true)
    try {
      const { url } = await menu.uploadImage(file)
      setImg(url)
      message.success('Фото загружено')
    } catch (err) {
      message.error(err.message)
    } finally {
      setUploading(false)
    }
    return false // не даём antd грузить самому
  }

  async function handleOk() {
    const values = await form.validateFields()
    const payload = { ...values, img, available: values.available ? 1 : 0 }
    try {
      if (editing) {
        await menu.updateDish(editing.id, payload)
        message.success('Блюдо обновлено')
      } else {
        await menu.createDish(payload)
        message.success('Блюдо добавлено')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await menu.deleteDish(id)
      message.success('Блюдо удалено')
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  const catLabel = (id) => categories.find((c) => c.id === id)?.label || id

  const columns = [
    {
      title: 'Фото',
      dataIndex: 'img',
      width: 80,
      render: (src) =>
        src ? (
          <Image src={imgUrl(src)} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
        ) : (
          '—'
        ),
    },
    { title: 'Название', dataIndex: 'name' },
    { title: 'Категория', dataIndex: 'cat', render: catLabel, width: 130 },
    { title: 'Цена', dataIndex: 'price', width: 90, render: (p) => `${p} c.` },
    {
      title: 'Статус',
      dataIndex: 'available',
      width: 110,
      render: (v) => (v ? <Tag color="green">Активно</Tag> : <Tag>Скрыто</Tag>),
    },
    {
      title: 'Действия',
      width: 120,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Удалить блюдо?"
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
        <h2 style={{ margin: 0 }}>Блюда</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить
        </Button>
      </div>

      <Table rowKey="id" columns={columns} dataSource={dishes} loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title={editing ? 'Редактировать блюдо' : 'Новое блюдо'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input placeholder="Филадельфия" />
          </Form.Item>
          <Form.Item name="cat" label="Категория" rules={[{ required: true, message: 'Выберите категорию' }]}>
            <Select
              placeholder="Выберите категорию"
              options={categories.map((c) => ({ value: c.id, label: c.label }))}
            />
          </Form.Item>
          <Form.Item name="price" label="Цена (c.)" rules={[{ required: true, message: 'Укажите цену' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="desc" label="Описание">
            <Input.TextArea rows={2} placeholder="Лосось, сливочный сыр, огурец" />
          </Form.Item>
          <Form.Item label="Фото">
            <Space align="start">
              {img && (
                <Image src={imgUrl(img)} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
              )}
              <Upload showUploadList={false} accept="image/*" beforeUpload={handleUpload}>
                <Button icon={<UploadOutlined />} loading={uploading}>
                  {img ? 'Заменить' : 'Загрузить'}
                </Button>
              </Upload>
            </Space>
          </Form.Item>
          <Form.Item name="available" label="Показывать в меню" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
