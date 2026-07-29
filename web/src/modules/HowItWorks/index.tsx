import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'

const SEEN_KEY = 'dropshipos:how-it-works-seen'

interface Step {
  n: number
  title: string
  text: string
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Source a product',
    text: 'Paste a product URL or description — or upload a photo — in Smart Sourcing to get an AI pricing analysis, supplier notes, and ready-to-use search links and search text for 1688, Taobao, AliExpress, and Basetao.',
  },
  {
    n: 2,
    title: 'Find & message a supplier',
    text: 'Save suppliers in Vendors, then use the built-in Order Builder to message them on WhatsApp, WeChat, Facebook, or Email — no copy-pasting between apps.',
  },
  {
    n: 3,
    title: 'Write your listing',
    text: 'Use Listing Generator to turn a sourced product into a platform-ready title, description, and tags.',
  },
  {
    n: 4,
    title: 'Price it right',
    text: 'Use Pricing Calculator to work out a retail price that covers your cost, shipping, and Basetao fees at the margin you want.',
  },
  {
    n: 5,
    title: 'Launch ads',
    text: 'Generate TikTok, Meta, and YouTube Shorts ad scripts — hook, problem, solution, proof, and CTA — in Ad Scripts.',
  },
  {
    n: 6,
    title: 'Track every order',
    text: 'Log each order in Orders from sourcing through delivery, with profit and status at a glance.',
  },
  {
    n: 7,
    title: 'Know your customers',
    text: 'Use Customers to spot repeat buyers and get AI suggestions for reactivation and upsells.',
  },
]

export default function HowItWorks() {
  const [alreadySeen] = useState(() => localStorage.getItem(SEEN_KEY) === 'true')
  const [expanded, setExpanded] = useState(!alreadySeen)

  useEffect(() => {
    localStorage.setItem(SEEN_KEY, 'true')
  }, [])

  if (!expanded) {
    return (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-brand-gold">How DropshipOS works</h2>
            <p className="text-sm text-brand-muted">You've seen this guide already — tap to view it again.</p>
          </div>
          <Button variant="secondary" onClick={() => setExpanded(true)}>
            Show guide
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-1 text-lg font-bold text-brand-gold">How DropshipOS works</h2>
        <p className="mb-4 text-sm text-brand-muted">
          Seven modules, one workflow — from finding a product to knowing who's buying it.
        </p>
        <div className="divide-y divide-brand-border">
          {STEPS.map((step) => (
            <div key={step.n} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-[28px] text-3xl font-bold leading-none text-brand-gold">{step.n}</div>
              <p className="text-sm leading-relaxed text-brand-text">
                <span className="font-semibold text-brand-gold-light">{step.title}.</span> {step.text}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-xs leading-relaxed text-brand-muted">
          Every module saves straight to your account — vendors, orders, customers, and saved
          listings sync across devices, so you can switch from phone to desktop mid-task and pick
          up right where you left off.
        </p>
      </Card>

      <div className="text-right">
        <Button variant="ghost" onClick={() => setExpanded(false)}>
          Collapse this guide
        </Button>
      </div>
    </div>
  )
}
