import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary: 'bg-brand-gold text-black hover:bg-brand-gold-light disabled:bg-brand-gold-dark disabled:text-brand-muted',
  secondary: 'bg-brand-surface text-brand-text border border-brand-border hover:bg-brand-surface-hover',
  danger: 'bg-red-600 text-white hover:bg-red-500 disabled:bg-red-900 disabled:text-red-300',
  ghost: 'text-brand-muted hover:bg-brand-surface-hover hover:text-brand-text',
} as const

export type ButtonVariant = keyof typeof VARIANTS

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export default function Button({
  variant = 'primary',
  className = '',
  disabled = false,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
