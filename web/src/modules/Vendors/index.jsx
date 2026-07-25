import { useState } from 'react'
import { useSupabaseTable } from '../../lib/useSupabaseTable'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import ConfirmDialog from '../../components/ConfirmDialog'
import OrderBuilder from './OrderBuilder'

const CONTACT_METHODS = ['whatsapp', 'wechat', 'facebook', 'email']

const METHOD_COLOR = { whatsapp: 'green', wechat: 'blue', facebook: 'purple', email: 'slate' }

function isValidForMethod(method, value) {
  if (method === 'whatsapp') return /^\+?[0-9\s-]{7,15}$/.test(value)
  if (method === 'email') return /^\S+@\S+\.\S+$/.test(value)
  return value.trim().length > 0
}

const EMPTY_FORM = { name: '', contact_method: 'whatsapp', contact_value: '', notes: '' }

export default function Vendors({ draftItem, onDraftConsumed }) {
  const { rows: vendors, loading, insert, update, remove } = useSupabaseTable('vendors')
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [pendingDelete, setPendingDelete] = useState(null)
  const [orderBuilderFor, setOrderBuilderFor] = useState(draftItem ? null : null)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Vendor name is required.')
      return
    }
    if (form.contact_value && !isValidForMethod(form.contact_method, form.contact_value)) {
      setFormError(
        form.contact_method === 'whatsapp'
          ? 'That doesn’t look like a valid WhatsApp number (use digits, spaces, or a leading +).'
          : 'That doesn’t look like a valid email address.'
      )
      return
    }

    if (editingId) {
      await update(editingId, form)
    } else {
      await insert(form)
    }
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  function startEdit(vendor) {
    setEditingId(vendor.id)
    setForm({
      name: vendor.name ?? '',
      contact_method: vendor.contact_method ?? 'whatsapp',
      contact_value: vendor.contact_value ?? '',
      notes: vendor.notes ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  async function confirmDelete() {
    await remove(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 text-base font-semibold">{editingId ? 'Edit vendor' : 'Add vendor'}</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <input
            placeholder="Vendor name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.contact_method}
            onChange={(e) => setForm({ ...form, contact_method: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {CONTACT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            placeholder="Contact value (phone, handle, email...)"
            value={form.contact_value}
            onChange={(e) => setForm({ ...form, contact_value: e.target.value })}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
          />

          {formError && <p className="text-sm text-red-600 sm:col-span-2">{formError}</p>}

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">{editingId ? 'Save changes' : 'Add vendor'}</Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold">Vendors ({vendors.length})</h2>
        {loading && <p className="text-sm text-slate-400">Loading…</p>}
        {!loading && vendors.length === 0 && (
          <p className="text-sm text-slate-400">No vendors yet — add your first one above.</p>
        )}

        <div className="space-y-3">
          {vendors.map((vendor) => (
            <Card key={vendor.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
                    <Badge color={METHOD_COLOR[vendor.contact_method] ?? 'slate'}>
                      {vendor.contact_method}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">{vendor.contact_value}</p>
                  {vendor.notes && <p className="mt-1 text-sm text-slate-600">{vendor.notes}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setOrderBuilderFor(orderBuilderFor === vendor.id ? null : vendor.id)
                    }
                  >
                    Order builder
                  </Button>
                  <Button variant="ghost" onClick={() => startEdit(vendor)}>
                    Edit
                  </Button>
                  <Button variant="ghost" onClick={() => setPendingDelete(vendor)}>
                    Delete
                  </Button>
                </div>
              </div>

              {orderBuilderFor === vendor.id && (
                <OrderBuilder
                  vendor={vendor}
                  initialItem={draftItem}
                  onClose={() => {
                    setOrderBuilderFor(null)
                    if (draftItem) onDraftConsumed()
                  }}
                />
              )}
            </Card>
          ))}
        </div>
      </div>

      {draftItem && (
        <p className="text-sm text-indigo-600">
          Sourced item "{draftItem}" is ready — open a vendor's order builder to add it.
        </p>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete vendor?"
        message={`This will permanently remove ${pendingDelete?.name}.`}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
