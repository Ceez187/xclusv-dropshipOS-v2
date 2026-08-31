import type { ButtonHTMLAttributes } from 'react'

const VARIANTS = {
  primary:
    'bg-gradient-to-br from-brand-gold-light via-brand-gold to-brand-gold-dark text-black shadow-[0_0_0_rgba(0,0,0,0)] hover:shadow-[0_0_20px_-2px_var(--color-brand-gold)] hover:brightness-110 disabled:from-brand-gold-dark disabled:via-brand-gold-dark disabled:to-brand-gold-dark disabled:text-brand-muted disabled:hover:shadow-none disabled:hover:brightness-100',
  secondary:
    'bg-brand-surface/80 backdrop-blur-sm text-brand-text border border-brand-border hover:border-brand-accent/60 hover:shadow-[0_0_16px_-4px_var(--color-brand-accent)] hover:bg-brand-surface-hover',
  danger:
    'bg-gradient-to-br from-red-500 to-red-700 text-white hover:shadow-[0_0_16px_-2px_var(--color-red-500)] hover:brightness-110 disabled:from-red-900 disabled:to-red-900 disabled:text-red-300 disabled:hover:shadow-none',
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
