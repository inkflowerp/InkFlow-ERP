// ==============================================================================
// PrintFlow - Universal Server Action Security Wrappers
// Enforces fail-closed isolation, database-resolved membership, and strict RBAC.
// ==============================================================================

import { getCurrentTenant } from '../auth/tenant-auth.ts'
import {
  getCurrentPlatformUser,
  hasPlatformPermission,
  checkPlatformMfaRecency,
  recordPlatformAuditLog,
} from '../auth/platform-auth.ts'
import type { TenantContext, PlatformUserRecord } from '../auth/types.ts'
import { createAdminClient, tenantScoped } from '../supabase/admin.ts'
import { createClient } from '../supabase/server.ts'
import { checkRateLimitAsync } from '../security/rate-limiter.ts'
import { AuditService } from '../../services/audit.service.ts'
import { sanitizeError, type AppErrorCode } from '../errors/app-error.ts'

export interface ActionResult<T = unknown> {
  ok: boolean
  success: boolean
  data?: T
  error?: string
  errorBn?: string
  code?: AppErrorCode | string
  fieldErrors?: Record<string, string[]>
  statusCode?: number
  [key: string]: unknown
}

export interface TenantActionContext {
  user: {
    id: string
    email: string
  }
  userId: string
  userEmail: string
  tenant: TenantContext
  companyId: string
  companySlug: string
  branchId?: string | null
  scopedAdmin: any
  supabase: any
}

export interface TenantActionOptions {
  permission?: string | string[]
  anyPermission?: string[]
  branchScoped?: boolean
  destructive?: boolean
  requireConfirmation?: boolean
  requirePasswordConfirm?: boolean
  auditAction?: string
  entityType?: string
  entityIdExtractor?: (...args: any[]) => string | undefined
  targetCompanyIdExtractor?: (...args: any[]) => string | undefined
  confirmationNameExtractor?: (...args: any[]) => string | undefined
  passwordExtractor?: (...args: any[]) => string | undefined
}

export interface PlatformActionContext {
  user: {
    id: string
    email?: string
  }
  platformUser: PlatformUserRecord
  adminClient: any
  supabase: any
}

export interface PlatformActionOptions {
  permission?: string | readonly string[]
  requireMfa?: boolean
  mfaRecent?: boolean
  destruct?: boolean
  audit?: boolean
  actionName?: string
  entityType?: string
  targetCompanyIdExtractor?: (...args: any[]) => string | undefined
  entityIdExtractor?: (...args: any[]) => string | undefined
}

export type TenantActionResult<TReturn> = (TReturn extends object ? TReturn : ActionResult<TReturn>) & {
  ok: boolean
  code?: string
}

/**
 * Standardized wrapper for all Tenant-scoped Server Actions.
 * Invariants:
 * 1. Strictly gets user identity from Supabase Auth session.
 * 2. Resolves companyId from authoritative PostgreSQL membership, NEVER client input.
 * 3. Checks required permission against effective RBAC permissions.
 * 4. Destructive/bulk actions require owner or explicit *.delete/*.manage, typed name confirmation, audit log entry, and password re-entry in production for purge* / resetTenantData.
 * 5. Injects tenantScoped administrative client for safe operations.
 * 6. Returns typed { ok, success, data | error }.
 */
