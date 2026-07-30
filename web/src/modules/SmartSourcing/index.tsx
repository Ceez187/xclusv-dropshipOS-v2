import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { callSourcing, callVision, ApiError } from '../../lib/api'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { type BadgeColor } from '../../components/ui/Badge'
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

const AUTHENTICITY_BADGE: Record<string, { label: string; color: BadgeColor }> = {
  verified: { label: '✓ Verified original', color: 'green' },
  risk: { label: '⚠ Counterfeit risk', color: 'red' },
  unknown: { label: 'Unverified', color: 'slate' },
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

// If the user pasted an actual product URL from one of these sites (rather
// than a keyword/description), link straight to that item on its own site
// instead of a re-derived search query — the other sites still get a search
// link since we don't have a direct URL for them.
const SITE_HOST_PATTERNS: { pattern: RegExp; key: string }[] = [
  { pattern: /(^|\.)1688\.com$/, key: 'ali1688' },
  { pattern: /(^|\.)taobao\.com$/, key: 'taobao' },
  { pattern: /(^|\.)aliexpress\.com$/, key: 'aliexpress' },
  { pattern: /(^|\.)basetao\.com$/, key: 'basetao' },
]

function detectDirectItemUrl(input: string): { key: string; url: string } | null {
  const trimmed = input.trim()
  if (!/^https?:\/\//i.test(trimmed)) return null
  let hostname: string
  try {
    hostname = new URL(trimmed).hostname
  } catch {
    return null
  }
  const match = SITE_HOST_PATTERNS.find((p) => p.pattern.test(hostname))
  return match ? { key: match.key, url: trimmed } : null
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

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [descriptionInput, setDescriptionInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SourcingResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [copiedBriefSite, setCopiedBriefSite] = useState<string | null>(null)
  const [copiedKeywordSite, setCopiedKeywordSite] = useState<string | null>(null)

  useEffect(() => {
    if (loading) {
      setProgress(8)
      progressTimer.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + (90 - p) * 0.12 : p))
      }, 350)
    } else if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
      setProgress((p) => (p > 0 ? 100 : 0))
      const reset = setTimeout(() => setProgress(0), 500)
      return () => clearTimeout(reset)
    }
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [loading])

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

  async function runAnalysis(e: FormEvent) {
    e.preventDefault()
    const url = urlInput.trim()
    const description = descriptionInput.trim()
    if (!imageFile && !url && !description) return

    setLoading(true)
    setError('')
    setResult(null)
    try {
      let analysis: SourcingAnalysis | null
      let raw: string
      let liveListings: LiveListing[] | null = null
      let degraded = true

      if (imageFile) {
        const base64 = await fileToBase64(imageFile)
        const extraContext = [url, description].filter(Boolean).join(' — ')
        const messages = buildImageSourcingMessages(base64, imageFile.type, extraContext)
        const res = await callVision({ messages })
        ;({ data: analysis, raw } = parseAnalysis<SourcingAnalysis>(res.content))
      } else {
        const combined = [url, description].filter(Boolean).join(' — ')
        const messages = buildTextSourcingMessages(combined)
        const res = await callSourcing({ messages, keyword: combined })
        ;({ data: analysis, raw } = parseAnalysis<SourcingAnalysis>(res.content))
        liveListings = (res.liveListings as LiveListing[] | null) ?? null
        degraded = !!res.degraded
      }

      setResult({ analysis, raw, liveListings, degraded })
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
    setCopiedBriefSite(site.key)
    setTimeout(() => setCopiedBriefSite((prev) => (prev === site.key ? null : prev)), 1500)
  }

  async function copyKeyword(site: SourcingSite, keyword: string) {
    await navigator.clipboard.writeText(keyword)
    setCopiedKeywordSite(site.key)
    setTimeout(() => setCopiedKeywordSite((prev) => (prev === site.key ? null : prev)), 1500)
  }

  const fallbackKeyword = [descriptionInput, urlInput].filter(Boolean).join(' ')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-brand-gold">Smart Sourcing</h2>
          <p className="text-sm text-brand-muted">Photo · URL · or describe — AI finds suppliers + brief</p>
        </div>
        <Button variant="secondary" onClick={() => setShowHistory((v) => !v)}>
          📋 History ({history.rows.length})
        </Button>
      </div>

      {showHistory && history.rows.length > 0 && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-brand-text">Recent sourcing history</h3>
          <div className="space-y-2">
            {history.rows.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setResult({ analysis: item.data, raw: '', liveListings: null, degraded: true })
                  setShowHistory(false)
                }}
                className="block w-full rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-left text-sm hover:bg-black/30"
              >
                {item.data?.productName ?? 'Untitled'} — ${item.data?.suggestedRetail}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <form onSubmit={runAnalysis} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">📷 Upload Product Photo</label>
            <label
              htmlFor="sourcing-photo-input"
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed border-brand-border py-8 text-center hover:bg-brand-surface-hover"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-32 w-32 max-w-full rounded-md object-cover" />
              ) : (
                <>
                  <span className="text-2xl">📷</span>
                  <span className="text-sm text-brand-text">Tap to upload a product photo</span>
                  <span className="text-xs text-brand-muted">JPG, PNG, WEBP · max 4MB</span>
                </>
              )}
            </label>
            <input
              id="sourcing-photo-input"
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">
              Product URL (optional — 1688, Taobao, Amazon, AliExpress)
            </label>
            <input
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Describe the product (optional)</label>
            <textarea
              placeholder="e.g. LED car interior lights, RGB strip, USB powered, 5 meters"
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>

          <Button type="submit" disabled={loading || (!imageFile && !urlInput.trim() && !descriptionInput.trim())}>
            {loading ? 'Analyzing…' : '🔍 Find Suppliers + Brief'}
          </Button>

          {loading && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
                <div
                  className="h-full rounded-full bg-brand-gold transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.round(progress)}%` }}
                />
              </div>
              <p className="text-xs text-brand-muted">Analyzing product — this can take 10-30 seconds…</p>
            </div>
          )}
        </form>

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
                    {result.analysis.suppliers.map((s, i) => {
                      const badge = AUTHENTICITY_BADGE[s.authenticity] ?? AUTHENTICITY_BADGE.unknown
                      return (
                        <div key={i} className="rounded-md border border-brand-border p-2 text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{s.type}</span>
                            <span className="text-brand-muted">MOQ {s.moq}</span>
                            <Badge color={badge.color}>{badge.label}</Badge>
                          </div>
                          {s.notes && <p className="mt-1 text-brand-muted">{s.notes}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-brand-text">Search by site</h4>
                <div className="space-y-2">
                  {(() => {
                    const directItem = detectDirectItemUrl(urlInput)
                    return SOURCING_SITES.map((site) => {
                      const keyword = siteKeyword(site, result.analysis, fallbackKeyword)
                      const isDirect = directItem?.key === site.key
                      const openUrl = isDirect ? directItem!.url : site.buildUrl(keyword)
                      return (
                        <div
                          key={site.key}
                          className="rounded-md border border-brand-border p-2"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="min-w-[90px] text-sm font-medium text-brand-text">{site.label}</span>
                            <a href={openUrl} target="_blank" rel="noreferrer">
                              <Button variant="secondary">{isDirect ? 'Open item' : 'Search'}</Button>
                            </a>
                            <Button variant="ghost" onClick={() => copyKeyword(site, keyword)}>
                              {copiedKeywordSite === site.key ? 'Copied!' : 'Copy search text'}
                            </Button>
                            <Button variant="ghost" onClick={() => copyBrief(site, result.analysis!, keyword)}>
                              {copiedBriefSite === site.key ? 'Copied!' : 'Copy brief'}
                            </Button>
                          </div>
                          {!isDirect && (
                            <p className="mt-1 truncate text-xs text-brand-muted">
                              Paste into {site.label}'s search box: <span className="text-brand-text">{keyword}</span>
                            </p>
                          )}
                        </div>
                      )
                    })
                  })()}
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
