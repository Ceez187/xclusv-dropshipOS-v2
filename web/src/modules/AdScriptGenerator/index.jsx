import { useState } from 'react'
import { callClaude, ApiError } from '../../lib/api'
import { parseClaudeJson } from '../../lib/parseClaudeJson'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const PLATFORMS = ['TikTok', 'Meta']

function buildMessages(product, platform) {
  return [
    {
      role: 'user',
      content: `Write three short ${platform} ad script angles for this dropshipped product: "${product}".\n\nAngle 1: problem/solution. Angle 2: social proof. Angle 3: urgency.\n\nRespond with ONLY JSON, no prose, no markdown fences, matching exactly this shape:\n{ "scripts": [ { "angle": string, "script": string } ] }`,
    },
  ]
}

export default function AdScriptGenerator() {
  const { applyProxyUsage, reportLimitReached } = useUsage()
  const [product, setProduct] = useState('')
  const [platform, setPlatform] = useState(PLATFORMS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scripts, setScripts] = useState(null)

  async function handleGenerate(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setScripts(null)
    try {
      const res = await callClaude({
        actionType: 'ad_script_generator',
        messages: buildMessages(product, platform),
      })
      const { data, raw } = parseClaudeJson(res.content)
      applyProxyUsage(res.usage)
      if (data?.scripts) setScripts(data.scripts)
      else setError('Could not parse scripts. Raw response: ' + raw)
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
      <Card>
        <h2 className="mb-3 text-base font-semibold">Ad Script Generator</h2>
        <form onSubmit={handleGenerate} className="space-y-3">
          <input
            placeholder="Product name / description"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            {PLATFORMS.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setPlatform(p)}
                className={`rounded-md border px-3 py-2 text-sm ${
                  platform === p
                    ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-light'
                    : 'border-brand-border text-brand-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Button type="submit" disabled={loading || !product.trim()}>
            {loading ? 'Generating…' : 'Generate scripts'}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </Card>

      {scripts && (
        <div className="space-y-3">
          {scripts.map((s, i) => (
            <Card key={i}>
              <Badge color="blue">{s.angle}</Badge>
              <p className="mt-2 whitespace-pre-wrap text-sm text-brand-text">{s.script}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
