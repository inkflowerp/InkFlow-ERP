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
        .select('*, subscription_plans:subscription_plans!company_subscriptions_plan_id_fkey(*)')
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && sub) {
        let planRecord: SubscriptionPlanRecord | null = sub.subscription_plans

        // If join didn't populate subscription_plans, fetch from subscription_plans directly
        if (!planRecord && sub.plan_id) {
          const { data: directPlan } = await (admin as any)
            .from('subscription_plans')
            .select('*')
            .eq('id', sub.plan_id)
            .maybeSingle()
          if (directPlan) planRecord = directPlan
        }

        // If still no planRecord, fetch trial plan directly from subscription_plans
        if (!planRecord) {
          const { data: trialPlan } = await (admin as any)
            .from('subscription_plans')
            .select('*')
            .eq('code', sub.plan_code || 'trial')
            .maybeSingle()
          if (trialPlan) planRecord = trialPlan
        }

        const effectivePlan: SubscriptionPlanRecord = planRecord || DEFAULT_TRIAL_PLAN

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
          plan_id: sub.plan_id || effectivePlan.id,
          plan_code: effectivePlan.code,
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

        return { subscription: subRecord, plan: effectivePlan, nextPlan: nextPlanRecord }
      }
    } catch (err) {
      console.warn('[EntitlementService] DB subscription lookup warning:', err)
    }

    // Default: fetch active trial plan from subscription_plans table and anchor to company created_at
    let dbTrialPlan: SubscriptionPlanRecord = DEFAULT_TRIAL_PLAN
    let companyCreatedAt = nowIso

    try {
      const [{ data: trialFromDb }, { data: comp }] = await Promise.all([
        (admin as any)
          .from('subscription_plans')
          .select('*')
          .eq('code', 'trial')
          .maybeSingle(),
        (admin as any)
          .from('companies')
          .select('created_at')
          .eq('id', companyId)
          .maybeSingle(),
      ])

      if (trialFromDb) {
        dbTrialPlan = trialFromDb
      }
      if (comp?.created_at) {
        companyCreatedAt = comp.created_at
      }
    } catch {}

    const trialDuration = dbTrialPlan.trial_days || 14
    const trialEndsAt = new Date(new Date(companyCreatedAt).getTime() + trialDuration * 86400000).toISOString()

    const defaultTrialSub: CompanySubscriptionRecord = {
      id: `sub-${companyId}`,
      company_id: companyId,
      plan_id: dbTrialPlan.id,
      plan_code: 'trial',
      status: 'trial',
      billing_interval: 'monthly',
      current_period_start: companyCreatedAt,
      current_period_end: new Date(new Date(companyCreatedAt).getTime() + 30 * 86400000).toISOString(),
      trial_ends_at: trialEndsAt,
      cancelled_at: null,
      cancel_at_period_end: false,
      next_plan_id: null,
      change_effective_at: null,
      grace_period_ends_at: null,
      started_at: companyCreatedAt,
      payment_method_type: null,
      last_payment_reference: null,
      custom_limits_override: null,
    }

    return {
      subscription: defaultTrialSub,
      plan: dbTrialPlan,
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
    const daysRemaining = isTrial ? getTrialDaysRemaining(subscription.trial_ends_at) : 0
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
      const daysRemaining = getTrialDaysRemaining(subscription.trial_ends_at)
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
    reason?: string
  }> {
    const { subscription, plan } = await this.getSubscription(companyId)

    if (subscription.status === 'suspended') {
      return {
        allowed: false,
        limit: 0,
        current: 0,
        percentage: 100,
        warning: true,
        exceeded: true,
        reason: 'Account Suspended: Tenant account has been suspended by platform administration.',
      }
    }

    const isTrial = subscription.status === 'trial' || subscription.plan_code === 'trial'
    if (isTrial) {
      const daysRemaining = getTrialDaysRemaining(subscription.trial_ends_at)
      if (daysRemaining <= 0 || subscription.status === 'expired') {
        return {
          allowed: false,
          limit: 0,
          current: 0,
          percentage: 100,
          warning: true,
          exceeded: true,
          reason: 'Trial Expired: Your free trial period has ended. Please upgrade your subscription plan to continue adding records.',
        }
      }
    }

    if (subscription.status === 'expired') {
      return {
        allowed: false,
        limit: 0,
        current: 0,
        percentage: 100,
        warning: true,
        exceeded: true,
        reason: 'Subscription Expired: Your subscription has expired. Please renew your plan to continue.',
      }
    }

    let currentVal = currentCountOverride !== undefined ? currentCountOverride : 0
    if (currentCountOverride === undefined) {
      let dbCount: number | null = null
      try {
        if (companyId && companyId !== 'default') {
          const admin = createAdminClient()
          switch (limitType) {
            case 'max_users': {
              const { count, error } = await (admin as any)
                .from('company_users')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
              if (!error && count !== null && count !== undefined) {
                dbCount = count
              }
              break
            }
            case 'max_branches': {
              const { count, error } = await (admin as any)
                .from('branches')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
              if (!error && count !== null && count !== undefined) {
                dbCount = count
              }
              break
            }
            case 'max_customers': {
              const { count, error } = await (admin as any)
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
              if (!error && count !== null && count !== undefined) {
                dbCount = count
              }
              break
            }
            case 'max_products': {
              const [prodRes, matRes] = await Promise.all([
                (admin as any).from('products').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
                (admin as any).from('materials').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
              ])
              const prodCount = prodRes?.count || 0
              const matCount = matRes?.count || 0
              dbCount = prodCount + matCount
              break
            }
            case 'monthly_orders': {
              const now = new Date()
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
              const { count, error } = await (admin as any)
                .from('sales_orders')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', companyId)
                .gte('created_at', startOfMonth)
              if (!error && count !== null && count !== undefined) {
                dbCount = count
              }
              break
            }
          }
        }
      } catch {}

      if (dbCount !== null) {
        currentVal = dbCount
      } else {
        const usage = getTenantResourceUsage(companyId, plan, subscription.custom_limits_override)
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
      if (check.reason) {
        throw new Error(check.reason)
      }
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
