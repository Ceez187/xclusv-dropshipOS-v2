import { useState, type ChangeEvent, type FormEvent } from 'react'
import { callSourcing, callVision, ApiError } from '../../lib/api'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { buildTextSourcingMessages, buildImageSourcingMessages, parseAnalysis } from './prompts'
import type { LiveListing, SavedItem, SourcingAnalysis } from '../../types'

interface SourcingResult {
  analysis: SourcingAnalysis | null
  raw: string
  liveListings: LiveListing[] | null
  degraded?: boolean
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

interface SourcingSite {
  key: string
  label: string
  useZh: boolean
  buildUrl: (keyword: string) => string
}

const SOURCING_SITES: SourcingSite[] = [
  {
    key: 'ali1688',
    label: '1688',
    useZh: true,
    buildUrl: (kw) => `https://www.1688.com/s/?keywords=${encodeURIComponent(kw)}`,
  },
  {
    key: 'taobao',
    label: 'Taobao',
    useZh: true,
    buildUrl: (kw) => `https://s.taobao.com/search?q=${encodeURIComponent(kw)}`,
  },
  {
    key: 'aliexpress',
    label: 'AliExpress',
    useZh: false,
    buildUrl: (kw) => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(kw)}`,
  },
  {
    key: 'basetao',
    label: 'Basetao',
    useZh: false,
    buildUrl: (kw) => `https://www.basetao.com/goods/search.html?keyword=${encodeURIComponent(kw)}`,
  },
]

function siteKeyword(site: SourcingSite, analysis: SourcingAnalysis | null, fallbackInput: string) {
  const zh = analysis?.searchKeywordZh || fallbackInput || ''
  const en = analysis?.searchKeywordEn || fallbackInput || ''
  return (site.useZh ? zh || en : en || zh) || fallbackInput
}

function buildSiteBrief(site: SourcingSite, analysis: SourcingAnalysis, keyword: string) {
  const supplierLines = analysis.suppliers?.length
    ? analysis.suppliers
        .map((s) => `- ${s.type} (MOQ ${s.moq})${s.notes ? ` — ${s.notes}` : ''}`)
        .join('\n')
    : '- (no supplier types listed)'
  return `Product: ${analysis.productName}
Site: ${site.label}
Search keyword: ${keyword}
Source cost: $${analysis.priceRangeLow}–$${analysis.priceRangeHigh}
Suggested retail: $${analysis.suggestedRetail} (${analysis.marginPercent}% margin)
Suppliers:
${supplierLines}`
}

interface SmartSourcingProps {
  onSendToVendors?: (itemName: string) => void
}

