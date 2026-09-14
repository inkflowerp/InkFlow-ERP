// ==============================================================================
// InkFlow ERP SaaS - Authoritative Entitlement & Feature Gating Service
// Server-side evaluation of plans, subscription state, canonical features, & quotas
// ==============================================================================

import { createAdminClient } from '../lib/supabase/admin.ts'
import { SubscriptionService } from './subscription.service.ts'
import type {
  PlanCode,
  FeatureCode,
  ConfigurableLimitType,
  TenantEntitlements,
  CompanySubscriptionRecord,
  SubscriptionPlanRecord,
  SubscriptionSnapshot,
  TenantResourceUsage,
  PaymentGatewayType,
  SubscriptionStatus,
  OverLimitSummary,
  OverLimitItem,
} from '../types/subscription.types.ts'
import {
  DEFAULT_PLANS,
  DEFAULT_TRIAL_PLAN,
  getTrialDaysRemaining,
  checkFeatureAccess,
  checkResourceLimit,
  getTenantResourceUsage,
} from '../lib/subscription/subscription-constants.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

const isValidUuid = (str?: string | null): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
}

export class EntitlementService {
  /**
   * Fetches authoritative tenant subscription and plan record from database
   */
  static async getSubscription(companyId: string, companySlug?: string): Promise<{
    subscription: CompanySubscriptionRecord
    plan: SubscriptionPlanRecord
    nextPlan: SubscriptionPlanRecord | null
  }> {
    const snapshot = await SubscriptionService.resolveTenantSubscription(companyId, companySlug)
    let plan: SubscriptionPlanRecord

    if (snapshot.status === 'unknown') {
      plan = {
        id: snapshot.planId || '',
        code: 'unknown' as PlanCode,
        name: snapshot.planName || 'Unknown',
        name_bn: snapshot.planNameBn || 'অজানা',
        description: 'Subscription plan unavailable or not found',
        price_monthly: 0,
        price_yearly: 0,
        max_users: 0,
        max_branches: 0,
        storage_gb: 0,
        monthly_orders: 0,
        max_customers: 0,
        max_products: 0,
        trial_days: 0,
        features: [],
        is_active: false,
        sort_order: 999,
      }
    } else {
      plan = await SubscriptionService.getPlanById(snapshot.planId || snapshot.planCode)
      if (!plan || (plan.id === 'sp-00' && snapshot.planCode !== 'trial')) {
        plan = await SubscriptionService.getPlanByCode(snapshot.planCode)
      }
    }

    const subRecord: CompanySubscriptionRecord = {
      id: snapshot.subscriptionId || `sub-${snapshot.tenantId}`,
      company_id: snapshot.tenantId,
      plan_id: snapshot.planId || plan.id,
      plan_code: (snapshot.planCode as PlanCode) || (plan.code as PlanCode),
      plan_name: snapshot.planName || plan.name,
      plan_name_bn: snapshot.planNameBn || plan.name_bn,
      plan_version: plan.version || 1,
      status: snapshot.status as SubscriptionStatus,
      billing_interval: snapshot.billingInterval || 'monthly',
      current_period_start: snapshot.currentPeriodStart || new Date().toISOString(),
      current_period_end: snapshot.currentPeriodEnd || snapshot.trialEndsAt || new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: snapshot.trialEndsAt,
      cancelled_at: snapshot.status === 'cancelled' ? new Date().toISOString() : null,
      cancel_at_period_end: false,
      next_plan_id: null,
      change_effective_at: null,
      grace_period_ends_at: snapshot.gracePeriodEndsAt || null,
      started_at: snapshot.trialStartsAt || snapshot.currentPeriodStart || undefined,
      payment_method_type: null,
      last_payment_reference: null,
      custom_limits_override: snapshot.customLimitsOverride,
    }

    return {
      subscription: subRecord,
      plan,
      nextPlan: null,
    }
  }

