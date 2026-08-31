import type { HTMLAttributes } from 'react'

export default function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-brand-border bg-brand-surface/90 backdrop-blur-sm p-4 shadow-lg shadow-black/40 transition-colors duration-200 hover:border-brand-gold/40 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
