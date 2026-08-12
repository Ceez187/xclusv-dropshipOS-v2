import { useState } from 'react'
import { callClaude, ApiError } from '../../lib/api'
import { parseClaudeJson } from '../../lib/parseClaudeJson'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const EMPTY_FORM = { name: '', cost: '', features: '' }

function buildMessages(form) {
  return [
    {
      role: 'user',
      content: `Write a WooCommerce-ready product listing for this dropshipped product.\nName: ${form.name}\nCost: $${form.cost}\nFeatures: ${form.features}\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n{ "title": string, "description": string, "tags": [string] }`,
    },
  ]
}

export default function ListingGenerator() {
  const { applyProxyUsage, reportLimitReached } = useUsage()
  const saved = useSupabaseTable('saved_items', { match: { kind: 'listing' } })
  const sourcingHistory = useSupabaseTable('saved_items', { match: { kind: 'sourcing_history' } })

  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listing, setListing] = useState(null)

  function prefillFromSourcing(item) {
    setForm({
      name: item.data?.productName ?? '',
      cost: item.data?.priceRangeLow ?? '',
      features: '',
    })
  }

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setListing(null)
    try {
      const res = await callClaude({ actionType: 'listing_generator', messages: buildMessages(form) })
      const { data, raw } = parseClaudeJson(res.content)
      applyProxyUsage(res.usage)
      if (data) {
        setListing(data)
        await saved.insert({ data: { ...data, sourceForm: form } })
      } else {
        setError('Could not parse a structured listing. Raw response: ' + raw)
      }
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // handled by LimitReachedModal
      } else {
        setError(err.message || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {sourcingHistory.rows.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-brand-text">Pull from Smart Sourcing history</h3>
          <div className="flex flex-wrap gap-2">
            {sourcingHistory.rows.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => prefillFromSourcing(item)}
                className="rounded-full border border-brand-border px-3 py-1 text-xs hover:bg-brand-surface-hover"
              >
                {item.data?.productName ?? 'Untitled'}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-base font-semibold">Listing Generator</h2>
        <form onSubmit={handleGenerate} className="space-y-3">
          <input
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <input
            placeholder="Cost ($)"
            type="number"
            value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Key features (comma separated)"
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
            rows={3}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <Button type="submit" disabled={loading || !form.name.trim()}>
            {loading ? 'Generating…' : 'Generate listing'}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>

      {listing && (
        <Card>
          <h3 className="text-lg font-semibold text-brand-gold">{listing.title}</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-text">{listing.description}</p>
          <div className="mt-3 flex flex-wrap gap-1">
            {listing.tags?.map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>
        </Card>
      )}

      {saved.rows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-text">Saved listings ({saved.rows.length})</h3>
          <div className="space-y-2">
            {saved.rows.map((item) => (
              <button
                key={item.id}
                onClick={() => setListing(item.data)}
                className="block w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-left text-sm hover:bg-brand-surface-hover"
              >
                {item.data?.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