  /**
   * Resolves full entitlement payload for a tenant company
   */
  static async getTenantEntitlements(companyId: string, companySlug?: string): Promise<TenantEntitlements> {
    const admin = createAdminClient()
    const { subscription, plan, nextPlan } = await this.getSubscription(companyId, companySlug)

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

    const isTrial = subscription.status === 'trial' || subscription.status === 'trialing' || subscription.plan_code === 'trial'
    const isSuspended = subscription.status === 'suspended'
    const isPastDue = subscription.status === 'past_due'
    const isGracePeriod = subscription.status === 'grace_period'
    const totalTrialDays = plan.trial_days || 14
    const daysRemaining = isTrial ? getTrialDaysRemaining(subscription.trial_ends_at) : 0
    const isTrialExpired = isTrial && daysRemaining <= 0

    let trialProgressPercent = 0
    if (isTrial && subscription.trial_ends_at) {
      const start = new Date(subscription.started_at || subscription.current_period_start || Date.now()).getTime()
      const end = new Date(subscription.trial_ends_at).getTime()
      const now = Date.now()
      if (end > start) {
        trialProgressPercent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
      }
    }

    // Fetch authoritative usage metrics directly from database
    const usage = await this.getAuthoritativeTenantResourceUsage(
      companyId,
      plan,
      subscription.custom_limits_override
    )

    const availableGateways: PaymentGatewayType[] = ['bkash', 'nagad', 'rocket', 'sslcommerz', 'uddoktapay', 'bank_wire', 'manual']

    return {
      companyId,
      companyName,
      companySlug: resolvedSlug,
      planCode: plan.code,
      planName: plan.name,
      planNameBn: plan.name_bn || plan.name,
      planVersion: plan.version || 1,
      status: subscription.status,
      isTrial,
      isSuspended,
      isPastDue,
      isGracePeriod,
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

    // Suspended, expired, or unknown accounts have zero feature access
    if (subscription.status === 'suspended' || subscription.status === 'expired' || subscription.status === 'unknown') {
      return false
    }

    const now = Date.now()

    // Expired trials lose premium feature access
    const isTrial = subscription.status === 'trial' || subscription.status === 'trialing' || subscription.plan_code === 'trial'
    if (isTrial) {
      const daysRemaining = getTrialDaysRemaining(subscription.trial_ends_at)
      if (daysRemaining <= 0) return false
    }

    // Expired paid or cancelled subscriptions past period end / grace period lose feature access immediately
    if ((subscription.status === 'active' || subscription.status === 'cancelled' || subscription.status === 'past_due' || subscription.status === 'grace_period') && subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end).getTime()
      const graceEnd = subscription.grace_period_ends_at ? new Date(subscription.grace_period_ends_at).getTime() : 0
      if (!isNaN(periodEnd) && periodEnd < now) {
        if (!graceEnd || graceEnd < now) {
          return false
        }
      }
    }

    return checkFeatureAccess(plan.code, feature, [plan], subscription.custom_limits_override)
  }

  /**
   * Authoritative canonical feature entitlement resolver
   */
  static async hasFeatureAccess(params: {
    tenantId: string
    feature: FeatureCode
  }): Promise<boolean> {
    return await this.canUseFeature(params.tenantId, params.feature)
  }

