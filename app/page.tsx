import { getPublicSubscriptionPlansAction } from '@/actions/subscription.actions'
import { MarketingHomeClient } from '@/components/marketing/marketing-home-client'

export const dynamic = 'force-dynamic'

export default async function MarketingHomePage() {
  const plansRes = await getPublicSubscriptionPlansAction()
  const initialData = plansRes.data || null

  return <MarketingHomeClient initialData={initialData} />
}
