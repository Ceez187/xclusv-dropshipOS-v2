import type { ReactNode } from 'react'
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

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border bg-brand-surface px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-wide text-brand-gold">XCLUSV · DropshipOS</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <UsageBadge />
          <span className="hidden text-sm text-brand-muted sm:inline">{user?.email}</span>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <TabNav tabs={tabs} active={active} onChange={onChange} />

      <main className="mx-auto max-w-6xl p-4">
        {activeTab && <h1 className="mb-4 text-2xl font-bold text-brand-gold">{activeTab.label}</h1>}
        {children}
      </main>

      <LimitReachedModal />
    </div>
  )
}