export default function SmartSourcing({ onSendToVendors }: SmartSourcingProps) {
  const { refresh: refreshUsage, reportLimitReached } = useUsage()
  const history = useSupabaseTable<SavedItem<SourcingAnalysis>>('saved_items', {
    match: { kind: 'sourcing_history' },
    orderBy: 'created_at',
    ascending: false,
  })

  const [mode, setMode] = useState<'url' | 'image'>('url')
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [copiedSite, setCopiedSite] = useState<string | null>(null)

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function saveToHistory(analysis: SourcingAnalysis) {
    await history.insert({ data: analysis } as Partial<SavedItem<SourcingAnalysis>>)
    if (history.rows.length >= 10) {
      const oldest = [...history.rows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0]
      if (oldest) await history.remove(oldest.id)
    }
  }

  async function runUrlAnalysis(e: FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const messages = buildTextSourcingMessages(input.trim())
      const res = await callSourcing({ messages, keyword: input.trim() })
      const { data: analysis, raw } = parseAnalysis<SourcingAnalysis>(res.content)
      setResult({
        analysis,
        raw,
        liveListings: (res.liveListings as LiveListing[] | null) ?? null,
        degraded: res.degraded,
      })
      await refreshUsage()
      if (analysis) await saveToHistory(analysis)
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // LimitReachedModal will render
      } else {
        setError((err as Error).message || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function runImageAnalysis(e: FormEvent) {
    e.preventDefault()
    if (!imageFile) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const base64 = await fileToBase64(imageFile)
      const messages = buildImageSourcingMessages(base64, imageFile.type)
      const res = await callVision({ messages })
      const { data: analysis, raw } = parseAnalysis<SourcingAnalysis>(res.content)
      setResult({ analysis, raw, liveListings: null, degraded: true })
      await refreshUsage()
      if (analysis) await saveToHistory(analysis)
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // LimitReachedModal will render
      } else {
        setError((err as Error).message || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function copyBrief(site: SourcingSite, analysis: SourcingAnalysis, keyword: string) {
    await navigator.clipboard.writeText(buildSiteBrief(site, analysis, keyword))
    setCopiedSite(site.key)
    setTimeout(() => setCopiedSite((prev) => (prev === site.key ? null : prev)), 1500)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant={mode === 'url' ? 'primary' : 'secondary'} onClick={() => setMode('url')}>
            Paste URL / keyword
          </Button>
          <Button
            variant={mode === 'image' ? 'primary' : 'secondary'}
            onClick={() => setMode('image')}
          >
            Upload image
          </Button>
        </div>

        {mode === 'url' ? (
          <form onSubmit={runUrlAnalysis} className="space-y-3">
            <input
              placeholder="1688/Taobao product URL, or just describe the product"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Analyzing…' : 'Analyze'}
            </Button>
          </form>
        ) : (
          <form onSubmit={runImageAnalysis} className="space-y-3">
            <input type="file" accept="image/*" onChange={handleImageSelect} />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="h-40 w-40 max-w-full rounded-md object-cover" />
            )}
            <Button type="submit" disabled={loading || !imageFile}>
              {loading ? 'Analyzing…' : 'Analyze image'}
            </Button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>

      {result && (
        <Card>
          {result.analysis ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="text-lg font-semibold">{result.analysis.productName}</h3>
                <Button
                  variant="secondary"
                  onClick={() => onSendToVendors?.(result.analysis!.productName)}
                >
                  Send to Vendor Order Builder
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Source cost" value={`$${result.analysis.priceRangeLow}–$${result.analysis.priceRangeHigh}`} />
                <Stat label="Suggested retail" value={`$${result.analysis.suggestedRetail}`} />
                <Stat label="Margin" value={`${result.analysis.marginPercent}%`} />
                <Stat label="Suppliers" value={result.analysis.suppliers?.length ?? 0} />
              </div>

              {result.analysis.suppliers?.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-brand-text">Supplier types</h4>
                  <div className="space-y-2">
                    {result.analysis.suppliers.map((s, i) => (
                      <div key={i} className="rounded-md border border-brand-border p-2 text-sm">
                        <span className="font-medium">{s.type}</span> — MOQ {s.moq}
                        {s.notes && <span className="text-brand-muted"> · {s.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-brand-text">Search by site</h4>
                <div className="space-y-2">
                  {SOURCING_SITES.map((site) => {
                    const keyword = siteKeyword(site, result.analysis, input)
                    return (
                      <div
                        key={site.key}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-brand-border p-2"
                      >
                        <span className="min-w-[90px] text-sm font-medium text-brand-text">{site.label}</span>
                        <a href={site.buildUrl(keyword)} target="_blank" rel="noreferrer">
                          <Button variant="secondary">Open</Button>
                        </a>
                        <Button
                          variant="ghost"
                          onClick={() => copyBrief(site, result.analysis!, keyword)}
                        >
                          {copiedSite === site.key ? 'Copied!' : 'Copy brief'}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {result.liveListings && result.liveListings.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-brand-text">Live listings</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.liveListings.map((item, i) => (
                      <a
                        key={i}
                        href={item.url ?? item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex gap-3 rounded-md border border-brand-border p-2 hover:bg-black/30"
                      >
                        {item.image && (
                          <img src={item.image} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
                        )}
                        <div className="min-w-0 text-sm">
                          <p className="font-medium line-clamp-2">{item.title}</p>
                          <p className="text-brand-muted">
                            {item.price} {item.rating && `· ★${item.rating}`}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-brand-muted">
                  <Badge color="slate">info</Badge>
                  Live listings unavailable this cycle — use the search buttons above.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-amber-400">
                Couldn't parse structured data — showing the raw response.
              </p>
              <pre className="whitespace-pre-wrap break-words text-sm text-brand-text">{result.raw}</pre>
            </div>
          )}
        </Card>
      )}

      {history.rows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-text">Recent sourcing history</h3>
          <div className="space-y-2">
            {history.rows.map((item) => (
              <button
                key={item.id}
                onClick={() => setResult({ analysis: item.data, raw: '', liveListings: null, degraded: true })}
                className="block w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-left text-sm hover:bg-black/30"
              >
                {item.data?.productName ?? 'Untitled'} — ${item.data?.suggestedRetail}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-black/30 p-3 text-center">
      <p className="text-lg font-semibold text-brand-text">{value}</p>
      <p className="text-xs text-brand-muted">{label}</p>
    </div>
  )
}
