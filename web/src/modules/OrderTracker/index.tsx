import { useState, type FormEvent } from 'react'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge, { type BadgeColor } from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { Order, OrderStatus, Vendor } from '../../types'

const STATUSES: OrderStatus[] = [
  'sourcing',
  'ordered',
  'basetao_received',
  'shipped',
  'delivered',
  'cancelled',
]

const STATUS_COLOR: Record<OrderStatus, BadgeColor> = {
  sourcing: 'slate',
  ordered: 'blue',
  basetao_received: 'purple',
  shipped: 'amber',
  delivered: 'green',
  cancelled: 'red',
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  sourcing: 'Sourcing',
  ordered: 'Ordered',
  basetao_received: 'Basetao Received',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

interface OrderForm {
  product_name: string
  vendor_id: string
  status: OrderStatus
  source_cost: string
  sell_price: string
  customer_name: string
  tracking_notes: string
}

const EMPTY_FORM: OrderForm = {
  product_name: '',
  vendor_id: '',
  status: 'sourcing',
  source_cost: '',
  sell_price: '',
  customer_name: '',
  tracking_notes: '',
}

export default function OrderTracker() {
  const orders = useSupabaseTable<Order>('orders')
  const vendors = useSupabaseTable<Vendor>('vendors')

  const [form, setForm] = useState<OrderForm>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Order | null>(null)
  const [formError, setFormError] = useState('')

  function startEdit(order: Order) {
    setEditingId(order.id)
    setForm({
      product_name: order.product_name ?? '',
      vendor_id: order.vendor_id ?? '',
      status: order.status ?? 'sourcing',
      source_cost: order.source_cost != null ? String(order.source_cost) : '',
      sell_price: order.sell_price != null ? String(order.sell_price) : '',
      customer_name: order.customer_name ?? '',
      tracking_notes: order.tracking_notes ?? '',
    })
    setShowForm(true)
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const values = {
      ...form,
      vendor_id: form.vendor_id || null,
      source_cost: form.source_cost === '' ? null : Number(form.source_cost),
      sell_price: form.sell_price === '' ? null : Number(form.sell_price),
    }
    try {
      if (editingId) await orders.update(editingId, { ...values, updated_at: new Date().toISOString() })
      else await orders.insert(values)
      resetForm()
    } catch (err) {
      setFormError((err as Error).message || 'Something went wrong saving this order.')
    }
  }

  async function updateStatus(order: Order, status: OrderStatus) {
    try {
      await orders.update(order.id, { status, updated_at: new Date().toISOString() })
    } catch (err) {
      setFormError((err as Error).message || 'Something went wrong updating this order.')
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await orders.remove(pendingDelete.id)
    } catch (err) {
      setFormError((err as Error).message || 'Something went wrong deleting this order.')
    }
    setPendingDelete(null)
  }

  function vendorName(id: string) {
    return vendors.rows.find((v) => v.id === id)?.name
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Orders ({orders.rows.length})</h2>
        <Button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
          {showForm ? 'Cancel' : '+ New order'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Product name"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              className="rounded-md border border-brand-border px-3 py-2 text-sm sm:col-span-2"
            />
            <select
              value={form.vendor_id}
              onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}
              className="rounded-md border border-brand-border px-3 py-2 text-sm"
            >
              <option value="">No vendor</option>
              {vendors.rows.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
              className="rounded-md border border-brand-border px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Source cost ($)"
              value={form.source_cost}
              onChange={(e) => setForm({ ...form, source_cost: e.target.value })}
              className="rounded-md border border-brand-border px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Sell price ($)"
              value={form.sell_price}
              onChange={(e) => setForm({ ...form, sell_price: e.target.value })}
              className="rounded-md border border-brand-border px-3 py-2 text-sm"
            />
            <input
              placeholder="Customer name"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="rounded-md border border-brand-border px-3 py-2 text-sm sm:col-span-2"
            />
            <textarea
              placeholder="Tracking notes"
              value={form.tracking_notes}
              onChange={(e) => setForm({ ...form, tracking_notes: e.target.value })}
              rows={2}
              className="rounded-md border border-brand-border px-3 py-2 text-sm sm:col-span-2"
            />
            {formError && <p className="text-sm text-red-400 sm:col-span-2">{formError}</p>}
            <Button type="submit" className="sm:col-span-2">
              {editingId ? 'Save changes' : 'Create order'}
            </Button>
          </form>
        </Card>
      )}

      {!showForm && formError && <p className="text-sm text-red-400">{formError}</p>}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {STATUSES.map((status) => (
          <div key={status}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-muted">
              {STATUS_LABEL[status]}
              <span className="text-xs font-normal text-brand-muted">
                ({orders.rows.filter((o) => o.status === status).length})
              </span>
            </h3>
            <div className="space-y-2">
              {orders.rows
                .filter((o) => o.status === status)
                .map((order) => (
                  <Card key={order.id} className="p-3">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-brand-text">{order.product_name}</p>
                      <Badge color={STATUS_COLOR[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                    </div>
                    {order.vendor_id && (
                      <p className="text-xs text-brand-muted">Vendor: {vendorName(order.vendor_id)}</p>
                    )}
                    {order.customer_name && (
                      <p className="text-xs text-brand-muted">Customer: {order.customer_name}</p>
                    )}
                    {(order.source_cost || order.sell_price) && (
                      <p className="text-xs text-brand-muted">
                        ${order.source_cost ?? '—'} → ${order.sell_price ?? '—'}
                      </p>
                    )}
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order, e.target.value as OrderStatus)}
                      className="mt-2 w-full rounded-md border border-brand-border px-2 py-1 text-xs"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => startEdit(order)}
                        className="text-xs text-brand-gold hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setPendingDelete(order)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete order?"
        message={`This will permanently remove ${pendingDelete?.product_name}.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
