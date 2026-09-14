// ==============================================================================
// InkFlow ERP SaaS - Authoritative SaaS Revenue & Telemetry Service
// Computes MRR, ARR, ARPU, Churn, Trial Conversion Rate, and Collection Rates.
// Server-side financial formulas grounded in PostgreSQL transactions & subscriptions.
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type { SaasRevenueOverview, SubscriptionPlanRecord } from '../types/subscription.types.ts'
import { DEFAULT_PLANS } from '../lib/subscription/subscription-constants.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

export class SaasRevenueService {
  /**
   * Computes comprehensive SaaS Revenue Overview
   */
  static async getRevenueOverview(): Promise<SaasRevenueOverview> {
    const admin = createAdminClient()

    let activeCount = 0
    let trialCount = 0
    let pastDueCount = 0
    let gracePeriodCount = 0
    let suspendedCount = 0
    let cancelledCount = 0

    let totalMonthlyRevenueBdt = 0
    let planDistribution = {
      starter: 0,
      business: 0,
      enterprise: 0,
      trial: 0,
    }

    let allPlans: SubscriptionPlanRecord[] = DEFAULT_PLANS
    try {
      const { data: plansData } = await (admin as any)
        .from('subscription_plans')
        .select('*')
      if (plansData && plansData.length > 0) {
        allPlans = plansData
      }
    } catch {}

    const planPriceMap = new Map<string, { monthly: number; yearly: number; code: string }>()
    for (const p of allPlans) {
      planPriceMap.set(p.id, { monthly: Number(p.price_monthly), yearly: Number(p.price_yearly), code: p.code })
      planPriceMap.set(p.code, { monthly: Number(p.price_monthly), yearly: Number(p.price_yearly), code: p.code })
    }

    let subs: any[] = []
    try {
      const { data, error } = await (admin as any)
        .from('company_subscriptions')
        .select('*')
      if (!error && data) {
        subs = data
      }
    } catch {}

    if (subs.length === 0) {
      try {
        const storedSubs = PrintERPDataStore.get<Record<string, any>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS)
        if (storedSubs) {
          subs = Object.values(storedSubs)
        }
      } catch {}
    }

    // Process each subscription
    for (const sub of subs) {
      const status = sub.status || 'trial'
      const planKey = sub.plan_id || sub.plan_code || 'trial'
      const planInfo = planPriceMap.get(planKey) || { monthly: 0, yearly: 0, code: 'trial' }
      const interval = sub.billing_interval || 'monthly'

      switch (status) {
        case 'active':
          activeCount++
          if (interval === 'yearly') {
            totalMonthlyRevenueBdt += Math.round(planInfo.yearly / 12)
          } else {
            totalMonthlyRevenueBdt += planInfo.monthly
          }
          break
        case 'trial':
        case 'trialing':
          trialCount++
          break
        case 'past_due':
          pastDueCount++
          break
        case 'grace_period':
          gracePeriodCount++
          break
        case 'suspended':
          suspendedCount++
          break
        case 'cancelled':
        case 'expired':
          cancelledCount++
          break
      }

      // Tally plan distribution
      const code = planInfo.code as keyof typeof planDistribution
      if (planDistribution[code] !== undefined) {
        planDistribution[code]++
      } else if (code === 'trial') {
        planDistribution.trial++
      } else {
        planDistribution.starter++
      }
    }

    const mrr = totalMonthlyRevenueBdt
    const arr = mrr * 12
    const arpu = activeCount > 0 ? Math.round(mrr / activeCount) : 0

    // Compute Churn Rate (cancelled / total lifetime subscriptions)
    const totalSubs = activeCount + trialCount + pastDueCount + gracePeriodCount + suspendedCount + cancelledCount
    const churnRatePct = totalSubs > 0 ? Number(((cancelledCount / totalSubs) * 100).toFixed(1)) : 0

    // Compute Trial Conversion Rate
    const convertedSubs = activeCount + pastDueCount + gracePeriodCount
    const totalTrialEvaluated = trialCount + convertedSubs
    const trialConversionRatePct = totalTrialEvaluated > 0 ? Number(((convertedSubs / totalTrialEvaluated) * 100).toFixed(1)) : 0

    // Compute Collection Rate from SaaS Invoices
    let totalInvoiced = 0
    let totalCollected = 0
    try {
      const { data: invoices } = await (admin as any)
        .from('saas_subscription_invoices')
        .select('total_amount, status')

      if (invoices && invoices.length > 0) {
        for (const inv of invoices) {
          const amt = Number(inv.total_amount || 0)
          totalInvoiced += amt
          if (inv.status === 'paid') {
            totalCollected += amt
          }
        }
      }
    } catch {}

    const collectionRatePct = totalInvoiced > 0 ? Number(((totalCollected / totalInvoiced) * 100).toFixed(1)) : 100

    return {
      mrr,
      arr,
      arpu,
      activeSubscriptionsCount: activeCount,
      trialSubscriptionsCount: trialCount,
      pastDueSubscriptionsCount: pastDueCount,
      gracePeriodSubscriptionsCount: gracePeriodCount,
      suspendedSubscriptionsCount: suspendedCount,
      cancelledSubscriptionsCount: cancelledCount,
      churnRatePct,
      trialConversionRatePct,
      collectionRatePct,
      totalRevenueBdt: totalCollected > 0 ? totalCollected : mrr,
      planDistribution,
    }
  }

  /**
   * Computes MRR specifically
   */
  static async calculateMRR(): Promise<number> {
    const overview = await this.getRevenueOverview()
    return overview.mrr
  }

  /**
   * Computes ARR specifically
   */
  static async calculateARR(): Promise<number> {
    const overview = await this.getRevenueOverview()
    return overview.arr
  }

  /**
   * Computes ARPU (Average Revenue Per User/Customer)
   */
  static async calculateARPU(): Promise<number> {
    const overview = await this.getRevenueOverview()
    return overview.arpu
  }
}
