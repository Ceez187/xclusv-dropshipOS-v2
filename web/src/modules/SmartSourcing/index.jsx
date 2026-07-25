import { useState } from 'react'
import { callSourcing, callVision, ApiError } from '../../lib/api'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { buildTextSourcingMessages, buildImageSourcingMessages, parseAnalysis } from './prompts'

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function searchLinks(analysis, fallbackInput) {
  const zh = analysis?.searchKeywordZh || fallbackInput || ''
  const en = analysis?.searchKeywordEn || fallbackInput || ''
  return {
    ali1688: `https://www.1688.com/s/?keywords=${encodeURIComponent(zh)}`,
    basetao: `https://www.basetao.com/goods/search.html?keyword=${encodeURIComponent(en || zh)}`,
  }
}

export default function SmartSourcing({ onSendToVendors }) {
  const { refresh: refreshUsage, reportLimitReached } = useUsage()
  const history = useSupabaseTable('saved_items', {
    match: { kind: 'sourcing_history' },
    orderBy: 'created_at',
    ascending: false,
  })

  const [mode, setMode] = useState('url') // 'url' | 'image'
  const [input, setInput] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null) // { analysis, raw, liveListings, degraded }

  function handleImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function saveToHistory(analysis) {
    await history.insert({ data: analysis })
    if (history.rows.length >= 10) {
      const oldest = [...history.rows].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      )[0]
      if (oldest) await history.remove(oldest.id)
    }
  }

  async function runUrlAnalysis(e) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const messages = buildTextSourcingMessages(input.trim())
      const res = await callSourcing({ messages, keyword: input.trim() })
      const { data: analysis, raw } = parseAnalysis(res.content)
      setResult({ analysis, raw, liveListings: res.liveListings, degraded: res.degraded })
      await refreshUsage()
      if (analysis) await saveToHistory(analysis)
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // LimitReachedModal will render
      } else {
        setError(err.message || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function runImageAnalysis(e) {
    e.preventDefault()
    if (!imageFile) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const base64 = await fileToBase64(imageFile)
      const messages = buildImageSourcingMessages(base64, imageFile.type)
      const res = await callVision({ messages })
      const { data: analysis, raw } = parseAnalysis(res.content)
      setResult({ analysis, raw, liveListings: null, degraded: true })
      await refreshUsage()
      if (analysis) await saveToHistory(analysis)
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // LimitReachedModal will render
      } else {
        setError(err.message || 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  const links = result ? searchLinks(result.analysis, input) : null

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex gap-2">
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Analyzing…' : 'Analyze'}
            </Button>
          </form>
        ) : (
          <form onSubmit={runImageAnalysis} className="space-y-3">
            <input type="file" accept="image/*" onChange={handleImageSelect} />
            {imagePreview && (
              <img src={imagePreview} alt="Preview" className="h-40 rounded-md object-cover" />
            )}
            <Button type="submit" disabled={loading || !imageFile}>
              {loading ? 'Analyzing…' : 'Analyze image'}
            </Button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </Card>

      {result && (
        <Card>
          {result.analysis ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{result.analysis.productName}</h3>
                <Button
                  variant="secondary"
                  onClick={() => onSendToVendors?.(result.analysis.productName)}
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
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Supplier types</h4>
                  <div className="space-y-2">
                    {result.analysis.suppliers.map((s, i) => (
                      <div key={i} className="rounded-md border border-slate-200 p-2 text-sm">
                        <span className="font-medium">{s.type}</span> — MOQ {s.moq}
                        {s.notes && <span className="text-slate-500"> · {s.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <a href={links.ali1688} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Search 1688</Button>
                </a>
                <a href={links.basetao} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Search Basetao</Button>
                </a>
              </div>

              {result.liveListings?.length > 0 ? (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">Live listings</h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {result.liveListings.map((item, i) => (
                      <a
                        key={i}
                        href={item.url ?? item.link}
                        target="_blank"
                        rel="noreferrer"
                        className="flex gap-3 rounded-md border border-slate-200 p-2 hover:bg-slate-50"
                      >
                        {item.image && (
                          <img src={item.image} alt="" className="h-16 w-16 rounded object-cover" />
                        )}
                        <div className="text-sm">
                          <p className="font-medium line-clamp-2">{item.title}</p>
                          <p className="text-slate-500">
                            {item.price} {item.rating && `· ★${item.rating}`}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-400">
                  <Badge color="slate">info</Badge>
                  Live listings unavailable this cycle — use the search buttons above.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2 text-sm text-amber-600">
                Couldn't parse structured data — showing the raw response.
              </p>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{result.raw}</pre>
            </div>
          )}
        </Card>
      )}

      {history.rows.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent sourcing history</h3>
          <div className="space-y-2">
            {history.rows.map((item) => (
              <button
                key={item.id}
                onClick={() => setResult({ analysis: item.data, raw: '', liveListings: null, degraded: true })}
                className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50"
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

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-slate-50 p-3 text-center">
      <p className="text-lg font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}
