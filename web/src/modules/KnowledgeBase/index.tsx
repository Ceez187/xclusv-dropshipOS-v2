import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import type { FaqItem, GlossaryTerm } from '../../types'

type Section = 'glossary' | 'faq'

export default function KnowledgeBase() {
  const [section, setSection] = useState<Section>('glossary')
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [faqs, setFaqs] = useState<FaqItem[]>([])
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      const [{ data: termData, error: termError }, { data: faqData, error: faqError }] = await Promise.all([
        supabase.from('glossary_terms').select('*').order('sort_order', { ascending: true }),
        supabase.from('faq_items').select('*').order('sort_order', { ascending: true }),
      ])
      if (cancelled) return
      if (termError || faqError) setError((termError ?? faqError)!.message)
      setTerms((termData as GlossaryTerm[]) ?? [])
      setFaqs((faqData as FaqItem[]) ?? [])
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredTerms = terms.filter(
    (t) =>
      !search.trim() ||
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-brand-gold">Knowledge Base</h2>
        <p className="text-sm text-brand-muted">Glossary of terms and frequently asked questions.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={section === 'glossary' ? 'primary' : 'secondary'} onClick={() => setSection('glossary')}>
          📖 Glossary
        </Button>
        <Button variant={section === 'faq' ? 'primary' : 'secondary'} onClick={() => setSection('faq')}>
          ❓ FAQ
        </Button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="text-sm text-brand-muted">Loading…</p>
      ) : section === 'glossary' ? (
        <div className="space-y-3">
          <input
            placeholder="Search terms…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          {filteredTerms.length === 0 ? (
            <p className="text-sm text-brand-muted">No matching terms.</p>
          ) : (
            <div className="space-y-2">
              {filteredTerms.map((t) => (
                <Card key={t.id}>
                  <h3 className="text-sm font-semibold text-brand-gold-light">{t.term}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-brand-text">{t.definition}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {faqs.length === 0 ? (
            <p className="text-sm text-brand-muted">No FAQ items yet.</p>
          ) : (
            faqs.map((f) => {
              const isOpen = openFaqId === f.id
              return (
                <Card key={f.id}>
                  <button
                    className="flex w-full items-center justify-between gap-2 text-left"
                    onClick={() => setOpenFaqId(isOpen ? null : f.id)}
                  >
                    <span className="text-sm font-semibold text-brand-text">{f.question}</span>
                    <span className="text-brand-muted">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <p className="mt-2 text-sm leading-relaxed text-brand-muted">{f.answer}</p>}
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