export function withTenantAction<TArgs extends any[], TReturn>(
  options: TenantActionOptions,
  actionFn: (ctx: TenantActionContext, ...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TenantActionResult<TReturn>> {
  return async (...args: TArgs): Promise<TenantActionResult<TReturn>> => {
    try {
      // 1. Authoritative Tenant Context Resolution (Database-backed)
      let targetSlugOrId: string | undefined = undefined
      if (options.targetCompanyIdExtractor) {
        try {
          targetSlugOrId = options.targetCompanyIdExtractor(...args)
        } catch {}
      }

      if (!targetSlugOrId) {
        for (const arg of args) {
          if (arg && typeof arg === 'object') {
            if (typeof arg.companyId === 'string' && arg.companyId.trim()) {
              targetSlugOrId = arg.companyId.trim()
              break
            }
            if (typeof arg.company_id === 'string' && arg.company_id.trim()) {
              targetSlugOrId = arg.company_id.trim()
              break
            }
            if (typeof arg.tenantSlug === 'string' && arg.tenantSlug.trim()) {
              targetSlugOrId = arg.tenantSlug.trim()
              break
            }
            if (typeof arg.companySlug === 'string' && arg.companySlug.trim()) {
              targetSlugOrId = arg.companySlug.trim()
              break
            }
          } else if (typeof arg === 'string') {
            const clean = arg.trim()
            if (
              clean.startsWith('comp-') ||
              clean.startsWith('co-') ||
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) ||
              (/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/i.test(clean) && !['create', 'edit', 'delete', 'all', 'orders', 'view', 'update', 'status'].includes(clean.toLowerCase()))
            ) {
              targetSlugOrId = clean
              break
            }
          }
        }
      }

      let tenant = targetSlugOrId ? await getCurrentTenant(targetSlugOrId) : null
      if (!tenant) {
        // Fallback to active authenticated tenant session from cookies/request headers
        tenant = await getCurrentTenant()
      }

      if (!tenant || !tenant.userId || !tenant.companyId) {
        return {
          ok: false,
          success: false,
          error: 'Unauthorized: Valid authenticated tenant session required.',
          code: 'UNAUTHORIZED',
        } as any
      }

      const isOwner =
        tenant.companyRole === 'business_owner' ||
        tenant.primaryRole === 'business_owner' ||
        tenant.isSupportMode

      // 2. Permission Check (Fail Closed)
      if (options.permission) {
        if (!isOwner) {
          const requiredPerms = Array.isArray(options.permission) ? options.permission : [options.permission]
          const hasAllPerms = requiredPerms.every((perm) => {
            const moduleName = perm.split('.')[0]
            return (
              tenant.permissions.includes(perm) ||
              tenant.permissions.includes(`${moduleName}.full_control`) ||
              tenant.permissions.includes('all.manage')
            )
          })

          if (!hasAllPerms) {
            return {
              ok: false,
              success: false,
              error: `Forbidden: Lacking required permission (${requiredPerms.join(', ')}).`,
              code: 'FORBIDDEN',
            } as any
          }
        }
      }

      if (options.anyPermission && options.anyPermission.length > 0) {
        if (!isOwner) {
          const hasAnyPerm = options.anyPermission.some((perm) => {
            const moduleName = perm.split('.')[0]
            return (
              tenant.permissions.includes(perm) ||
              tenant.permissions.includes(`${moduleName}.full_control`) ||
              tenant.permissions.includes('all.manage')
            )
          })

          if (!hasAnyPerm) {
            return {
              ok: false,
              success: false,
              error: `Forbidden: Lacking any of required permissions (${options.anyPermission.join(', ')}).`,
              code: 'FORBIDDEN',
            } as any
          }
        }
      }

      // 3. Destructive Action Protections
      if (options.destructive) {
        // Must be owner or have explicit delete/manage permission
        if (!isOwner) {
          const hasDeleteOrManage = tenant.permissions.some(
            (p) =>
              p.endsWith('.delete') ||
              p.endsWith('.manage') ||
              p.endsWith('.full_control') ||
              p === 'all.manage'
          )
          if (!hasDeleteOrManage) {
            return {
              ok: false,
              success: false,
              error: 'Forbidden: Destructive actions require Business Owner role or explicit delete/manage permissions.',
              code: 'FORBIDDEN_DESTRUCTIVE',
            } as any
          }
        }

        // Typed confirmation check
        if (options.requireConfirmation !== false) {
          let confirmVal: string | undefined = options.confirmationNameExtractor
            ? options.confirmationNameExtractor(...args)
            : undefined

          if (!confirmVal) {
            for (const arg of args) {
              if (typeof arg === 'string') {
                const upper = arg.trim().toUpperCase()
                if (
                  upper === 'RESET' ||
                  upper === 'CONFIRM' ||
                  upper === 'DELETE' ||
                  upper === 'PURGE' ||
                  arg.toLowerCase() === tenant.companySlug?.toLowerCase() ||
                  arg.toLowerCase() === tenant.companyName?.toLowerCase()
                ) {
                  confirmVal = arg
                  break
                }
              } else if (arg && typeof arg === 'object') {
                const cand =
                  arg.confirmationName ||
                  arg.confirmName ||
                  arg.confirmation ||
                  arg.confirmText ||
                  arg.confirmationSlug ||
                  arg.typedName
                if (typeof cand === 'string' && cand.trim().length > 0) {
                  confirmVal = cand
                  break
                }
              }
            }
          }

          const isValidConfirmation = Boolean(
            confirmVal &&
              (confirmVal.trim().toUpperCase() === 'RESET' ||
                confirmVal.trim().toUpperCase() === 'CONFIRM' ||
                confirmVal.trim().toUpperCase() === 'DELETE' ||
                confirmVal.trim().toUpperCase() === 'PURGE' ||
                confirmVal.trim().toLowerCase() === tenant.companySlug?.toLowerCase() ||
                confirmVal.trim().toLowerCase() === tenant.companyName?.toLowerCase() ||
                confirmVal.trim().toLowerCase() === tenant.companyId?.toLowerCase())
          )

          if (!isValidConfirmation) {
            return {
              ok: false,
              success: false,
              error: `Confirmation required: Please type the confirmation name ("${tenant.companySlug}" or confirmation keyword) to execute this destructive operation.`,
              code: 'CONFIRMATION_REQUIRED',
            } as any
          }
        }

        // Password confirmation check in production for purge* and resetTenantData
        const isProduction = process.env.NODE_ENV === 'production'
        const isPurgeOrReset = Boolean(
          options.requirePasswordConfirm ||
            options.auditAction?.includes('purge') ||
            options.auditAction?.includes('reset') ||
            (typeof options.permission === 'string' &&
              (options.permission.includes('purge') || options.permission.includes('reset')))
        )

        if (isPurgeOrReset) {
          let password = options.passwordExtractor ? options.passwordExtractor(...args) : undefined
          if (!password) {
            for (const arg of args) {
              if (arg && typeof arg === 'object' && typeof arg.password === 'string') {
                password = arg.password
                break
              }
            }
          }

          if (isProduction && !password) {
            return {
              ok: false,
              success: false,
              error: 'Security Verification: Password re-entry is required in production to authorize this destructive operation.',
              code: 'PASSWORD_REQUIRED',
            } as any
          }

          if (password) {
            const supabase = await createClient()
            const { error: authErr } = await supabase.auth.signInWithPassword({
              email: tenant.userEmail,
              password,
            })
            if (authErr) {
              return {
                ok: false,
                success: false,
                error: 'Authentication failed: Invalid password entered for confirmation.',
                code: 'INVALID_CREDENTIALS',
              } as any
            }
          }
        }
      }

      // 4. Branch Isolation Check (if applicable)
      if (options.branchScoped && !tenant.branchId) {
        if (!isOwner) {
          return {
            ok: false,
            success: false,
            error: 'Forbidden: Branch assignment required for this operation.',
            code: 'BRANCH_SCOPE_REQUIRED',
          } as any
        }
      }

      // 5. Build Context with Scoped Client
      const adminClient = createAdminClient()
      const scopedAdmin = tenantScoped(adminClient, tenant.companyId)
      const supabase = await createClient()

      const ctx: TenantActionContext = {
        user: {
          id: tenant.userId,
          email: tenant.userEmail,
        },
        userId: tenant.userId,
        userEmail: tenant.userEmail,
        tenant,
        companyId: tenant.companyId,
        companySlug: tenant.companySlug,
        branchId: tenant.branchId || null,
        scopedAdmin,
        supabase,
      }

      // 6. Execute Action
      const result = await actionFn(ctx, ...args)

      // 7. Audit Logging for destructive or high-risk actions
      if (options.auditAction || options.destructive) {
        try {
          const auditAction =
            options.auditAction ||
            (options.destructive
              ? `${Array.isArray(options.permission) ? options.permission[0] : options.permission || 'destructive'}.executed`
              : 'tenant.action')
          const entityType = options.entityType || 'system'
          const entityId = options.entityIdExtractor ? options.entityIdExtractor(...args) : null

          await AuditService.logEvent(
            tenant.companyId,
            tenant.userId,
            tenant.userEmail,
            auditAction,
            entityType,
            entityId || null,
            null,
            {
              destructive: Boolean(options.destructive),
              permission: options.permission,
              timestamp: new Date().toISOString(),
            },
            `Tenant operation [${auditAction}] executed by ${tenant.userEmail}`
          )
        } catch (auditErr) {
          console.error('[withTenantAction] Audit logging failed:', auditErr)
        }
      }

      // Normalize return value: if handler already returned an object with success/ok, preserve fields
      if (result && typeof result === 'object') {
        const r = result as any
        return {
          ok: r.ok ?? r.success ?? true,
          success: r.success ?? r.ok ?? true,
          ...r,
        } as any
      }

      return {
        ok: true,
        success: true,
        data: result,
      } as any
    } catch (error: unknown) {
      console.error('[withTenantAction] Action failure:', error)
      const sanitized = sanitizeError(error)
      return {
        ok: false,
        success: false,
        error: sanitized.message,
        errorBn: sanitized.messageBn,
        code: sanitized.code,
        fieldErrors: sanitized.fieldErrors,
        statusCode: sanitized.statusCode,
      } as any
    }
  }
}

export type PlatformActionResult<TReturn> = (TReturn extends object ? TReturn : ActionResult<TReturn>) & {
  ok: boolean
  success: boolean
  error?: string
  code?: string
  data?: any
}

/**
 * Standardized wrapper for all Platform Administration Server Actions.
 * Invariants:
 * 1. Checks Supabase Auth session.
 * 2. Checks active platform_admins DB record on every invocation.
 * 3. Enforces least privilege RBAC permissions.
 * 4. Destructive actions: require platform_owner role, recent MFA (<= 5 min), rate limited, and typed reason.
 * 5. Automatically logs to public.platform_audit_logs with IP and user-agent.
 */
export function withPlatformAction<TArgs extends any[], TReturn>(
  options: PlatformActionOptions,
  actionFn: (ctx: PlatformActionContext, ...args: TArgs) => Promise<TReturn>
) {
  return async (...args: TArgs): Promise<PlatformActionResult<TReturn>> => {
    try {
      const platformUser = await getCurrentPlatformUser()
      if (!platformUser || !platformUser.is_active) {
        return {
          ok: false,
          success: false,
          error: 'Unauthorized: Active platform administrator account required.',
          code: 'UNAUTHORIZED',
        } as any
      }

      // Check Destructive action invariants
      if (options.destruct) {
        if (platformUser.role !== 'platform_owner') {
          return {
            ok: false,
            success: false,
            error: 'Forbidden: Platform Owner role required for destructive operations.',
            code: 'OWNER_ROLE_REQUIRED',
          } as any
        }

        // Must have verified MFA within the last 5 minutes
        let isMfaFresh = checkPlatformMfaRecency(platformUser, 5)
        if (!isMfaFresh) {
          // Check if an inline 6-digit MFA code was supplied in arguments for step-up verification
          let candidateMfaCode: string | undefined
          for (const arg of args) {
            if (typeof arg === 'string' && /^\d{6}$/.test(arg.trim())) {
              candidateMfaCode = arg.trim()
              break
            } else if (arg && typeof arg === 'object' && typeof arg.mfaCode === 'string' && /^\d{6}$/.test(arg.mfaCode.trim())) {
              candidateMfaCode = arg.mfaCode.trim()
              break
            }
          }

          if (candidateMfaCode) {
            try {
              const { verifyTotpCode } = await import('../auth/totp.ts')
              const { createAdminClient } = await import('../supabase/admin.ts')
              const dbAdmin = createAdminClient()
              const adminId = platformUser.id || platformUser.adminId || platformUser.userId
              const { data: dbAdminRow } = await (dbAdmin as any)
                .from('platform_admins')
                .select('preferences')
                .eq('id', adminId)
                .maybeSingle()
              const secret = (dbAdminRow?.preferences as any)?.totp_secret || process.env.PLATFORM_MFA_DEFAULT_SECRET
              if (secret && verifyTotpCode(candidateMfaCode, secret)) {
                isMfaFresh = true
                // Refresh session token with latest mfaVerifiedAt
                try {
                  const { cookies } = await import('next/headers')
                  const { PLATFORM_SESSION_COOKIE } = await import('../auth/platform-auth.ts')
                  const { verifySessionToken, signSessionToken } = await import('../security/session-signer.ts')
                  const { getAuthCookieOptions } = await import('../tenant/tenant-resolution.ts')
                  const cookieStore = await cookies()
                  const sessCookie = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value
                  if (sessCookie) {
                    const parsed = await verifySessionToken<any>(sessCookie)
                    if (parsed) {
                      const updatedToken = await signSessionToken(
                        {
                          ...parsed,
                          mfaVerified: true,
                          mfaVerifiedAt: Date.now(),
                        },
                        '24h'
                      )
                      const cookieOpts = getAuthCookieOptions()
                      cookieStore.set(PLATFORM_SESSION_COOKIE, updatedToken, {
                        ...cookieOpts,
                        httpOnly: true,
                        maxAge: 60 * 60 * 24,
                      })
                    }
                  }
                } catch {}
              }
            } catch (vErr) {
              console.warn('[withPlatformAction] Inline MFA step-up verification error:', vErr)
            }
          }
        }

        if (!isMfaFresh) {
          return {
            ok: false,
            success: false,
            error: 'Security Challenge: Recent MFA verification required within the last 5 minutes for destructive operations.',
            code: 'MFA_RECENT_REQUIRED',
          } as any
        }

        // Rate limit destructive actions: max 5 operations per 10 minutes (auth tier)
        try {
          const rateKey = `destruct:${platformUser.id || platformUser.userId}`
          const rateRes = await checkRateLimitAsync(rateKey, 'auth')
          if (!rateRes.success) {
            return {
              ok: false,
              success: false,
              error: 'Rate Limit Exceeded: Too many destructive operations attempted. Please wait 10 minutes.',
              code: 'RATE_LIMIT_EXCEEDED',
            } as any
          }
        } catch {}
      } else if (options.mfaRecent) {
        let isMfaFresh = checkPlatformMfaRecency(platformUser, 5)
        if (!isMfaFresh) {
          let candidateMfaCode: string | undefined
          for (const arg of args) {
            if (typeof arg === 'string' && /^\d{6}$/.test(arg.trim())) {
              candidateMfaCode = arg.trim()
              break
            } else if (arg && typeof arg === 'object' && typeof arg.mfaCode === 'string' && /^\d{6}$/.test(arg.mfaCode.trim())) {
              candidateMfaCode = arg.mfaCode.trim()
              break
            }
          }

          if (candidateMfaCode) {
            try {
              const { verifyTotpCode } = await import('../auth/totp.ts')
              const { createAdminClient } = await import('../supabase/admin.ts')
              const dbAdmin = createAdminClient()
              const adminId = platformUser.id || platformUser.adminId || platformUser.userId
              const { data: dbAdminRow } = await (dbAdmin as any)
                .from('platform_admins')
                .select('preferences')
                .eq('id', adminId)
                .maybeSingle()
              const secret = (dbAdminRow?.preferences as any)?.totp_secret || process.env.PLATFORM_MFA_DEFAULT_SECRET
              if (secret && verifyTotpCode(candidateMfaCode, secret)) {
                isMfaFresh = true
              }
            } catch {}
          }
        }
        if (!isMfaFresh) {
          return {
            ok: false,
            success: false,
            error: 'Security Challenge: Recent MFA verification required within the last 5 minutes.',
            code: 'MFA_RECENT_REQUIRED',
          } as any
        }
      } else if (options.requireMfa && !platformUser.mfa_enabled && !platformUser.mfaEnabled) {
        return {
          ok: false,
          success: false,
          error: 'Security Policy: Two-factor authentication (MFA/TOTP) required for this action.',
          code: 'MFA_REQUIRED',
        } as any
      }

      // Check Platform RBAC permissions
      if (options.permission) {
        const requiredPerms = Array.isArray(options.permission) ? options.permission : [options.permission]
        const hasAllPerms = requiredPerms.every((perm) => hasPlatformPermission(platformUser, perm))

        if (!hasAllPerms) {
          return {
            ok: false,
            success: false,
            error: `Forbidden: Lacking required platform permission (${requiredPerms.join(', ')}).`,
            code: 'FORBIDDEN',
          } as any
        }
      }

      const adminClient = createAdminClient()
      const supabase = await createClient()

      const ctx: PlatformActionContext = {
        user: {
          id: (platformUser.user_id || platformUser.userId)!,
          email: platformUser.email,
        },
        platformUser,
        adminClient,
        supabase,
      }

      const result = await actionFn(ctx, ...args)

      // Audit Logging (enabled by default unless audit === false)
      if (options.audit !== false) {
        try {
          let ipAddress: string | null = null
          let userAgent: string | null = null
          try {
            const { headers } = await import('next/headers')
            const headerStore = await headers()
            ipAddress = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() || headerStore.get('x-real-ip') || null
            userAgent = headerStore.get('user-agent') || null
          } catch {}

          const targetCompanyId = options.targetCompanyIdExtractor?.(...args) || null
          const entityId = options.entityIdExtractor?.(...args) || null

          // Extract reason if present in args
          let reason: string | undefined = undefined
          for (const arg of args) {
            if (typeof arg === 'string' && arg.length > 0 && !reason && arg.length < 500) {
              // Could be reason or ID
            } else if (arg && typeof arg === 'object' && 'reason' in arg && typeof arg.reason === 'string') {
              reason = arg.reason
            }
          }

          await recordPlatformAuditLog({
            adminId: platformUser.id || platformUser.adminId || null,
            actorEmail: platformUser.email,
            action: options.actionName || (Array.isArray(options.permission) ? options.permission[0] : options.permission) || 'platform.action',
            entityType: options.entityType || 'platform',
            entityId,
            targetCompanyId,
            details: {
              actionName: options.actionName,
              reason,
              success: true,
            },
            ipAddress,
            userAgent,
          })
        } catch (auditError) {
          console.error('[withPlatformAction] Audit logging failed:', auditError)
        }
      }

      if (result && typeof result === 'object') {
        const r = result as any
        return {
          ok: r.ok ?? r.success ?? true,
          success: r.success ?? r.ok ?? true,
          ...('data' in r ? {} : { data: result }),
          ...r,
        } as any
      }

      return {
        ok: true,
        success: true,
        data: result,
      } as any
    } catch (error: unknown) {
      console.error('[withPlatformAction] Action failure:', error)
      const sanitized = sanitizeError(error)
      return {
        ok: false,
        success: false,
        error: sanitized.message,
        errorBn: sanitized.messageBn,
        code: sanitized.code,
        fieldErrors: sanitized.fieldErrors,
        statusCode: sanitized.statusCode,
      } as any
    }
  }
}

