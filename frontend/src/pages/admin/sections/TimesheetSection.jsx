import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, InputNumber, Input, DatePicker,
  Popconfirm, Tag, App, List, Empty,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ClockCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { staff } from '../../../api'

const ROLES = {
  cook: { label: 'Повар', color: 'volcano' },
  courier: { label: 'Курьер', color: 'blue' },
  operator: { label: 'Оператор', color: 'geekblue' },
  waiter: { label: 'Официант', color: 'green' },
  manager: { label: 'Менеджер', color: 'purple' },
  cleaner: { label: 'Уборщик', color: 'default' },
}
const roleInfo = (v) => ROLES[v] || { label: v, color: 'default' }

export default function TimesheetSection() {
  const { message } = App.useApp()
  const [month, setMonth] = useState(dayjs())
  const [list, setList] = useState([])
  const [summary, setSummary] = useState({}) // staff_id → { days, total_hours }
  const [loading, setLoading] = useState(false)

  // Модалка смен сотрудника
  const [open, setOpen] = useState(false)
  const [emp, setEmp] = useState(null)
  const [shifts, setShifts] = useState([])
  const [shiftLoading, setShiftLoading] = useState(false)
  const [form] = Form.useForm()

  const monthStr = month.format('YYYY-MM')

  async function load() {
    setLoading(true)
    try {
      const [people, sum] = await Promise.all([
        staff.getStaff(),
        staff.getShiftsSummary(monthStr),
      ])
      setList(people.filter((p) => p.status === 'active'))
      setSummary(
        sum.summary.reduce((acc, r) => ({ ...acc, [r.staff_id]: r }), {}),
      )
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthStr])

  async function openShifts(row) {
    setEmp(row)
    setOpen(true)
    form.resetFields()
    form.setFieldsValue({ date: dayjs(), hours: 8 })
    setShiftLoading(true)
    try {
      setShifts(await staff.getShifts(row.id, monthStr))
    } catch (err) {
      message.error(err.message)
    } finally {
      setShiftLoading(false)
    }
  }

  async function reloadShifts() {
    setShifts(await staff.getShifts(emp.id, monthStr))
    load() // обновить итоги в таблице
  }

  async function handleAdd() {
    const values = await form.validateFields()
    try {
      await staff.addShift(emp.id, {
        date: values.date.format('YYYY-MM-DD'),
        hours: values.hours,
        note: values.note || null,
      })
      message.success('Смена добавлена')
      form.setFieldsValue({ note: '' })
      await reloadShifts()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(sid) {
    try {
      await staff.deleteShift(emp.id, sid)
      await reloadShifts()
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
    {
      title: 'Смен',
      width: 100,
      align: 'right',
      render: (_, row) => summary[row.id]?.days || 0,
    },
    {
      title: 'Часов за месяц',
      width: 150,
      align: 'right',
      render: (_, row) => `${summary[row.id]?.total_hours || 0} ч`,
    },
    {
      title: 'Действия',
      width: 120,
      render: (_, row) => (
        <Button size="small" icon={<ClockCircleOutlined />} onClick={() => openShifts(row)}>
          Смены
        </Button>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Табель</h2>
        <DatePicker picker="month" value={month} onChange={(m) => m && setMonth(m)} format="MMMM YYYY" allowClear={false} />
      </div>

      <Table rowKey="id" columns={columns} dataSource={list} loading={loading} pagination={false} />

      <Modal
        title={emp ? `Смены · ${emp.name} · ${month.format('MMMM YYYY')}` : 'Смены'}
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
          <Form.Item name="date" rules={[{ required: true, message: 'Дата' }]}>
            <DatePicker format="DD.MM.YYYY" placeholder="Дата" />
          </Form.Item>
          <Form.Item name="hours" rules={[{ required: true, message: 'Часы' }]}>
            <InputNumber min={0} max={24} step={0.5} addonAfter="ч" placeholder="Часы" style={{ width: 120 }} />
          </Form.Item>
          <Form.Item name="note" style={{ flex: 1, minWidth: 120 }}>
            <Input placeholder="Заметка" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <List
          size="small"
          loading={shiftLoading}
          dataSource={shifts}
          locale={{ emptyText: <Empty description="Смен за месяц нет" /> }}
          renderItem={(s) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title="Удалить смену?"
                  okText="Да"
                  cancelText="Нет"
                  onConfirm={() => handleDelete(s.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={`${dayjs(s.date).format('DD.MM.YYYY')} · ${s.hours} ч`}
                description={s.note ? <span style={{ color: '#888' }}>{s.note}</span> : null}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  )
}
