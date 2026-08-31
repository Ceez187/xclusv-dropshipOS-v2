import { useState, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import UsageBadge from './UsageBadge'
import TabNav from './TabNav'
import LimitReachedModal from './LimitReachedModal'
import Button from './ui/Button'
import type { Tab } from '../types'

interface LayoutProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
  children?: ReactNode
}

export default function Layout({ tabs, active, onChange, children }: LayoutProps) {
  const { signOut, user } = useAuth()
  const activeTab = tabs.find((tab) => tab.id === active)
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-brand-gold/20 bg-brand-surface/80 px-4 py-3 backdrop-blur-md shadow-[0_1px_20px_-4px_var(--color-brand-gold)]">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-brand-gold-light via-brand-accent to-brand-accent2 bg-clip-text text-lg font-bold tracking-wide text-transparent">
            XCLUSV · DropshipOS
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <UsageBadge />
          <span className="hidden rounded-full border border-brand-border bg-black/30 px-3 py-1 text-xs text-brand-muted ring-1 ring-inset ring-brand-accent/20 sm:inline">
            1688 · Taobao · Basetao · AliExpress
          </span>
          <div className="relative">
            <button
              type="button"
              aria-label="Settings"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-black/30 text-lg transition-all duration-200 hover:border-brand-gold/50 hover:bg-brand-surface-hover hover:shadow-[0_0_12px_-2px_var(--color-brand-gold)]"
            >
              ⚙️
            </button>
            {settingsOpen && (
              <div className="animate-fade-in absolute right-0 z-50 mt-2 w-56 rounded-lg border border-brand-gold/20 bg-brand-surface/95 backdrop-blur-md p-3 shadow-2xl shadow-black/60">
                <p className="mb-3 truncate text-sm text-brand-muted">{user?.email}</p>
                <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <TabNav tabs={tabs} active={active} onChange={onChange} />

      <main key={active} className="animate-fade-in mx-auto max-w-6xl p-4">
        {activeTab && (
          <h1 className="mb-4 text-2xl font-bold text-brand-gold">
            {activeTab.icon && <span className="mr-2">{activeTab.icon}</span>}
            {activeTab.label}
          </h1>
        )}
        {children}
      </main>

      <LimitReachedModal />
    </div>
  )
}
