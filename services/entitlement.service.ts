// ==============================================================================
// PrintERP SaaS - Entitlement & Feature Gating Service
// Authoritative server-side evaluation of plans, subscription state, features, & quotas
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import type {
  PlanCode,
  FeatureCode,
  ConfigurableLimitType,
  TenantEntitlements,
  CompanySubscriptionRecord,
  SubscriptionPlanRecord,
  TenantResourceUsage,
  PaymentGatewayType,
} from '../types/subscription.types.ts'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  getTrialDaysRemaining,
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
} from './subscription.service.ts'
import { GatewayRegistry } from '../lib/gateway/gateway.registry.ts'

export class EntitlementService {
  /**
   * Fetches authoritative tenant subscription record from database
   */
  static async getSubscription(companyId: string): Promise<{
    subscription: CompanySubscriptionRecord
    plan: SubscriptionPlanRecord
    nextPlan: SubscriptionPlanRecord | null
  }> {
    const admin = createAdminClient()
    const nowIso = new Date().toISOString()

    try {
      const { data: sub, error } = await (admin as any)
        .from('company_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && sub) {
        const planRecord: SubscriptionPlanRecord = sub.subscription_plans || DEFAULT_TRIAL_PLAN

        let nextPlanRecord: SubscriptionPlanRecord | null = null
        if (sub.next_plan_id) {
          const { data: np } = await (admin as any)
            .from('subscription_plans')
            .select('*')
            .eq('id', sub.next_plan_id)
            .maybeSingle()
          if (np) nextPlanRecord = np
        }

        const subRecord: CompanySubscriptionRecord = {
          id: sub.id,
          company_id: sub.company_id,
          plan_id: sub.plan_id,
          plan_code: planRecord.code,
          status: sub.status,
          billing_interval: sub.billing_interval || 'monthly',
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          trial_ends_at: sub.trial_ends_at,
          cancelled_at: sub.cancelled_at,
          cancel_at_period_end: sub.cancel_at_period_end || false,
          next_plan_id: sub.next_plan_id,
          change_effective_at: sub.change_effective_at,
          grace_period_ends_at: sub.grace_period_ends_at,
          started_at: sub.started_at,
          payment_method_type: sub.payment_method_type,
          last_payment_reference: sub.last_payment_reference,
          custom_limits_override: sub.custom_limits_override,
        }

        return { subscription: subRecord, plan: planRecord, nextPlan: nextPlanRecord }
      }
    } catch (err) {
      console.warn('[EntitlementService] DB subscription lookup fallback:', err)
    }

    // Default Fallback: 14-Day Free Evaluation Trial
    const defaultTrialSub: CompanySubscriptionRecord = {
      id: `sub-${companyId}`,
      company_id: companyId,
      plan_id: DEFAULT_TRIAL_PLAN.id,
      plan_code: 'trial',
      status: 'trial',
      billing_interval: 'monthly',
      current_period_start: nowIso,
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      cancelled_at: null,
      cancel_at_period_end: false,
      next_plan_id: null,
      change_effective_at: null,
      grace_period_ends_at: null,
      started_at: nowIso,
      payment_method_type: null,
      last_payment_reference: null,
      custom_limits_override: null,
    }

    return {
      subscription: defaultTrialSub,
      plan: DEFAULT_TRIAL_PLAN,
      nextPlan: null,
    }
  }

  /**
   * Resolves full entitlement payload for a tenant company
   */
  static async getTenantEntitlements(companyId: string, companySlug?: string): Promise<TenantEntitlements> {
    const admin = createAdminClient()
    const { subscription, plan, nextPlan } = await this.getSubscription(companyId)

    // Lookup company metadata
    let companyName = 'Tenant Workspace'
    let resolvedSlug = companySlug || 'app'

    try {
      const { data: comp } = await (admin as any)
        .from('companies')
        .select('name, slug')
        .eq('id', companyId)
        .maybeSingle()
      if (comp) {
        companyName = comp.name
        resolvedSlug = comp.slug || resolvedSlug
      }
    } catch {}

    const isTrial = subscription.status === 'trial' || subscription.plan_code === 'trial'
    const isSuspended = subscription.status === 'suspended'
    const isPastDue = subscription.status === 'past_due'
    const totalTrialDays = plan.trial_days || 14
    const daysRemaining = isTrial ? getTrialDaysRemaining(subscription.trial_ends_at, totalTrialDays) : 0
    const isTrialExpired = isTrial && daysRemaining <= 0

    const trialProgressPercent = isTrial
      ? Math.min(100, Math.round((Math.max(0, totalTrialDays - daysRemaining) / totalTrialDays) * 100))
      : 0

    // Fetch real-time usage metrics
    const usage = getTenantResourceUsage(companyId, plan, subscription.custom_limits_override)

    // Discover available enabled payment gateways dynamically
    let availableGateways: PaymentGatewayType[] = ['bkash', 'nagad', 'sslcommerz', 'bank_wire']
    try {
      const { GatewayService } = await import('./gateway.service.ts')
      const gws = await GatewayService.listGateways({ tenantId: null, category: 'payment' })
      const enabled = gws.filter((g) => g.is_enabled).map((g) => g.provider as PaymentGatewayType)
      if (enabled.length > 0) availableGateways = enabled
    } catch {}

    return {
      companyId,
      companyName,
      companySlug: resolvedSlug,
      planCode: plan.code,
      planName: plan.name,
      planNameBn: plan.name_bn || plan.name,
      status: subscription.status,
      isTrial,
      isSuspended,
      isPastDue,
      isTrialExpired,
      daysRemainingInTrial: daysRemaining,
      trialProgressPercent,
      billingInterval: subscription.billing_interval,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      nextPlanCode: nextPlan?.code || null,
      nextPlanEffectiveAt: subscription.change_effective_at || null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      features: (plan.features || []) as FeatureCode[],
      usage,
      availablePaymentGateways: availableGateways,
    }
  }

