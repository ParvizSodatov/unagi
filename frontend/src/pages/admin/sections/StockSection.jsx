import { useState } from 'react'
import { Tabs } from 'antd'
import {
  InboxOutlined, ProfileOutlined, SwapOutlined, LineChartOutlined, AuditOutlined,
} from '@ant-design/icons'
import ProductsTab from './stock/ProductsTab'
import RecipesTab from './stock/RecipesTab'
import MovesTab from './stock/MovesTab'
import ConsumptionTab from './stock/ConsumptionTab'
import RevisionTab from './stock/RevisionTab'

export default function StockSection() {
  // Вкладки читают одни и те же остатки, поэтому после любой правки
  // перемонтируем содержимое, чтобы соседние не показывали устаревшее.
  const [version, setVersion] = useState(0)
  const bump = () => setVersion((v) => v + 1)

  const items = [
    {
      key: 'products',
      label: 'Продукты',
      icon: <InboxOutlined />,
      children: <ProductsTab key={version} onChanged={bump} />,
    },
    {
      key: 'recipes',
      label: 'Техкарты',
      icon: <ProfileOutlined />,
      children: <RecipesTab key={version} onChanged={bump} />,
    },
    {
      key: 'moves',
      label: 'Приход и списания',
      icon: <SwapOutlined />,
      children: <MovesTab key={version} onChanged={bump} />,
    },
    {
      key: 'consumption',
      label: 'Расход за период',
      icon: <LineChartOutlined />,
      children: <ConsumptionTab key={version} />,
    },
    {
      key: 'revision',
      label: 'Ревизия',
      icon: <AuditOutlined />,
      children: <RevisionTab key={version} onChanged={bump} />,
    },
  ]

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Склад</h2>
      <Tabs items={items} destroyOnHidden />
    </>
  )
}
