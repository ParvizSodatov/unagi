import { useEffect, useState } from 'react'
import { Table, Space, App, Alert, DatePicker, Button, Statistic, Row, Col, Card } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { stock } from '../../../../api'
import { amount, money } from './format'

const { RangePicker } = DatePicker

// Сколько продуктов ушло за период по продажам. Это и есть ответ на
// «сколько кг рыбы мы потратили за месяц».
export default function ConsumptionTab() {
  const { message } = App.useApp()
  const [range, setRange] = useState([dayjs().startOf('month'), dayjs()])
  const [data, setData] = useState({ rows: [], untracked: [] })
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!range?.[0] || !range?.[1]) return
    setLoading(true)
    try {
      const res = await stock.getConsumption({
        from: range[0].format('YYYY-MM-DD'),
        to: range[1].format('YYYY-MM-DD'),
      })
      setData(res)
    } catch (err) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totalSum = data.rows.reduce((s, r) => s + (r.sum || 0), 0)
  const withoutPrice = data.rows.filter((r) => r.sold > 0 && !r.price).length

  const columns = [
    { title: 'Продукт', dataIndex: 'name' },
    {
      title: 'Ушло по продажам',
      dataIndex: 'sold',
      width: 170,
      defaultSortOrder: 'descend',
      sorter: (a, b) => a.sold - b.sold,
      render: (v, row) => <b>{amount(v, row.unit)}</b>,
    },
    {
      title: 'Сумма',
      dataIndex: 'sum',
      width: 120,
      sorter: (a, b) => a.sum - b.sum,
      render: (v, row) => (row.price ? money(v) : <span style={{ color: 'var(--faint)' }}>цена не задана</span>),
    },
    { title: 'Приход', dataIndex: 'income', width: 120, render: (v, r) => (v ? amount(v, r.unit) : '—') },
    {
      title: 'Списано',
      dataIndex: 'written_off',
      width: 120,
      render: (v, r) => (v ? amount(v, r.unit) : '—'),
    },
  ]

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <RangePicker
          value={range}
          onChange={setRange}
          format="DD.MM.YYYY"
          allowClear={false}
          presets={[
            { label: 'Текущий месяц', value: [dayjs().startOf('month'), dayjs()] },
            { label: 'Прошлый месяц', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            { label: 'Последние 7 дней', value: [dayjs().subtract(6, 'day'), dayjs()] },
          ]}
        />
        <Button type="primary" icon={<ReloadOutlined />} onClick={load} loading={loading}>
          Посчитать
        </Button>
      </Space>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Продуктов задействовано" value={data.rows.filter((r) => r.sold > 0).length} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic title="Себестоимость расхода" value={totalSum} precision={2} suffix="c." />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small">
            <Statistic
              title="Блюд без техкарты продано"
              value={data.untracked.reduce((s, u) => s + u.qty, 0)}
              valueStyle={data.untracked.length ? { color: '#cf1322' } : undefined}
            />
          </Card>
        </Col>
      </Row>

      {withoutPrice > 0 && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message={`У ${withoutPrice} продуктов не задана цена — их расход считается в количестве, но не в деньгах.`}
        />
      )}

      {data.untracked.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Часть продаж не учтена в расходе"
          description={
            <>
              У этих блюд нет техкарты, поэтому продукты по ним не списались:{' '}
              <b>{data.untracked.map((u) => `${u.name} (${u.qty} шт)`).join(', ')}</b>. Заведите им
              состав во вкладке «Техкарты», иначе ревизия покажет ложную недостачу.
            </>
          }
        />
      )}

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={data.rows}
        loading={loading}
        pagination={false}
        summary={() => (
          <Table.Summary.Row style={{ background: 'var(--paper-warm)', fontWeight: 600 }}>
            <Table.Summary.Cell index={0}>Итого</Table.Summary.Cell>
            <Table.Summary.Cell index={1} />
            <Table.Summary.Cell index={2}>{money(totalSum)}</Table.Summary.Cell>
            <Table.Summary.Cell index={3} />
            <Table.Summary.Cell index={4} />
          </Table.Summary.Row>
        )}
      />
    </>
  )
}
