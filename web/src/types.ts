export type ContactMethod = 'whatsapp' | 'wechat' | 'facebook' | 'email'

export interface Vendor {
  id: string
  user_id: string
  name: string
  contact_method: ContactMethod
  contact_value: string | null
  notes: string | null
  created_at: string
}

export type OrderStatus =
  | 'sourcing'
  | 'ordered'
  | 'basetao_received'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface Order {
  id: string
  user_id: string
  vendor_id: string | null
  product_name: string
  status: OrderStatus
  source_cost: number | null
  sell_price: number | null
  customer_name: string | null
  tracking_notes: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  user_id: string
  name: string
  email: string | null
  total_orders: number
  ltv: number
  is_repeat: boolean
  notes: string | null
  created_at: string
}

export interface SavedItem<T = unknown> {
  id: string
  user_id: string
  kind: string
  data: T
  created_at: string
}

export interface UsageRow {
  user_id: string
  tier: string
  actions_used: number
  actions_limit: number
  rapidapi_calls_used: number
  rapidapi_calls_limit: number
  period_start: string
  updated_at: string
}

export type LimitReason = 'LIMIT_REACHED' | 'RAPIDAPI_LIMIT_REACHED'

export interface LimitReached {
  reason: LimitReason
  payload: unknown
}

// Sourcing analysis shape Claude is asked to return (see modules/SmartSourcing/prompts.ts).
export interface SourcingAnalysis {
  productName: string
  priceRangeLow: number
  priceRangeHigh: number
  suggestedRetail: number
  marginPercent: number
  suppliers: { type: string; moq: string; notes: string }[]
  searchKeywordZh: string
  searchKeywordEn: string
}

export interface LiveListing {
  url?: string
  link?: string
  title: string
  price: string
  image?: string
  rating?: string | number
}

export interface Listing {
  title: string
  description: string
  tags: string[]
}

export interface AdScript {
  angle: string
  script: string
}

export interface Tab {
  id: string
  label: string
  icon?: string
}

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  sort_order: number
  created_at: string
}

export interface FaqItem {
  id: string
  question: string
  answer: string
  sort_order: number
  created_at: string
}
