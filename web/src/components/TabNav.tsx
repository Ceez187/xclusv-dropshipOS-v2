import type { Tab } from '../types'

interface TabNavProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export default function TabNav({ tabs, active, onChange }: TabNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-brand-border bg-brand-surface px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'border-brand-gold text-brand-gold'
              : 'border-transparent text-brand-muted hover:text-brand-text'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