  /**
   * Authoritative Resource Usage Calculator from Database
   */
  static async getAuthoritativeTenantResourceUsage(
    companyId: string,
    plan?: SubscriptionPlanRecord | null,
    override?: any
  ): Promise<TenantResourceUsage> {
    const admin = createAdminClient()
    let usersCount = 0
    let branchesCount = 0
    let customersCount = 0
    let productsCount = 0
    let monthlyOrdersCount = 0
    let storageUsedGb = 0

    if (companyId && companyId !== 'default' && isValidUuid(companyId)) {
      try {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const [usersRes, branchesRes, custRes, prodRes, matRes, ordersRes, storageRes] = await Promise.all([
          (admin as any)
            .from('company_users')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .or('status.eq.active,status.eq.invited,status.eq.pending,status.is.null'),
          (admin as any)
            .from('branches')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .eq('is_active', true),
          (admin as any)
            .from('customers')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId),
          (admin as any)
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId),
          (admin as any)
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId),
          (admin as any)
            .from('sales_orders')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyId)
            .gte('created_at', startOfMonth)
            .or('is_practice.is.null,is_practice.eq.false'),
          (admin as any)
            .from('saas_tenant_storage_usage')
            .select('total_bytes_used')
            .eq('company_id', companyId)
            .maybeSingle(),
        ])

        usersCount = Math.max(1, usersRes?.count ?? 1)
        branchesCount = Math.max(1, branchesRes?.count ?? 1)
        customersCount = custRes?.count ?? 0
        productsCount = (prodRes?.count ?? 0) + (matRes?.count ?? 0)
        monthlyOrdersCount = ordersRes?.count ?? 0
        if (storageRes?.data?.total_bytes_used) {
          storageUsedGb = Number((storageRes.data.total_bytes_used / (1024 * 1024 * 1024)).toFixed(2))
        } else {
          storageUsedGb = Number(((usersCount * 0.1) + (monthlyOrdersCount * 0.002)).toFixed(2))
        }
      } catch {
        const memUsage = getTenantResourceUsage(companyId, plan, override)
        return memUsage
      }
    } else {
      const memUsage = getTenantResourceUsage(companyId, plan, override)
      return memUsage
    }

    const effectivePlan = plan || DEFAULT_TRIAL_PLAN
    const isOverrideActive = override && override.is_active !== false && (!override.expires_at || new Date(override.expires_at).getTime() >= Date.now())

    const usersLimit = (isOverrideActive && override?.max_users !== undefined) ? Number(override.max_users) : Number(effectivePlan.max_users ?? 5)
    const branchesLimit = (isOverrideActive && override?.max_branches !== undefined) ? Number(override.max_branches) : Number(effectivePlan.max_branches ?? 1)
    const storageLimit = (isOverrideActive && override?.storage_gb !== undefined) ? Number(override.storage_gb) : Number(effectivePlan.storage_gb ?? 2)
    const ordersLimit = (isOverrideActive && override?.monthly_orders !== undefined) ? Number(override.monthly_orders) : Number(effectivePlan.monthly_orders ?? 100)
    const customersLimit = (isOverrideActive && override?.max_customers !== undefined) ? Number(override.max_customers) : Number(effectivePlan.max_customers ?? 200)
    const productsLimit = (isOverrideActive && override?.max_products !== undefined) ? Number(override.max_products) : Number(effectivePlan.max_products ?? 200)

    return {
      users_count: usersCount,
      users_limit: usersLimit,
      branches_count: branchesCount,
      branches_limit: branchesLimit,
      storage_used_gb: Math.min(storageLimit, storageUsedGb),
      storage_limit_gb: storageLimit,
      orders_this_month: monthlyOrdersCount,
      orders_limit: ordersLimit,
      customers_count: customersCount,
      customers_limit: customersLimit,
      products_count: productsCount,
      products_limit: productsLimit,
    }
  }

  /**
   * Checks resource quota limit with PostgreSQL atomic evaluation
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

    if (subscription.status === 'unknown') {
      return {
        allowed: false,
        limit: 0,
        current: currentCountOverride !== undefined ? currentCountOverride : 0,
        percentage: 100,
        warning: true,
        exceeded: true,
        reason: 'Subscription Unavailable: Subscription information could not be verified for this tenant.',
      }
    }

    const isTrial = subscription.status === 'trial' || subscription.status === 'trialing' || subscription.plan_code === 'trial'
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
                .or('status.eq.active,status.eq.invited,status.eq.pending,status.is.null')
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
                .eq('is_active', true)
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
                .or('is_practice.is.null,is_practice.eq.false')
              if (!error && count !== null && count !== undefined) {
                dbCount = count
              }
              break
            }
            case 'storage_gb': {
              const { data: storageRow } = await (admin as any)
                .from('saas_tenant_storage_usage')
                .select('total_bytes_used')
                .eq('company_id', companyId)
                .maybeSingle()
              if (storageRow && storageRow.total_bytes_used) {
                dbCount = Number((storageRow.total_bytes_used / (1024 * 1024 * 1024)).toFixed(2))
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

  /**
   * Resolves effective limit
   */
  static async getLimit(companyId: string, limitType: ConfigurableLimitType): Promise<number> {
    const check = await this.checkResourceQuota(companyId, limitType)
    return check.limit
  }

  /**
   * Resolves current usage
   */
  static async getUsage(companyId: string, limitType: ConfigurableLimitType): Promise<number> {
    const check = await this.checkResourceQuota(companyId, limitType)
    return check.current
  }

  /**
   * Resolves remaining capacity (-1 if unlimited)
   */
  static async getRemaining(companyId: string, limitType: ConfigurableLimitType): Promise<number> {
    const check = await this.checkResourceQuota(companyId, limitType)
    if (check.limit <= 0 || check.limit >= 99999 || check.limit === -1) return -1
    return Math.max(0, check.limit - check.current)
  }

  /**
   * Checks whether limit is unlimited
   */
  static async isUnlimited(companyId: string, limitType: ConfigurableLimitType): Promise<boolean> {
    const check = await this.checkResourceQuota(companyId, limitType)
    return check.limit <= 0 || check.limit >= 99999 || check.limit === -1
  }

  /**
   * Authoritatively checks entitlement details
   */
  static async checkEntitlement(
    companyId: string,
    feature: FeatureCode
  ): Promise<{
    allowed: boolean
    planCode: string
    status: SubscriptionStatus
    reason?: string
  }> {
    const entitlements = await this.getTenantEntitlements(companyId)
    const allowed = await this.canUseFeature(companyId, feature)

    let reason: string | undefined
    if (!allowed) {
      if (entitlements.isSuspended) {
        reason = 'Account is suspended.'
      } else if (entitlements.isTrialExpired) {
        reason = 'Trial period has expired.'
      } else if (entitlements.status === 'expired') {
        reason = 'Subscription has expired.'
      } else {
        reason = `Feature '${feature}' is not included in ${entitlements.planName}.`
      }
    }

    return {
      allowed,
      planCode: entitlements.planCode,
      status: entitlements.status,
      reason,
    }
  }

  /**
   * Checks if tenant can create an additional resource item
   */
  static async canCreate(companyId: string, resource: ConfigurableLimitType): Promise<boolean> {
    const check = await this.checkResourceQuota(companyId, resource)
    return check.allowed && !check.exceeded
  }

  /**
   * Evaluates over-limit state across all metered resources (e.g. following a downgrade or override expiry)
   * Ensures existing data is preserved while identifying resources requiring remediation.
   */
  static async getOverLimitSummary(companyId: string): Promise<OverLimitSummary> {
    const resources: ConfigurableLimitType[] = [
      'max_users',
      'max_branches',
      'storage_gb',
      'monthly_orders',
      'max_customers',
      'max_products',
    ]

    const labels: Record<ConfigurableLimitType, string> = {
      max_users: 'Active Users',
      max_branches: 'Active Branches',
      storage_gb: 'Cloud Storage (GB)',
      monthly_orders: 'Monthly Orders',
      max_customers: 'Customers',
      max_products: 'Products & Materials',
    }

    const exceededItems: OverLimitItem[] = []

    for (const resource of resources) {
      const check = await this.checkResourceQuota(companyId, resource)
      const isUnlimitedLimit = check.limit <= 0 || check.limit >= 99999 || check.limit === -1
      if (!isUnlimitedLimit && check.current > check.limit) {
        const excess = check.current - check.limit
        exceededItems.push({
          resource,
          label: labels[resource],
          currentUsage: check.current,
          allowedLimit: check.limit,
          excessCount: excess,
          remediationNote: `Your current plan allows up to ${check.limit} ${labels[resource].toLowerCase()}, but you currently have ${check.current}. Existing data is safe, but new creations are paused until you upgrade or remediate.`,
        })
      }
    }

    const isOverLimit = exceededItems.length > 0

    return {
      isOverLimit,
      exceededItems,
      suggestedAction: isOverLimit
        ? `Over-limit detected in ${exceededItems.length} resource(s). Upgrade your subscription tier to increase your limits.`
        : 'All resource usages are within allowed plan limits.',
    }
  }
}
