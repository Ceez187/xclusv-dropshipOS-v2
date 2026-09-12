import { useState, type FormEvent } from 'react'
import { callClaude, ApiError, type ClaudeMessage } from '../../lib/api'
import { parseClaudeJson } from '../../lib/parseClaudeJson'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import type { AdScript } from '../../types'

const PLATFORMS = ['TikTok', 'Meta/Instagram', 'YouTube Shorts'] as const

const ANGLES = ['Problem/Solution', 'Before/After', 'Social Proof', 'Curiosity Hook', 'Lifestyle'] as const
type Angle = (typeof ANGLES)[number]

const ANGLE_GUIDANCE: Record<Angle, string> = {
  'Problem/Solution': 'open with the pain point, then show the product as the fix',
  'Before/After': 'contrast life without the product versus with it',
  'Social Proof': 'lean on reviews, results, or social validation',
  'Curiosity Hook': 'open with an intriguing question or surprising fact to stop the scroll',
  Lifestyle: 'show the product fitting naturally into an aspirational day-to-day scene',
}

interface AdScriptForm {
  product: string
  audience: string
  platform: string
  angle: Angle
}

const EMPTY_FORM: AdScriptForm = { product: '', audience: '', platform: PLATFORMS[0], angle: ANGLES[0] }

function buildMessages(form: AdScriptForm): ClaudeMessage[] {
  return [
    {
      role: 'user',
      content: `Write a short ${form.platform} ad script for this dropshipped product: "${form.product}".${
        form.audience.trim() ? `\nTarget audience: ${form.audience}` : ''
      }\n\nAngle: ${form.angle} — ${ANGLE_GUIDANCE[form.angle]}\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n{ "script": string }`,
    },
  ]
}

export default function AdScriptGenerator() {
  const { applyProxyUsage, reportLimitReached } = useUsage()
  const [form, setForm] = useState<AdScriptForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<AdScript | null>(null)

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await callClaude({
        actionType: 'ad_script_generator',
        messages: buildMessages(form),
      })
      const { data, raw } = parseClaudeJson<{ script: string }>(res.content)
      applyProxyUsage(res.usage)
      if (data?.script) setResult({ angle: form.angle, script: data.script })
      else setError('Could not parse the script. Raw response: ' + raw)
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
      <Card>
        <h2 className="mb-1 text-lg font-bold text-brand-gold">Ad Script Generator</h2>
        <p className="mb-3 text-sm text-brand-muted">TikTok &amp; Meta scripts in multiple angles</p>
        <form onSubmit={handleGenerate} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Product</label>
            <textarea
              placeholder="e.g. Portable car vacuum, 120W, wet/dry, cordless"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand-muted">Target audience</label>
            <input
              placeholder="e.g. car owners, parents, commuters"
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
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
            <label className="mb-1 block text-sm font-medium text-brand-muted">Angle</label>
            <div className="flex flex-wrap gap-2">
              {ANGLES.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setForm({ ...form, angle: a })}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    form.angle === a
                      ? 'border-brand-gold bg-brand-gold/30 text-brand-gold-light'
                      : 'border-brand-border text-brand-muted'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" disabled={loading || !form.product.trim()}>
            {loading ? 'Generating…' : '🎬 Generate Script'}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>

      {result && (
        <Card>
          <Badge color="blue">{result.angle}</Badge>
          <p className="mt-2 whitespace-pre-wrap text-sm text-brand-text">{result.script}</p>
        </Card>
      )}
    </div>
  )
}
