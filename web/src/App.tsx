import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import { UsageProvider } from './context/UsageContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import HowItWorks from './modules/HowItWorks'
import SmartSourcing from './modules/SmartSourcing'
import Vendors from './modules/Vendors'
import ListingGenerator from './modules/ListingGenerator'
import PricingCalculator from './modules/PricingCalculator'
import AdScriptGenerator from './modules/AdScriptGenerator'
import OrderTracker from './modules/OrderTracker'
import CustomerIntelligence from './modules/CustomerIntelligence'
import type { Tab } from './types'

const TABS: Tab[] = [
  { id: 'how-it-works', label: 'How It Works', icon: 'ℹ️' },
  { id: 'sourcing', label: 'Smart Sourcing', icon: '🔍' },
  { id: 'vendors', label: 'Vendors', icon: '🤝' },
  { id: 'listings', label: 'Listings', icon: '📝' },
  { id: 'pricing', label: 'Pricing', icon: '💰' },
  { id: 'ads', label: 'Ad Scripts', icon: '🎬' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'customers', label: 'Customers', icon: '👥' },
]

function Workspace() {
  const [active, setActive] = useState<string>(TABS[0].id)
  // Smart Sourcing's "Send to Vendor Order Builder" needs to hand an item
  // name to the Vendors tab and switch to it — the only cross-module state.
  const [vendorDraftItem, setVendorDraftItem] = useState<string | null>(null)

  function sendToVendors(itemName: string) {
    setVendorDraftItem(itemName)
    setActive('vendors')
  }

  return (
    <UsageProvider>
      <Layout tabs={TABS} active={active} onChange={setActive}>
        {active === 'how-it-works' && <HowItWorks onCollapse={() => setActive('sourcing')} />}
        {active === 'sourcing' && <SmartSourcing onSendToVendors={sendToVendors} />}
        {active === 'vendors' && (
          <Vendors draftItem={vendorDraftItem} onDraftConsumed={() => setVendorDraftItem(null)} />
        )}
        {active === 'listings' && <ListingGenerator />}
        {active === 'pricing' && <PricingCalculator />}
        {active === 'ads' && <AdScriptGenerator />}
        {active === 'orders' && <OrderTracker />}
        {active === 'customers' && <CustomerIntelligence />}
      </Layout>
    </UsageProvider>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-bg text-sm text-brand-muted">
        Loading…
      </div>
    )
  }

  return session ? <Workspace /> : <AuthPage />
}
