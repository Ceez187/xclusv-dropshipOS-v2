import { useState, type FormEvent } from 'react'
import { callClaude, ApiError, type ClaudeMessage } from '../../lib/api'
import { parseClaudeJson } from '../../lib/parseClaudeJson'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import type { Listing, SavedItem, SourcingAnalysis } from '../../types'

const PLATFORMS = ['Shopify', 'Amazon', 'TikTok Shop', 'eBay', 'Etsy'] as const
type Platform = (typeof PLATFORMS)[number]

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  Shopify: 'a persuasive, conversion-focused Shopify product page description',
  Amazon: 'an Amazon-style listing with a benefit-driven title and scannable bullet points',
  'TikTok Shop': 'a punchy, social-native listing that feels at home on TikTok Shop — short and scroll-stopping',
  eBay: 'a concise, practical eBay listing that builds buyer trust with clear specs',
  Etsy: 'a warm, handcrafted-feeling Etsy listing, even though this is a sourced item',
}

interface ListingForm {
  description: string
  platform: Platform
  keywords: string
}

const EMPTY_FORM: ListingForm = { description: '', platform: 'Shopify', keywords: '' }

function buildMessages(form: ListingForm): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: `Write ${PLATFORM_GUIDANCE[form.platform]} for this dropshipped product.\nProduct: ${form.description}${form.keywords.trim() ? `\nTarget keywords to naturally include: ${form.keywords}` : ''}\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n{ "title": string, "description": string, "tags": [string] }`,
    },
  ]
}

type SavedListing = Listing & { sourceForm: ListingForm }

export default function ListingGenerator() {
  const { applyProxyUsage, reportLimitReached } = useUsage()
  const saved = useSupabaseTable<SavedItem<SavedListing>>('saved_items', { match: { kind: 'listing' } })
  const sourcingHistory = useSupabaseTable<SavedItem<SourcingAnalysis>>('saved_items', {
    match: { kind: 'sourcing_history' },
  })

  const [form, setForm] = useState<ListingForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [listing, setListing] = useState<Listing | null>(null)

  function prefillFromSourcing(item: SavedItem<SourcingAnalysis>) {
    const analysis = item.data
    const priceNote =
      analysis?.priceRangeLow != null && analysis?.priceRangeHigh != null
        ? ` (source cost $${analysis.priceRangeLow}–$${analysis.priceRangeHigh})`
        : ''
    setForm({
      ...EMPTY_FORM,
      description: `${analysis?.productName ?? ''}${priceNote}`,
    })
  }

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setListing(null)
    try {
      const res = await callClaude({ actionType: 'listing_generator', messages: buildMessages(form) })
      const { data, raw } = parseClaudeJson<Listing>(res.content)
      applyProxyUsage(res.usage)
      if (data) {
        setListing(data)
        await saved.insert({ data: { ...data, sourceForm: form } } as Partial<SavedItem<SavedListing>>)
      } else {
        setError('Could not parse a structured listing. Raw response: ' + raw)
      }
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // handled by LimitReachedModal
      } else {
        setError((err as Error).message || 'Something went wrong.')
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
        <h2 className="mb-1 text-lg font-bold text-brand-gold">Listing Generator</h2>
        <p className="mb-3 text-sm text-brand-muted">AI-written listings optimized for your platform</p>
        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Product description</label>
            <textarea
              placeholder="e.g. Wireless car phone mount, 15W fast charging, dashboard/windshield"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Platform</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setForm({ ...form, platform: p })}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    form.platform === p
                      ? 'border-brand-gold bg-brand-gold text-black'
                      : 'border-brand-border text-brand-muted'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Target keywords (optional)</label>
            <input
              placeholder="car phone holder, wireless charger..."
              value={form.keywords}
              onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>

          <Button type="submit" disabled={loading || !form.description.trim()}>
            {loading ? 'Generating…' : '✍️ Generate Listing'}
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
