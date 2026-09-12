import { useState } from 'react'
import Button from '../../components/ui/Button'
import type { Vendor } from '../../types'

interface OrderItem {
  name: string
  qty: number
}

function buildMessage(vendorName: string, items: OrderItem[]) {
  const lines = items
    .filter((i) => i.name.trim())
    .map((i) => `- ${i.qty}x ${i.name.trim()}`)
    .join('\n')
  return `Hi${vendorName ? ' ' + vendorName : ''}, I'd like to order:\n${lines}\n\nThanks!`
}

function waLink(contactValue: string, message: string) {
  const digits = contactValue.replace(/[^0-9]/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

interface OrderBuilderProps {
  vendor: Vendor
  initialItem?: string | null
  onClose: () => void
}

export default function OrderBuilder({ vendor, initialItem, onClose }: OrderBuilderProps) {
  const [items, setItems] = useState<OrderItem[]>(
    initialItem ? [{ name: initialItem, qty: 1 }] : [{ name: '', qty: 1 }]
  )
  const [copied, setCopied] = useState(false)

  const message = buildMessage(vendor.name, items)

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  function addRow() {
    setItems((prev) => [...prev, { name: '', qty: 1 }])
  }

  function removeRow(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-3 rounded-md border border-brand-border bg-black/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase text-brand-muted">Order builder</p>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              type="number"
              min={1}
              value={item.qty}
              onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
              className="w-16 rounded-md border border-brand-border px-2 py-1 text-sm"
            />
            <input
              type="text"
              placeholder="Item name"
              value={item.name}
              onChange={(e) => updateItem(idx, 'name', e.target.value)}
              className="flex-1 rounded-md border border-brand-border px-2 py-1 text-sm"
            />
            <button
              onClick={() => removeRow(idx)}
              className="px-2 text-sm text-brand-muted hover:text-red-400"
              aria-label="Remove item"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button onClick={addRow} className="mt-2 text-sm text-brand-gold hover:underline">
        + Add item
      </button>

      <textarea
        readOnly
        value={message}
        rows={4}
        className="mt-3 w-full rounded-md border border-brand-border bg-brand-surface px-2 py-1 text-sm"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={copyMessage}>
          {copied ? 'Copied!' : 'Copy message'}
        </Button>
        {vendor.contact_method === 'whatsapp' && vendor.contact_value && (
          <a href={waLink(vendor.contact_value, message)} target="_blank" rel="noreferrer">
            <Button variant="primary">Open WhatsApp</Button>
          </a>
        )}
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}
