// ==============================================================================
// InkFlow ERP SaaS - Authoritative Server-Side Subscription Guard
// The single point of truth for asserting feature entitlements and resource quotas.
// Ensures zero client-side bypass across Server Actions, APIs, and background jobs.
// ==============================================================================

import { EntitlementService } from '../../services/entitlement.service.ts'
import type {
  FeatureCode,
  ConfigurableLimitType,
  TenantEntitlements,
  SubscriptionStatus,
} from '../../types/subscription.types.ts'

export class SubscriptionGuard {
  /**
   * Authoritatively asserts that a tenant has an active, non-suspended, non-expired subscription.
   * Throws an Error if access is denied.
   */
  static async requireSubscription(companyId: string): Promise<TenantEntitlements> {
    const entitlements = await EntitlementService.getTenantEntitlements(companyId)

    if (entitlements.isSuspended) {
      throw new Error(
        'Account Suspended: Access to this service has been suspended by platform administration. Please contact support.'
      )
    }

    if (entitlements.status === 'expired' || entitlements.isTrialExpired) {
      throw new Error(
        'Subscription Expired: Your plan or free trial has expired. Please upgrade or renew your subscription to continue.'
      )
    }

    return entitlements
  }

  /**
   * Authoritatively asserts that a tenant is entitled to use a specific feature module.
   * Throws an Error if feature is restricted or locked.
   */
  static async requireFeature(companyId: string, feature: FeatureCode): Promise<void> {
    await this.requireSubscription(companyId)
    await EntitlementService.enforceFeature(companyId, feature)
  }

  /**
   * Authoritatively asserts that a tenant has not exceeded their resource quota.
   * Throws an Error if quota is exhausted.
   */
  static async requireLimit(
    companyId: string,
    limitType: ConfigurableLimitType,
    delta: number = 0
  ): Promise<void> {
    await this.requireSubscription(companyId)
    const check = await EntitlementService.checkResourceQuota(companyId, limitType)
    if (!check.allowed || check.exceeded) {
      if (check.reason) {
        throw new Error(check.reason)
      }
      throw new Error(
        `Plan Quota Exceeded: Your plan allows up to ${check.limit} for ${limitType} (currently at ${check.current}). Please upgrade your plan.`
      )
    }
  }

  /**
   * Non-throwing boolean check for feature entitlement.
   */
  static async canUseFeature(companyId: string, feature: FeatureCode): Promise<boolean> {
    try {
      return await EntitlementService.canUseFeature(companyId, feature)
    } catch {
      return false
    }
  }

  /**
   * Resolves authoritative numeric or unlimited limit for a given resource.
   */
  static async getLimit(companyId: string, limitType: ConfigurableLimitType): Promise<number> {
    const check = await EntitlementService.checkResourceQuota(companyId, limitType)
    return check.limit
  }

  /**
   * Resolves current usage count for a given resource.
   */
  static async getUsage(companyId: string, limitType: ConfigurableLimitType): Promise<number> {
    const check = await EntitlementService.checkResourceQuota(companyId, limitType)
    return check.current
  }

  /**
   * Resolves remaining capacity before hitting the hard limit.
   * Returns -1 or Infinity if unlimited.
   */
  static async getRemaining(companyId: string, limitType: ConfigurableLimitType): Promise<number> {
    const check = await EntitlementService.checkResourceQuota(companyId, limitType)
    if (check.limit <= 0 || check.limit >= 99999 || check.limit === -1) {
      return -1 // Unlimited
    }
    return Math.max(0, check.limit - check.current)
  }

  /**
   * Checks whether a resource limit is configured as unlimited.
   */
  static async isUnlimited(companyId: string, limitType: ConfigurableLimitType): Promise<boolean> {
    const check = await EntitlementService.checkResourceQuota(companyId, limitType)
    return check.limit <= 0 || check.limit >= 99999 || check.limit === -1
  }

  /**
   * Evaluates feature entitlement with complete context details.
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
    const entitlements = await EntitlementService.getTenantEntitlements(companyId)
    const allowed = await EntitlementService.canUseFeature(companyId, feature)

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
}
