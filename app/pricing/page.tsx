import { getPublicSubscriptionPlansAction } from '@/actions/subscription.actions'
import { PublicPricingClient } from '@/components/marketing/public-pricing-client'

export const dynamic = 'force-dynamic'

export default async function PublicPricingPage() {
  const plansRes = await getPublicSubscriptionPlansAction()
  const initialData = plansRes.data || null

  return <PublicPricingClient initialData={initialData} />
}
