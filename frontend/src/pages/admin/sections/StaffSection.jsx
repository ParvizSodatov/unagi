import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, Select,
  Popconfirm, Tag, App, DatePicker, List, Empty, Tabs, Radio, Statistic, Row, Col,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, WalletOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { staff } from '../../../api'

// Должности: значение в БД → подпись + цвет тега
const ROLES = [
  { value: 'cook', label: 'Повар', color: 'volcano' },
  { value: 'courier', label: 'Курьер', color: 'blue' },
  { value: 'operator', label: 'Оператор', color: 'geekblue' },
  { value: 'waiter', label: 'Официант', color: 'green' },
  { value: 'manager', label: 'Менеджер', color: 'purple' },
  { value: 'cleaner', label: 'Уборщик', color: 'default' },
]
const roleInfo = (v) => ROLES.find((r) => r.value === v) || { label: v, color: 'default' }
const money = (n) => `${Number(n || 0).toLocaleString('ru-RU')} c.`

export default function StaffSection() {
  const { message } = App.useApp()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  // Модалка зарплаты (выплаты + штрафы/премии)
  const [payOpen, setPayOpen] = useState(false)
  const [payEmp, setPayEmp] = useState(null)
  const [payments, setPayments] = useState([])
  const [adjustments, setAdjustments] = useState([])
  const [payLoading, setPayLoading] = useState(false)
  const [payForm] = Form.useForm()
  const [adjForm] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      setList(await staff.getStaff())
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // ─── Сотрудник: создание / редактирование ───
  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 'active', salary: 0 })
    setModalOpen(true)
  }

  function openEdit(row) {
    setEditing(row)
    form.setFieldsValue({
      ...row,
      hired_at: row.hired_at ? dayjs(row.hired_at) : null,
    })
    setModalOpen(true)
  }

  async function handleOk() {
    const values = await form.validateFields()
    const payload = {
      ...values,
      hired_at: values.hired_at ? values.hired_at.format('YYYY-MM-DD') : null,
    }
    try {
      if (editing) {
        await staff.updateStaff(editing.id, payload)
        message.success('Сотрудник обновлён')
      } else {
        await staff.createStaff(payload)
        message.success('Сотрудник добавлен')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await staff.deleteStaff(id)
      message.success('Сотрудник удалён')
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  // ─── Зарплата: выплаты + штрафы/премии ───
  async function reloadPayroll(id) {
    const [pays, adjs] = await Promise.all([
      staff.getPayments(id),
      staff.getAdjustments(id),
    ])
    setPayments(pays)
    setAdjustments(adjs)
  }

  async function openPayments(row) {
    setPayEmp(row)
    setPayOpen(true)
    payForm.resetFields()
    payForm.setFieldsValue({ amount: row.salary, period: dayjs() })
    adjForm.resetFields()
    adjForm.setFieldsValue({ type: 'fine', period: dayjs() })
    setPayLoading(true)
    try {
      await reloadPayroll(row.id)
    } catch (err) {
      message.error(err.message)
    } finally {
      setPayLoading(false)
    }
  }

  async function handleAddPayment() {
    const values = await payForm.validateFields()
    try {
      await staff.addPayment(payEmp.id, {
        amount: values.amount,
        period: values.period ? values.period.format('YYYY-MM') : null,
        comment: values.comment || null,
      })
      message.success('Выплата записана')
      payForm.resetFields()
      payForm.setFieldsValue({ amount: payEmp.salary, period: dayjs() })
      await reloadPayroll(payEmp.id)
      load() // обновить суммы в таблице
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDeletePayment(pid) {
    try {
      await staff.deletePayment(payEmp.id, pid)
      await reloadPayroll(payEmp.id)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleAddAdjustment() {
    const values = await adjForm.validateFields()
    try {
      await staff.addAdjustment(payEmp.id, {
        type: values.type,
        amount: values.amount,
        period: values.period ? values.period.format('YYYY-MM') : null,
        reason: values.reason || null,
      })
      message.success(values.type === 'fine' ? 'Штраф добавлен' : 'Премия добавлена')
      adjForm.resetFields()
      adjForm.setFieldsValue({ type: values.type, period: dayjs() })
      await reloadPayroll(payEmp.id)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDeleteAdjustment(aid) {
    try {
      await staff.deleteAdjustment(payEmp.id, aid)
      await reloadPayroll(payEmp.id)
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  const columns = [
    { title: 'Имя', dataIndex: 'name' },
    {
      title: 'Должность',
      dataIndex: 'role',
      width: 130,
      render: (v) => {
        const r = roleInfo(v)
        return <Tag color={r.color}>{r.label}</Tag>
      },
    },
    { title: 'Телефон', dataIndex: 'phone', width: 150, render: (v) => v || '—' },
    { title: 'Оклад', dataIndex: 'salary', width: 110, render: money },
    {
      title: 'Премии',
      dataIndex: 'bonus_total',
      width: 110,
      render: (v) => (v ? <span style={{ color: '#3f8600' }}>+{money(v)}</span> : '—'),
    },
    {
      title: 'Штрафы',
      dataIndex: 'fine_total',
      width: 110,
      render: (v) => (v ? <span style={{ color: '#cf1322' }}>−{money(v)}</span> : '—'),
    },
    { title: 'Выплачено', dataIndex: 'paid_total', width: 120, render: money },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 110,
      render: (v) =>
        v === 'active' ? <Tag color="green">Работает</Tag> : <Tag>Уволен</Tag>,
    },
    {
      title: 'Действия',
      width: 150,
      render: (_, row) => (
        <Space>
          <Button
            size="small"
            icon={<WalletOutlined />}
            onClick={() => openPayments(row)}
            title="Зарплата"
          />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm
            title="Удалить сотрудника?"
            description="История выплат тоже удалится."
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
        <h2 style={{ margin: 0 }}>Сотрудники</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Добавить
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      {/* Форма сотрудника */}
      <Modal
        title={editing ? 'Редактировать сотрудника' : 'Новый сотрудник'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        okText="Сохранить"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Имя" rules={[{ required: true, message: 'Укажите имя' }]}>
            <Input placeholder="Иван Петров" />
          </Form.Item>
          <Form.Item name="role" label="Должность" rules={[{ required: true, message: 'Выберите должность' }]}>
            <Select
              placeholder="Выберите должность"
              options={ROLES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input placeholder="+992 90 000 00 00" />
          </Form.Item>
          <Form.Item name="salary" label="Оклад в месяц (c.)">
            <InputNumber min={0} step={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="hired_at" label="Дата приёма">
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="status" label="Статус" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'active', label: 'Работает' },
                { value: 'fired', label: 'Уволен' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Заметка">
            <Input.TextArea rows={2} placeholder="График, обязанности и т.п." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Зарплата: сводка + выплаты + штрафы/премии */}
      <Modal
        title={payEmp ? `Зарплата · ${payEmp.name}` : 'Зарплата'}
        open={payOpen}
        onCancel={() => setPayOpen(false)}
        footer={null}
        width={620}
        destroyOnHidden
      >
        {payEmp && (
          <Row gutter={8} style={{ marginBottom: 16, textAlign: 'center' }}>
            <Col span={6}>
              <Statistic title="Оклад/мес" value={payEmp.salary} suffix="c." />
            </Col>
            <Col span={6}>
              <Statistic
                title="Премии"
                value={payEmp.bonus_total || 0}
                suffix="c."
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Штрафы"
                value={payEmp.fine_total || 0}
                suffix="c."
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
            <Col span={6}>
              <Statistic title="Выплачено" value={payEmp.paid_total || 0} suffix="c." />
            </Col>
          </Row>
        )}

        <Tabs
          items={[
            {
              key: 'payments',
              label: 'Выплаты',
              children: (
                <>
                  <Form form={payForm} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
                    <Form.Item name="amount" rules={[{ required: true, message: 'Сумма' }]}>
                      <InputNumber min={1} step={100} placeholder="Сумма" addonAfter="c." style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item name="period">
                      <DatePicker picker="month" placeholder="Месяц" format="MM.YYYY" />
                    </Form.Item>
                    <Form.Item name="comment">
                      <Input placeholder="Комментарий" style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleAddPayment}>
                        Выплатить
                      </Button>
                    </Form.Item>
                  </Form>

                  <List
                    size="small"
                    loading={payLoading}
                    dataSource={payments}
                    locale={{ emptyText: <Empty description="Выплат пока нет" /> }}
                    renderItem={(p) => (
                      <List.Item
                        actions={[
                          <Popconfirm
                            key="del"
                            title="Удалить выплату?"
                            okText="Да"
                            cancelText="Нет"
                            onConfirm={() => handleDeletePayment(p.id)}
                          >
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>,
                        ]}
                      >
                        <List.Item.Meta
                          title={money(p.amount)}
                          description={
                            <span style={{ color: '#888' }}>
                              {p.period ? `за ${p.period}` : ''}
                              {p.comment ? ` · ${p.comment}` : ''}
                              {` · ${dayjs(p.paid_at).format('DD.MM.YYYY')}`}
                            </span>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </>
              ),
            },
            {
              key: 'adjustments',
              label: 'Штрафы и премии',
              children: (
                <>
                  <Form
                    form={adjForm}
                    layout="inline"
                    style={{ marginBottom: 16, rowGap: 8 }}
                    initialValues={{ type: 'fine' }}
                  >
                    <Form.Item name="type" rules={[{ required: true }]}>
                      <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio.Button value="fine">Штраф</Radio.Button>
                        <Radio.Button value="bonus">Премия</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item name="amount" rules={[{ required: true, message: 'Сумма' }]}>
                      <InputNumber min={1} step={50} placeholder="Сумма" addonAfter="c." style={{ width: 150 }} />
                    </Form.Item>
                    <Form.Item name="period">
                      <DatePicker picker="month" placeholder="Месяц" format="MM.YYYY" />
                    </Form.Item>
                    <Form.Item name="reason" style={{ flex: 1, minWidth: 160 }}>
                      <Input placeholder="Причина (опоздание, переработка…)" />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleAddAdjustment}>
                        Добавить
                      </Button>
                    </Form.Item>
                  </Form>

                  <List
                    size="small"
                    loading={payLoading}
                    dataSource={adjustments}
                    locale={{ emptyText: <Empty description="Штрафов и премий пока нет" /> }}
                    renderItem={(a) => {
                      const fine = a.type === 'fine'
                      return (
                        <List.Item
                          actions={[
                            <Popconfirm
                              key="del"
                              title="Удалить запись?"
                              okText="Да"
                              cancelText="Нет"
                              onConfirm={() => handleDeleteAdjustment(a.id)}
                            >
                              <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <span style={{ color: fine ? '#cf1322' : '#3f8600' }}>
                                <Tag color={fine ? 'red' : 'green'}>{fine ? 'Штраф' : 'Премия'}</Tag>
                                {fine ? '−' : '+'}
                                {money(a.amount)}
                              </span>
                            }
                            description={
                              <span style={{ color: '#888' }}>
                                {a.reason || 'без причины'}
                                {a.period ? ` · за ${a.period}` : ''}
                                {` · ${dayjs(a.created_at).format('DD.MM.YYYY')}`}
                              </span>
                            }
                          />
                        </List.Item>
                      )
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Modal>
    </>
  )
}
