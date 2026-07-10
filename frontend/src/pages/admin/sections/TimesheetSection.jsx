import { useEffect, useMemo, useState } from 'react'
import {
  Table, Button, Modal, Form, InputNumber, Input, DatePicker,
  Popconfirm, Tag, App, List, Empty, Segmented, Calendar, Select,
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, ClockCircleOutlined,
  UnorderedListOutlined, CalendarOutlined,
} from '@ant-design/icons'
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
  const [view, setView] = useState('list') // 'list' | 'calendar'
  const [month, setMonth] = useState(dayjs())
  const [list, setList] = useState([]) // активные сотрудники
  const [summary, setSummary] = useState({}) // staff_id → { days, total_hours }
  const [monthShifts, setMonthShifts] = useState([]) // все смены месяца (для календаря)
  const [loading, setLoading] = useState(false)

  // Модалка смен сотрудника (режим «Список»)
  const [open, setOpen] = useState(false)
  const [emp, setEmp] = useState(null)
  const [shifts, setShifts] = useState([])
  const [shiftLoading, setShiftLoading] = useState(false)
  const [form] = Form.useForm()

  // Модалка дня (режим «Календарь»)
  const [dayOpen, setDayOpen] = useState(false)
  const [dayDate, setDayDate] = useState(null) // dayjs
  const [dayForm] = Form.useForm()

  const monthStr = month.format('YYYY-MM')

  async function load() {
    setLoading(true)
    try {
      const [people, sum, cal] = await Promise.all([
        staff.getStaff(),
        staff.getShiftsSummary(monthStr),
        staff.getMonthShifts(monthStr),
      ])
      setList(people.filter((p) => p.status === 'active'))
      setSummary(
        sum.summary.reduce((acc, r) => ({ ...acc, [r.staff_id]: r }), {}),
      )
      setMonthShifts(cal.shifts)
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

  // Смены, сгруппированные по дате 'YYYY-MM-DD'
  const byDate = useMemo(() => {
    const m = {}
    for (const s of monthShifts) (m[s.date] ||= []).push(s)
    return m
  }, [monthShifts])

  // ─── Режим «Список» ──────────────────────────────────────────────
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
    load() // обновить итоги в таблице и календарь
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

  // ─── Режим «Календарь» ───────────────────────────────────────────
  function openDay(date) {
    setDayDate(date)
    setDayOpen(true)
    dayForm.resetFields()
    dayForm.setFieldsValue({ hours: 8 })
  }

  async function handleDayAdd() {
    const values = await dayForm.validateFields()
    try {
      await staff.addShift(values.staff_id, {
        date: dayDate.format('YYYY-MM-DD'),
        hours: values.hours,
        note: values.note || null,
      })
      message.success('Смена добавлена')
      dayForm.setFieldsValue({ staff_id: undefined, note: '' })
      await load()
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDayDelete(s) {
    try {
      await staff.deleteShift(s.staff_id, s.id)
      await load()
    } catch (err) {
      message.error(err.message)
    }
  }

  function cellRender(current, info) {
    if (info.type !== 'date') return info.originNode
    const items = byDate[current.format('YYYY-MM-DD')]
    if (!items || !items.length) return null
    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {items.map((s) => (
          <li key={s.id} style={{ marginBottom: 2 }}>
            <Tag
              color={roleInfo(s.staff_role).color}
              style={{ marginInlineEnd: 0, fontSize: 11, maxWidth: '100%' }}
            >
              {s.staff_name} · {s.hours}ч
            </Tag>
          </li>
        ))}
      </ul>
    )
  }

  const dayItems = dayDate ? byDate[dayDate.format('YYYY-MM-DD')] || [] : []

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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>Табель</h2>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { label: 'Список', value: 'list', icon: <UnorderedListOutlined /> },
              { label: 'Календарь', value: 'calendar', icon: <CalendarOutlined /> },
            ]}
          />
          <DatePicker picker="month" value={month} onChange={(m) => m && setMonth(m)} format="MMMM YYYY" allowClear={false} />
        </div>
      </div>

      {view === 'list' ? (
        <Table rowKey="id" columns={columns} dataSource={list} loading={loading} pagination={false} />
      ) : (
        <Calendar
          value={month}
          onPanelChange={(d) => setMonth(d)}
          onSelect={(d, ctx) => {
            if (ctx?.source && ctx.source !== 'date') return
            setMonth(d)
            openDay(d)
          }}
          cellRender={cellRender}
        />
      )}

      {/* Модалка смен сотрудника (режим «Список») */}
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

      {/* Модалка дня (режим «Календарь») */}
      <Modal
        title={dayDate ? `Смены · ${dayDate.format('DD MMMM YYYY')}` : 'Смены'}
        open={dayOpen}
        onCancel={() => setDayOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form form={dayForm} layout="inline" style={{ marginBottom: 16, rowGap: 8 }}>
          <Form.Item name="staff_id" rules={[{ required: true, message: 'Сотрудник' }]}>
            <Select
              placeholder="Сотрудник"
              style={{ width: 170 }}
              options={list.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Form.Item>
          <Form.Item name="hours" rules={[{ required: true, message: 'Часы' }]}>
            <InputNumber min={0} max={24} step={0.5} addonAfter="ч" placeholder="Часы" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="note" style={{ flex: 1, minWidth: 100 }}>
            <Input placeholder="Заметка" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleDayAdd}>
              Добавить
            </Button>
          </Form.Item>
        </Form>

        <List
          size="small"
          dataSource={dayItems}
          locale={{ emptyText: <Empty description="В этот день смен нет" /> }}
          renderItem={(s) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="del"
                  title="Удалить смену?"
                  okText="Да"
                  cancelText="Нет"
                  onConfirm={() => handleDayDelete(s)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                avatar={<Tag color={roleInfo(s.staff_role).color}>{roleInfo(s.staff_role).label}</Tag>}
                title={`${s.staff_name} · ${s.hours} ч`}
                description={s.note ? <span style={{ color: '#888' }}>{s.note}</span> : null}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  )
}
