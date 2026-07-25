import { useAuth } from '../context/AuthContext'
import UsageBadge from './UsageBadge'
import TabNav from './TabNav'
import LimitReachedModal from './LimitReachedModal'
import Button from './ui/Button'

export default function Layout({ tabs, active, onChange, children }) {
  const { signOut, user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-900">DropshipOS</span>
        </div>
        <div className="flex items-center gap-4">
          <UsageBadge />
          <span className="hidden text-sm text-slate-400 sm:inline">{user?.email}</span>
          <Button variant="ghost" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <TabNav tabs={tabs} active={active} onChange={onChange} />

      <main className="mx-auto max-w-6xl p-4">{children}</main>

      <LimitReachedModal />
    </div>
  )
}
