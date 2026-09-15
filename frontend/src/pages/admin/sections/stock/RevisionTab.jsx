import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker,
  Tag, App, Alert, Row, Col, Card, Statistic, Empty,
} from 'antd'
import { PlusOutlined, DeleteOutlined, CheckOutlined, ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { stock } from '../../../../api'
import { useConfirm } from '../../../../components/ConfirmDialog.jsx'
import { amount, money, round2 } from './format'

export default function RevisionTab({ onChanged }) {
  const { message } = App.useApp()
  const { confirmDelete } = useConfirm()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form] = Form.useForm()

  async function load() {
    setLoading(true)
    try {
      setList(await stock.getRevisions())
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate() {
    const values = await form.validateFields()
    try {
      const rev = await stock.createRevision({
        to: values.to.format('YYYY-MM-DD'),
        period: values.period || values.to.format('YYYY-MM'),
        comment: values.comment,
      })
      message.success('Черновик ревизии создан')
      setCreateOpen(false)
      load()
      setOpenId(rev.id)
    } catch (err) {
      message.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await stock.deleteRevision(id)
      message.success('Ревизия удалена')
      load()
    } catch (err) {
      message.error(err.message)
    }
  }

  if (openId) {
    return (
      <RevisionDetail
        id={openId}
        onBack={() => {
          setOpenId(null)
          load()
        }}
        onApplied={() => {
          setOpenId(null)
          load()
          onChanged?.()
        }}
      />
    )
  }

  const columns = [
    { title: 'Период', dataIndex: 'period', width: 120 },
    {
      title: 'Считали за',
      width: 240,
      render: (_, r) => (
        <span style={{ color: 'var(--muted)' }}>
          {r.from_at.startsWith('1970') ? 'с самого начала' : dayjs(r.from_at).format('DD.MM.YYYY')}
          {' → '}
          {dayjs(r.to_at).format('DD.MM.YYYY')}
        </span>
      ),
    },
    {
      title: 'Статус',
      width: 150,
      render: (_, r) =>
        r.applied_at ? (
          <Tag color="green">проведена {dayjs(r.applied_at).format('DD.MM.YY')}</Tag>
        ) : (
          <Tag color="orange">черновик</Tag>
        ),
    },
    {
      title: 'Пересчитано',
      width: 130,
      render: (_, r) => `${r.counted || 0} из ${r.items}`,
    },
    { title: 'Комментарий', dataIndex: 'comment', render: (v) => v || <span style={{ color: 'var(--faint)' }}>—</span> },
    {
      title: '',
      width: 120,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => setOpenId(r.id)}>
            Открыть
          </Button>
          {!r.applied_at && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => confirmDelete({
                title: 'Удалить черновик ревизии?',
                description: 'Внесённые в него факты не сохранятся.',
                onConfirm: () => handleDelete(r.id),
              })}
            />
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Как считается"
        description="Ожидаемый остаток = остаток на начало + приход − списания − продажи по техкартам. Вы вписываете фактический остаток, система показывает расхождение. После проведения факт становится новой точкой отсчёта."
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            form.resetFields()
            form.setFieldsValue({ to: dayjs(), period: dayjs().format('YYYY-MM') })
            setCreateOpen(true)
          }}
        >
          Новая ревизия
        </Button>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
        locale={{ emptyText: <Empty description="Ревизий пока не было" /> }}
      />

      <Modal
        title="Новая ревизия"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="Собрать акт"
        cancelText="Отмена"
        destroyOnHidden
      >
        <Alert
          type="info"
          style={{ marginBottom: 16 }}
          message="Период начнётся там, где закончилась прошлая проведённая ревизия — иначе остаток на начало брать неоткуда."
        />
        <Form form={form} layout="vertical">
          <Form.Item name="to" label="Считаем остатки на дату" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="period" label="Метка периода">
            <Input placeholder="2026-09" />
          </Form.Item>
          <Form.Item name="comment" label="Комментарий">
            <Input.TextArea rows={2} placeholder="Ревизия за сентябрь, считали втроём" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// ─── Один акт: таблица «ожидали / факт / расхождение» ───
function RevisionDetail({ id, onBack, onApplied }) {
  const { message } = App.useApp()
  const { confirm } = useConfirm()
  const [rev, setRev] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({}) // product_id → actual

  async function load() {
    setLoading(true)
    try {
      const data = await stock.getRevision(id)
      setRev(data)
      setDraft(Object.fromEntries(data.items.map((i) => [i.product_id, i.actual])))
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    try {
      await stock.saveRevision(id, Object.entries(draft).map(([product_id, actual]) => ({
        product_id: Number(product_id),
        actual,
      })))
      message.success('Факты сохранены')
      load()
    } catch (err) {
      message.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  function handleApply() {
    const notCounted = rev.items.filter((i) => draft[i.product_id] == null).length
    confirm({
      title: 'Провести ревизию?',
      description: notCounted
        ? `У ${notCounted} продуктов факт не вписан — они будут записаны как сошедшиеся с ожидаемым. После проведения акт изменить нельзя.`
        : 'После проведения акт изменить нельзя, а остатки будут считаться от него.',
      okText: 'Провести',
      cancelText: 'Отмена',
      onConfirm: async () => {
        try {
          await stock.saveRevision(id, Object.entries(draft).map(([product_id, actual]) => ({
            product_id: Number(product_id),
            actual,
          })))
          await stock.applyRevision(id)
          message.success('Ревизия проведена')
          onApplied()
        } catch (err) {
          message.error(err.message)
        }
      },
    })
  }

  if (!rev) return <Table loading={loading} dataSource={[]} columns={[]} />

  const readOnly = !!rev.applied_at

  // Расхождения считаем на лету, чтобы цифра менялась прямо при вводе.
  const rows = rev.items.map((i) => {
    const actual = draft[i.product_id]
    const diff = actual == null ? null : round2(actual - i.expected)
    return { ...i, actual, diff, diff_sum: diff == null ? null : round2(diff * i.price) }
  })

  const shortage = rows.filter((r) => r.diff != null && r.diff < 0)
  const surplus = rows.filter((r) => r.diff != null && r.diff > 0)
  const lossSum = shortage.reduce((s, r) => s + Math.abs(r.diff_sum || 0), 0)

  const columns = [
    { title: 'Продукт', dataIndex: 'name' },
    { title: 'На начало', dataIndex: 'opening', width: 110, render: (v, r) => amount(v, r.unit) },
    { title: 'Приход', dataIndex: 'income', width: 100, render: (v, r) => amount(v, r.unit) },
    { title: 'Продажи', dataIndex: 'sold', width: 110, render: (v, r) => amount(v, r.unit) },
    { title: 'Списано', dataIndex: 'written_off', width: 100, render: (v, r) => amount(v, r.unit) },
    {
      title: 'Ожидали',
      dataIndex: 'expected',
      width: 120,
      render: (v, r) => <b>{amount(v, r.unit)}</b>,
    },
    {
      title: 'Факт',
      width: 150,
      render: (_, r) =>
        readOnly ? (
          amount(r.actual, r.unit)
        ) : (
          <InputNumber
            style={{ width: '100%' }}
            placeholder="посчитать"
            addonAfter={r.unit}
            value={r.actual}
            onChange={(v) => setDraft((d) => ({ ...d, [r.product_id]: v }))}
          />
        ),
    },
    {
      title: 'Расхождение',
      dataIndex: 'diff',
      width: 150,
      sorter: (a, b) => (a.diff ?? 0) - (b.diff ?? 0),
      render: (v, r) => {
        if (v == null) return <span style={{ color: 'var(--faint)' }}>—</span>
        if (v === 0) return <Tag color="green">сошлось</Tag>
        const bad = v < 0
        return (
          <span style={{ color: bad ? '#cf1322' : '#d46b08', fontWeight: 600 }}>
            {v > 0 ? '+' : '−'}
            {amount(Math.abs(v), r.unit)}
            {r.price > 0 && <span style={{ color: 'var(--muted)', fontWeight: 400 }}> · {money(Math.abs(r.diff_sum))}</span>}
          </span>
        )
      },
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            К списку
          </Button>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Ревизия {rev.period}</span>
          {readOnly ? <Tag color="green">проведена</Tag> : <Tag color="orange">черновик</Tag>}
        </Space>
        {!readOnly && (
          <Space>
            <Button icon={<SaveOutlined />} onClick={handleSave} loading={saving}>
              Сохранить
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleApply}>
              Провести
            </Button>
          </Space>
        )}
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Позиций" value={rev.items.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Пересчитано" value={rows.filter((r) => r.actual != null).length} suffix={`/ ${rows.length}`} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Недостача" value={shortage.length} valueStyle={shortage.length ? { color: '#cf1322' } : undefined} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Убыток по недостаче" value={lossSum} precision={2} suffix="c." valueStyle={lossSum ? { color: '#cf1322' } : undefined} />
          </Card>
        </Col>
      </Row>

      {surplus.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`Излишек по ${surplus.length} позициям`}
          description="Обычно это значит, что в техкарте вес завышен: списываем больше, чем реально кладём. Стоит сверить состав с кухней."
        />
      )}

      <Table
        rowKey="product_id"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={false}
        scroll={{ x: 1100 }}
      />
    </>
  )
}
