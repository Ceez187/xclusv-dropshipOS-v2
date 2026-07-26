import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import { callClaude, ApiError, type ClaudeMessage } from '../../lib/api'
import { useUsage } from '../../context/UsageContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Customer, Order } from '../../types'

interface CustomerForm {
  name: string
  email: string
  total_orders: string
  ltv: string
  is_repeat: boolean
  notes: string
}

const EMPTY_FORM: CustomerForm = { name: '', email: '', total_orders: '', ltv: '', is_repeat: false, notes: '' }

function buildAnalysisMessages(customer: Customer, orders: Order[]): ClaudeMessage[] {
  const orderLines = orders
    .map((o) => `- ${o.product_name}, $${o.sell_price ?? '?'}, status ${o.status}`)
    .join('\n')
  return [
    {
      role: 'user',
      content: `Summarize this customer's buying pattern in 2-3 sentences for a dropshipping store owner.\nCustomer: ${customer.name}\nOrder history:\n${orderLines || '(no linked orders on file)'}\n\nRespond with plain text only, no JSON.`,
    },
  ]
}

export default function CustomerIntelligence() {
  const customers = useSupabaseTable<Customer>('customers')
  const orders = useSupabaseTable<Order>('orders')
  const { applyProxyUsage, reportLimitReached } = useUsage()

  const [form, setForm] = useState<CustomerForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<Record<string, string>>({})
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const values = {
      name: form.name,
      email: form.email,
      total_orders: form.total_orders === '' ? 0 : Number(form.total_orders),
      ltv: form.ltv === '' ? 0 : Number(form.ltv),
      is_repeat: form.is_repeat,
      notes: form.notes,
    }
    if (editingId) await customers.update(editingId, values)
    else await customers.insert(values)
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEdit(customer: Customer) {
    setEditingId(customer.id)
    setForm({
      name: customer.name ?? '',
      email: customer.email ?? '',
      total_orders: customer.total_orders != null ? String(customer.total_orders) : '',
      ltv: customer.ltv != null ? String(customer.ltv) : '',
      is_repeat: customer.is_repeat ?? false,
      notes: customer.notes ?? '',
    })
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    await customers.remove(pendingDelete.id)
    setPendingDelete(null)
  }

  async function handleAnalyze(customer: Customer) {
    setAnalyzing(customer.id)
    setError('')
    try {
      const customerOrders = orders.rows.filter((o) => o.customer_name === customer.name)
      const res = await callClaude({
        actionType: 'customer_analysis',
        messages: buildAnalysisMessages(customer, customerOrders),
      })
      applyProxyUsage(res.usage)
      const text = (res.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n')
      setAnalysis((prev) => ({ ...prev, [customer.id]: text }))
    } catch (err) {
      if (err instanceof ApiError && reportLimitReached(err)) {
        // handled by LimitReachedModal
      } else {
        setError((err as Error).message || 'Something went wrong.')
      }
    } finally {
      setAnalyzing(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-base font-semibold">{editingId ? 'Edit customer' : 'Add customer'}</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Total orders"
            value={form.total_orders}
            onChange={(e) => setForm({ ...form, total_orders: e.target.value })}
            className="rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="LTV ($)"
            value={form.ltv}
            onChange={(e) => setForm({ ...form, ltv: e.target.value })}
            className="rounded-md border border-brand-border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.is_repeat}
              onChange={(e) => setForm({ ...form, is_repeat: e.target.checked })}
            />
            Repeat customer
          </label>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="rounded-md border border-brand-border px-3 py-2 text-sm sm:col-span-2"
          />
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">{editingId ? 'Save changes' : 'Add customer'}</Button>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditingId(null)
                  setForm(EMPTY_FORM)
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-3">
        {customers.rows.map((customer) => (
          <Card key={customer.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brand-text">{customer.name}</h3>
                  {customer.is_repeat && <Badge color="green">repeat</Badge>}
                </div>
                <p className="text-sm text-brand-muted">{customer.email}</p>
                <p className="text-sm text-brand-muted">
                  {customer.total_orders} orders · ${customer.ltv} LTV
                </p>
                {customer.notes && <p className="mt-1 text-sm text-brand-muted">{customer.notes}</p>}
                {analysis[customer.id] && (
                  <p className="mt-2 rounded-md bg-brand-gold/10 p-2 text-sm text-brand-gold-light">
                    {analysis[customer.id]}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0 sm:flex-col">
                <Button
                  variant="secondary"
                  onClick={() => handleAnalyze(customer)}
                  disabled={analyzing === customer.id}
                >
                  {analyzing === customer.id ? 'Analyzing…' : 'Analyze'}
                </Button>
                <Button variant="ghost" onClick={() => startEdit(customer)}>
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setPendingDelete(customer)}>
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete customer?"
        message={`This will permanently remove ${pendingDelete?.name}.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
