import type { ReactNode } from 'react'

const COLORS = {
  slate: 'bg-white/10 text-brand-muted',
  blue: 'bg-blue-500/15 text-blue-300',
  purple: 'bg-purple-500/15 text-purple-300',
  amber: 'bg-amber-500/15 text-amber-300',
  green: 'bg-green-500/15 text-green-300',
  red: 'bg-red-500/15 text-red-300',
} as const

export type BadgeColor = keyof typeof COLORS

interface BadgeProps {
  color?: BadgeColor
  className?: string
  children?: ReactNode
}

export default function Badge({ color = 'slate', className = '', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[color]} ${className}`}
    >
      {children}
    </span>
  )
}
