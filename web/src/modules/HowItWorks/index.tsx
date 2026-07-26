import Card from '../../components/ui/Card'

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
    </div>
  )
}
