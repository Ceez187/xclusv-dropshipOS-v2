import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  children?: ReactNode
  footer?: ReactNode
}

export default function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="animate-fade-in w-full max-w-md rounded-xl border border-brand-gold/20 bg-brand-surface/95 backdrop-blur-md p-6 shadow-2xl shadow-black/60 ring-1 ring-white/5">
        {title && <h2 className="mb-3 text-lg font-semibold text-brand-gold">{title}</h2>}
        <div className="text-sm text-brand-muted">{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        {!footer && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-md px-3 py-2 text-sm font-medium text-brand-muted hover:bg-brand-surface-hover hover:text-brand-text"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
