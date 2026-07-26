import { useUsage } from '../context/UsageContext'
import Modal from './ui/Modal'
import Button from './ui/Button'
import type { LimitReason } from '../types'

const COPY: Record<LimitReason, { title: string; body: string }> = {
  LIMIT_REACHED: {
    title: "You've hit your monthly action limit",
    body: "You've used all of your included actions for this billing period. Upgrade your plan to keep generating listings, pricing, ad scripts, and sourcing analysis.",
  },
  RAPIDAPI_LIMIT_REACHED: {
    title: 'Live listings quota reached',
    body: "You've used all of your live-search calls for this cycle. Smart Sourcing will keep working using AI analysis and search-link fallback only.",
  },
}

export default function LimitReachedModal() {
  const { limitReached, clearLimitReached } = useUsage()

  if (!limitReached) return null

  const copy = COPY[limitReached.reason] ?? {
    title: 'Limit reached',
    body: 'This action is temporarily unavailable.',
  }

  return (
    <Modal
      open
      onClose={clearLimitReached}
      title={copy.title}
      footer={
        <Button variant="primary" onClick={clearLimitReached}>
          Got it
        </Button>
      }
    >
      {copy.body}
    </Modal>
  )
}
