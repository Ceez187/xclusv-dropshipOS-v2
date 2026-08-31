import type { Tab } from '../types'

interface TabNavProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export default function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-brand-border bg-brand-surface/60 backdrop-blur-sm px-3 py-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
            active === tab.id
              ? 'bg-gradient-to-r from-brand-gold/20 to-brand-accent/10 text-brand-gold-light shadow-[0_0_14px_-4px_var(--color-brand-gold)] ring-1 ring-inset ring-brand-gold/30'
              : 'text-brand-muted hover:bg-brand-surface-hover hover:text-brand-text'
          }`}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
