import { useState } from 'react'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const TIERS = [2.5, 3, 4]

function computeTiers({ cost, shipping, basetaoFeePercent }) {
  const totalCost = cost + shipping + cost * (basetaoFeePercent / 100)
  return TIERS.map((multiplier) => ({
    multiplier,
    retail: Math.round(totalCost * multiplier * 100) / 100,
    profit: Math.round((totalCost * multiplier - totalCost) * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  }))
}

export default function PricingCalculator() {
  const saved = useSupabaseTable('saved_items', { match: { kind: 'pricing_profile' } })
  const [cost, setCost] = useState('')
  const [shipping, setShipping] = useState('')
  const [basetaoFeePercent, setBasetaoFeePercent] = useState('10')
  const [productName, setProductName] = useState('')

  const parsed = {
    cost: parseFloat(cost) || 0,
    shipping: parseFloat(shipping) || 0,
    basetaoFeePercent: parseFloat(basetaoFeePercent) || 0,
  }
  const hasInput = cost !== '' && !Number.isNaN(parsed.cost)
  const tiers = hasInput ? computeTiers(parsed) : []

  async function handleSave() {
    await saved.insert({
      data: { productName, ...parsed, tiers },
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-base font-semibold">Pricing Calculator</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Product name (optional)"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className="rounded-md border border-brand-border px-3 py-2 text-sm sm:col-span-2"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">
              1688/Taobao cost ($)
            </label>
            <input
              type="number"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">
              Shipping estimate ($)
            </label>
            <input
              type="number"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Basetao fee (%)</label>
            <input
              type="number"
              value={basetaoFeePercent}
              onChange={(e) => setBasetaoFeePercent(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      {hasInput && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-brand-text">
            Landed cost: ${tiers[0]?.totalCost}
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {tiers.map((tier) => (
              <div key={tier.multiplier} className="rounded-md border border-brand-border p-3 text-center">
                <p className="text-xs font-medium text-brand-muted">{tier.multiplier}x margin</p>
                <p className="text-xl font-bold text-brand-text">${tier.retail}</p>
                <p className="text-xs text-green-400">+${tier.profit} profit</p>
              </div>
            ))}
          </div>
          <Button variant="secondary" className="mt-4" onClick={handleSave}>
            Save pricing profile
          </Button>
        </Card>
      )}

      {saved.rows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-text">
            Saved profiles ({saved.rows.length})
          </h3>
          <div className="space-y-2">
            {saved.rows.map((item) => (
              <div key={item.id} className="rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm">
                <span className="font-medium">{item.data?.productName || 'Untitled'}</span>
                {' — '}
                cost ${item.data?.cost}, retail ${item.data?.tiers?.[1]?.retail} @ 3x
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