  /**
   * Evaluates whether a tenant has authorization to use a given feature
   */
  static async canUseFeature(companyId: string, feature: FeatureCode): Promise<boolean> {
    const { subscription, plan } = await this.getSubscription(companyId)

    // Suspended or expired accounts have zero premium feature access
    if (subscription.status === 'suspended' || subscription.status === 'expired') return false

    // Expired trials lose premium feature access
    const isTrial = subscription.status === 'trial' || subscription.plan_code === 'trial'
    if (isTrial) {
      const daysRemaining = getTrialDaysRemaining(subscription.trial_ends_at, plan.trial_days || 14)
      if (daysRemaining <= 0) return false
    }

    return checkFeatureAccess(plan.code, feature, [plan])
  }

  /**
   * Checks resource quota limit
   */
  static async checkResourceQuota(
    companyId: string,
    limitType: ConfigurableLimitType,
    currentCountOverride?: number
  ): Promise<{
    allowed: boolean
    limit: number
    current: number
    percentage: number
    warning: boolean
    exceeded: boolean
  }> {
    const { subscription, plan } = await this.getSubscription(companyId)
    const usage = getTenantResourceUsage(companyId, plan, subscription.custom_limits_override)

    let currentVal = currentCountOverride !== undefined ? currentCountOverride : 0
    if (currentCountOverride === undefined) {
      switch (limitType) {
        case 'max_users':
          currentVal = usage.users_count
          break
        case 'max_branches':
          currentVal = usage.branches_count
          break
        case 'storage_gb':
          currentVal = usage.storage_used_gb
          break
        case 'monthly_orders':
          currentVal = usage.orders_this_month
          break
        case 'max_customers':
          currentVal = usage.customers_count
          break
        case 'max_products':
          currentVal = usage.products_count
          break
      }
    }

    const check = checkResourceLimit(limitType, currentVal, plan, subscription.custom_limits_override)

    return {
      allowed: !check.exceeded,
      limit: check.limit,
      current: check.current,
      percentage: check.percentage,
      warning: check.warning,
      exceeded: check.exceeded,
    }
  }

  /**
   * Authoritatively enforces resource quota limit server-side, throwing an error if exceeded
   */
  static async enforceLimit(
    companyId: string,
    limitType: ConfigurableLimitType,
    currentCountOverride?: number
  ): Promise<void> {
    const check = await this.checkResourceQuota(companyId, limitType, currentCountOverride)
    if (!check.allowed) {
      const limitLabelMap: Record<ConfigurableLimitType, string> = {
        max_users: 'Users quota',
        max_branches: 'Branches quota',
        storage_gb: 'Cloud storage quota',
        monthly_orders: 'Monthly orders quota',
        max_customers: 'Customers quota',
        max_products: 'Products catalog quota',
      }
      const label = limitLabelMap[limitType] || limitType
      throw new Error(
        `Plan Limit Reached: Your current plan allows up to ${check.limit} ${label} (currently at ${check.current}). Please upgrade your subscription to continue.`
      )
    }
  }

  /**
   * Authoritatively enforces feature entitlement server-side, throwing an error if restricted
   */
  static async enforceFeature(companyId: string, feature: FeatureCode): Promise<void> {
    const allowed = await this.canUseFeature(companyId, feature)
    if (!allowed) {
      throw new Error(
        `Feature Access Restricted: '${feature}' is not included in your current subscription tier or your subscription is inactive. Please upgrade your plan to access this feature.`
      )
    }
  }
}
