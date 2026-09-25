// ==============================================================================
// PrintERP / InkFlow SaaS - Authoritative Authentication & Tenant Authorization Service
// Manages Supabase Auth, registration with email OTP/link gating, anti-enumeration
// password reset, platform vs tenant isolation, and session establishment.
// ==============================================================================

import { createClient as createBrowserSupabaseClient } from '../lib/supabase/client.ts'
import { createClient as createServerSupabaseClient } from '../lib/supabase/server.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import type { ApiResponse } from '../types/common.types.ts'
import { resolveTenantRole, TENANT_SESSION_COOKIE, type TenantSessionData, type TenantRole } from '../lib/auth/types.ts'
import type { PrimaryRole } from '../types/rbac.types.ts'
import { MODULE_ACTION_SPECS } from '../types/rbac.types.ts'
import { TenantRepository } from '../lib/repositories/tenant.repository.ts'
import { AuthEmailService } from './auth-email.service.ts'
import { AuditService } from './audit.service.ts'
import { isTestEnvironment } from '../lib/security/runtime-env.ts'
import { getTenantLink } from '../lib/tenant/tenant-url.ts'
import {
  parseAndNormalizePhone,
  classifyLoginIdentifier,
  isValidUsernameFormat,
  sanitizeUsername,
} from '../lib/auth/identifier-helper.ts'

export interface SignInResultData {
  userId: string
  session: TenantSessionData
  requiresOnboarding?: boolean
}

export interface IdentifierUniquenessCheckParams {
  email?: string | null
  username?: string | null
  phone?: string | null
  employeeIdNumber?: string | null
  excludeUserId?: string | null
  excludeEmployeeId?: string | null
  companyId?: string | null
}

export interface IdentifierUniquenessResult {
  available: boolean
  conflictField?: 'email' | 'username' | 'phone' | 'employee_id_number'
  error?: string
  errorBn?: string
}

async function getSupabaseAuthClient() {
  if (typeof window === 'undefined') {
    try {
      return await createServerSupabaseClient()
    } catch {
      return createBrowserSupabaseClient()
    }
  }
  return createBrowserSupabaseClient()
}

export class AuthService {
  /**
   * Resolves any login identifier (email, username, mobile, employee ID badge)
   * to the authoritative registered Supabase Auth email.
   */
  static async resolveLoginEmail(identifier: string): Promise<string> {
    const classification = classifyLoginIdentifier(identifier)

    // Direct email match
    if (classification.type === 'email') {
      return classification.normalized
    }

    const admin = createAdminClient()

    // 1. Phone number resolution
    if (classification.type === 'phone' && classification.phoneVariants) {
      const candidates = classification.phoneVariants.candidates

      // Check user_profiles
      try {
        const { data: prof } = await (admin as any)
          .from('user_profiles')
          .select('email, phone')
          .in('phone', candidates)
          .limit(1)
          .maybeSingle()
        if (prof?.email) return prof.email.toLowerCase()
      } catch {}

      // Check employees
      try {
        const { data: emp } = await (admin as any)
          .from('employees')
          .select('id, email, mobile, portal_credentials')
          .in('mobile', candidates)
          .limit(1)
          .maybeSingle()

        if (emp) {
          const creds = emp.portal_credentials as any
          if (creds?.email) return creds.email.toLowerCase()
          if (emp.email) return emp.email.toLowerCase()
        }
      } catch {}

      // Test environment / fallback data store
      try {
        const { PrintERPDataStore, STORAGE_KEYS } = await import('../lib/db/data-store.ts')
        const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
        const empFound = emps.find((e) => candidates.includes(e.mobile))
        if (empFound?.portal_credentials?.email) return empFound.portal_credentials.email.toLowerCase()
        if (empFound?.email) return empFound.email.toLowerCase()

        const users = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []
        const userFound = users.find((u) => candidates.includes(u.phone))
        if (userFound?.email) return userFound.email.toLowerCase()
      } catch {}
    }

    // 2. Username or Employee Badge resolution
    if (classification.type === 'username') {
      const norm = classification.normalized

      // Check user_profiles (username column)
      try {
        const { data: prof } = await (admin as any)
          .from('user_profiles')
          .select('email, username')
          .ilike('username', norm)
          .limit(1)
          .maybeSingle()
        if (prof?.email) return prof.email.toLowerCase()
      } catch {}

      // Check employees (employee_id_number or portal_credentials.username)
      try {
        const { data: empBadge } = await (admin as any)
          .from('employees')
          .select('id, email, mobile, portal_credentials')
          .ilike('employee_id_number', norm)
          .limit(1)
          .maybeSingle()

        if (empBadge) {
          const creds = empBadge.portal_credentials as any
          if (creds?.email) return creds.email.toLowerCase()
          if (empBadge.email) return empBadge.email.toLowerCase()
        }

        const { data: empUser } = await (admin as any)
          .from('employees')
          .select('id, email, mobile, portal_credentials')
          .filter('portal_credentials->>username', 'ilike', norm)
          .limit(1)
          .maybeSingle()

        if (empUser) {
          const creds = empUser.portal_credentials as any
          if (creds?.email) return creds.email.toLowerCase()
          if (empUser.email) return empUser.email.toLowerCase()
        }
      } catch {}

      // Test environment / fallback data store
      try {
        const { PrintERPDataStore, STORAGE_KEYS } = await import('../lib/db/data-store.ts')
        const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
        const empFound = emps.find(
          (e) =>
            e.employee_id_number?.toLowerCase() === norm ||
            e.portal_credentials?.username?.toLowerCase() === norm
        )
        if (empFound?.portal_credentials?.email) return empFound.portal_credentials.email.toLowerCase()
        if (empFound?.email) return empFound.email.toLowerCase()

        const users = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []
        const userFound = users.find((u) => u.username?.toLowerCase() === norm)
        if (userFound?.email) return userFound.email.toLowerCase()
      } catch {}
    }

    return classification.normalized
  }

  /**
   * Authoritative duplicate check across user accounts, employee profiles, and credentials.
   * Ensures no duplicate email, username, or phone number exists anywhere in the application.
   */
  static async validateIdentifierUniqueness(
    params: IdentifierUniquenessCheckParams
  ): Promise<IdentifierUniquenessResult> {
    const admin = createAdminClient()

    // 1. Check Email Uniqueness
    if (params.email?.trim()) {
      const email = params.email.trim().toLowerCase()

      // A. Check user_profiles
      try {
        let q = (admin as any)
          .from('user_profiles')
          .select('id, email')
          .ilike('email', email)
        if (params.excludeUserId) {
          q = q.neq('id', params.excludeUserId)
        }
        const { data: prof } = await q.limit(1).maybeSingle()
        if (prof) {
          return {
            available: false,
            conflictField: 'email',
            error: `Email address '${email}' is already registered to another user account.`,
            errorBn: `ইমেইল '${email}' ইতিমধ্যে অন্য ব্যবহারকারী অ্যাকাউন্টে নিবন্ধিত আছে।`,
          }
        }
      } catch {}

      // B. Check employees (email or portal_credentials.email)
      try {
        let q = (admin as any)
          .from('employees')
          .select('id, email, portal_credentials')
          .or(`email.ilike.${email},portal_credentials->>email.ilike.${email}`)
        if (params.excludeEmployeeId) {
          q = q.neq('id', params.excludeEmployeeId)
        }
        const { data: emp } = await q.limit(1).maybeSingle()
        if (emp) {
          return {
            available: false,
            conflictField: 'email',
            error: `Email address '${email}' is already associated with another employee record.`,
            errorBn: `ইমেইল '${email}' ইতিমধ্যে অন্য একজন কর্মীর রেকর্ডে সংরক্ষিত আছে।`,
          }
        }
      } catch {}

      // C. Check PrintERPDataStore in test/mock environment
      try {
        const { PrintERPDataStore, STORAGE_KEYS } = await import('../lib/db/data-store.ts')
        const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
        const empConflict = emps.find(
          (e) =>
            e.id !== params.excludeEmployeeId &&
            (e.email?.toLowerCase() === email || e.portal_credentials?.email?.toLowerCase() === email)
        )
        if (empConflict) {
          return {
            available: false,
            conflictField: 'email',
            error: `Email address '${email}' is already in use by another employee.`,
            errorBn: `ইমেইল '${email}' ইতিমধ্যে অন্য কর্মীর অ্যাকাউন্টে ব্যবহৃত হচ্ছে।`,
          }
        }

        const users = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []
        const userConflict = users.find((u) => u.id !== params.excludeUserId && u.email?.toLowerCase() === email)
        if (userConflict) {
          return {
            available: false,
            conflictField: 'email',
            error: `Email address '${email}' is already registered.`,
            errorBn: `ইমেইল '${email}' ইতিমধ্যে নিবন্ধিত আছে।`,
          }
        }
      } catch {}
    }

    // 2. Check Username Uniqueness
    if (params.username?.trim()) {
      const username = sanitizeUsername(params.username)
      const formatCheck = isValidUsernameFormat(username)
      if (!formatCheck.valid) {
        return {
          available: false,
          conflictField: 'username',
          error: formatCheck.reason || 'Invalid username format.',
          errorBn: 'ইউজারনেমের ফরম্যাট সঠিক নয় (ন্যূনতম ৩ অক্ষর, বর্ণ ও সংখ্যা)।',
        }
      }

      // A. Check user_profiles
      try {
        let q = (admin as any)
          .from('user_profiles')
          .select('id, username')
          .ilike('username', username)
        if (params.excludeUserId) {
          q = q.neq('id', params.excludeUserId)
        }
        const { data: prof } = await q.limit(1).maybeSingle()
        if (prof) {
          return {
            available: false,
            conflictField: 'username',
            error: `Username '${username}' is already taken. Please choose another username.`,
            errorBn: `ইউজারনেম '${username}' ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য একটি ইউজারনেম নির্বাচন করুন।`,
          }
        }
      } catch {}

      // B. Check employees portal_credentials.username
      try {
        let q = (admin as any)
          .from('employees')
          .select('id, portal_credentials')
          .filter('portal_credentials->>username', 'ilike', username)
        if (params.excludeEmployeeId) {
          q = q.neq('id', params.excludeEmployeeId)
        }
        const { data: emp } = await q.limit(1).maybeSingle()
        if (emp) {
          return {
            available: false,
            conflictField: 'username',
            error: `Username '${username}' is already taken by another employee portal login.`,
            errorBn: `ইউজারনেম '${username}' ইতিমধ্যে অন্য একজন কর্মীর জন্য ব্যবহৃত হচ্ছে।`,
          }
        }
      } catch {}

      // C. Check PrintERPDataStore in test/mock environment
      try {
        const { PrintERPDataStore, STORAGE_KEYS } = await import('../lib/db/data-store.ts')
        const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
        const empConflict = emps.find(
          (e) =>
            e.id !== params.excludeEmployeeId &&
            e.portal_credentials?.username?.toLowerCase() === username
        )
        if (empConflict) {
          return {
            available: false,
            conflictField: 'username',
            error: `Username '${username}' is already taken.`,
            errorBn: `ইউজারনেম '${username}' ইতিমধ্যে ব্যবহৃত হচ্ছে।`,
          }
        }

        const users = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []
        const userConflict = users.find((u) => u.id !== params.excludeUserId && u.username?.toLowerCase() === username)
        if (userConflict) {
          return {
            available: false,
            conflictField: 'username',
            error: `Username '${username}' is already taken.`,
            errorBn: `ইউজারনেম '${username}' ইতিমধ্যে ব্যবহৃত হচ্ছে।`,
          }
        }
      } catch {}
    }

    // 3. Check Phone Uniqueness
    if (params.phone?.trim()) {
      const parsed = parseAndNormalizePhone(params.phone)
      if (parsed) {
        const candidates = parsed.candidates

        // A. Check user_profiles
        try {
          let q = (admin as any)
            .from('user_profiles')
            .select('id, phone')
            .in('phone', candidates)
          if (params.excludeUserId) {
            q = q.neq('id', params.excludeUserId)
          }
          const { data: prof } = await q.limit(1).maybeSingle()
          if (prof) {
            return {
              available: false,
              conflictField: 'phone',
              error: `Phone number '${params.phone}' is already associated with an existing user account.`,
              errorBn: `মোবাইল নম্বর '${params.phone}' ইতিমধ্যে অন্য একটি ব্যবহারকারী অ্যাকাউন্টে যুক্ত আছে।`,
            }
          }
        } catch {}

        // B. Check employees mobile
        try {
          let q = (admin as any)
            .from('employees')
            .select('id, mobile')
            .in('mobile', candidates)
          if (params.excludeEmployeeId) {
            q = q.neq('id', params.excludeEmployeeId)
          }
          const { data: emp } = await q.limit(1).maybeSingle()
          if (emp) {
            return {
              available: false,
              conflictField: 'phone',
              error: `Phone number '${params.phone}' is already registered to another employee.`,
              errorBn: `মোবাইল নম্বর '${params.phone}' ইতিমধ্যে অন্য একজন কর্মীর জন্য সংরক্ষিত আছে।`,
            }
          }
        } catch {}

        // C. Check PrintERPDataStore in test/mock environment
        try {
          const { PrintERPDataStore, STORAGE_KEYS } = await import('../lib/db/data-store.ts')
          const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
          const empConflict = emps.find(
            (e) => e.id !== params.excludeEmployeeId && candidates.includes(e.mobile)
          )
          if (empConflict) {
            return {
              available: false,
              conflictField: 'phone',
              error: `Phone number '${params.phone}' is already registered to another employee.`,
              errorBn: `মোবাইল নম্বর '${params.phone}' ইতিমধ্যে অন্য একজন কর্মীর জন্য ব্যবহৃত হচ্ছে।`,
            }
          }

          const users = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []
          const userConflict = users.find((u) => u.id !== params.excludeUserId && candidates.includes(u.phone))
          if (userConflict) {
            return {
              available: false,
              conflictField: 'phone',
              error: `Phone number '${params.phone}' is already registered.`,
              errorBn: `মোবাইল নম্বর '${params.phone}' ইতিমধ্যে অন্য অ্যাকাউন্টে যুক্ত আছে।`,
            }
          }
        } catch {}
      }
    }

    // 4. Check Employee ID Number (within company)
    if (params.employeeIdNumber?.trim() && params.companyId) {
      const code = params.employeeIdNumber.trim()
      try {
        let q = (admin as any)
          .from('employees')
          .select('id, employee_id_number')
          .eq('company_id', params.companyId)
          .ilike('employee_id_number', code)
        if (params.excludeEmployeeId) {
          q = q.neq('id', params.excludeEmployeeId)
        }
        const { data: emp } = await q.limit(1).maybeSingle()
        if (emp) {
          return {
            available: false,
            conflictField: 'employee_id_number',
            error: `Employee ID badge number '${code}' already exists in this company.`,
            errorBn: `কর্মীর আইডি ব্যাজ নম্বর '${code}' এই প্রতিষ্ঠানে ইতিমধ্যে বিদ্যমান।`,
          }
        }
      } catch {}
    }

    return { available: true }
  }

  /**
   * Browser / Client side sign in with Supabase Auth & authoritative database tenant resolution
   * Accepts Email, Username, or Phone Number as the primary identifier.
   */
  static async signIn(
    email: string,
    password: string,
    targetCompanySlug?: string
  ): Promise<ApiResponse<SignInResultData>> {
    try {
      const normalizedInput = email.trim()

      if (!normalizedInput || !password) {
        return { success: false, error: 'Email, username, or phone and password are required' }
      }

      // Resolve identifier (email, username, phone, or badge) to registered auth email
      const resolvedEmail = await this.resolveLoginEmail(normalizedInput)
      const normalizedEmail = resolvedEmail.toLowerCase()

      const supabase = await getSupabaseAuthClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password,
      })

      if (authError || !authData?.user) {
        return {
          success: false,
          error: authError?.message || 'Invalid email or password',
        }
      }

      const user = authData.user

      // 1. Email Verification Gating: Unconfirmed users must verify their email before tenant access
      if (!isTestEnvironment()) {
        const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at)
        if (!isEmailConfirmed) {
          await supabase.auth.signOut()
          return {
            success: false,
            error: 'Please verify your email address before signing in. Check your inbox for the 6-digit verification code.',
          }
        }
      }

      const admin = createAdminClient()

      // 2. HARD SECURITY BOUNDARY: Platform Administrator accounts are strictly forbidden from logging into tenant portal
      const { data: platformAdmin } = await (admin as any)
        .from('platform_admins')
        .select('id, is_active')
        .or(`user_id.eq.${user.id},email.ilike.${normalizedEmail}`)
        .eq('is_active', true)
        .maybeSingle()

      if (platformAdmin) {
        await supabase.auth.signOut()
        if (typeof document !== 'undefined') {
          document.cookie = `${TENANT_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`
        }
        return {
          success: false,
          error: 'This account does not have access to the business workspace.',
        }
      }

      // 3. Resolve tenant membership and calculate effective permissions across responsibilities
      let membership = await TenantRepository.resolveUserMembership(user.id, targetCompanySlug)

      if (!membership) {
        // Check if there is any company membership for this user
        membership = await TenantRepository.resolveUserMembership(user.id)
      }

      if (!membership) {
        // User is authenticated in Supabase Auth but has no active tenant membership yet (e.g. freshly verified tenant owner)
        const { data: profile } = await (admin as any)
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        const ownerPermissions = Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
          spec.actions.map((act) => `${mod}.${act}`)
        )

        const sessionData: TenantSessionData = {
          userId: user.id,
          userEmail: user.email || normalizedEmail,
          fullName: profile?.full_name || user.user_metadata?.full_name || normalizedEmail.split('@')[0],
          fullNameBn: profile?.full_name_bn || null,
          phone: profile?.phone || user.user_metadata?.phone || null,
          companyId: '',
          companySlug: '',
          companyName: 'New Organization',
          companyNameBn: 'নতুন প্রতিষ্ঠান',
          branchId: 'br-main',
          branchName: 'Main Branch',
          role: 'business_owner',
          primaryRole: 'business_owner',
          responsibilities: ['business_owner'],
          permissions: ownerPermissions,
          loginTime: new Date().toISOString(),
          token: authData.session?.access_token || `auth-${user.id}`,
        }

        if (typeof document !== 'undefined') {
          const encoded = encodeURIComponent(JSON.stringify(sessionData))
          const maxAge = 60 * 60 * 24 * 7 // 7 days
          document.cookie = `${TENANT_SESSION_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax;`
          window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: sessionData }))
        }

        return {
          success: true,
          data: {
            userId: user.id,
            session: sessionData,
            requiresOnboarding: true,
          },
          message: 'Please complete company onboarding to activate your workspace.',
        }
      }

      const { company, companyUser, effectivePermissions, primaryRole } = membership

      if (companyUser.status === 'disabled') {
        await supabase.auth.signOut()
        return {
          success: false,
          error: 'Your account has been disabled by your administrator. Access is revoked.',
        }
      }

      const isOwner = (company as any)?.owner_id === user.id || primaryRole === 'business_owner'
      const tenantRole: TenantRole = resolveTenantRole(primaryRole, companyUser.responsibilities, isOwner)

      const sessionData: TenantSessionData = {
        userId: user.id,
        userEmail: user.email || normalizedEmail,
        fullName: companyUser.profile?.full_name || normalizedEmail.split('@')[0],
        fullNameBn: companyUser.profile?.full_name_bn || null,
        phone: companyUser.profile?.phone || null,
        companyId: company.id,
        companySlug: company.slug,
        companyName: company.name,
        companyNameBn: company.name_bn || company.name,
        branchId: companyUser.branch_id || 'br-main',
        branchName: companyUser.branch?.name || 'Main Branch',
        role: tenantRole,
        primaryRole: primaryRole as PrimaryRole,
        responsibilities: companyUser.responsibilities || [primaryRole],
        permissions: effectivePermissions,
        loginTime: new Date().toISOString(),
        token: authData.session?.access_token || `auth-${user.id}`,
      }

      // Store session in Cookie (Browser environment)
      if (typeof document !== 'undefined') {
        const encoded = encodeURIComponent(JSON.stringify(sessionData))
        const maxAge = 60 * 60 * 24 * 7 // 7 days
        document.cookie = `${TENANT_SESSION_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax;`
        window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: sessionData }))
      }

      return {
        success: true,
        data: {
          userId: user.id,
          session: sessionData,
          requiresOnboarding: false,
        },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Authentication failed',
      }
    }
  }

  /**
   * Authoritative Supabase Auth sign up with pending verification state and email dispatch
   */
  static async signUp(
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    appUrl?: string
  ): Promise<ApiResponse<{ userId: string; requiresVerification: boolean; email: string }>> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const admin = createAdminClient()
      let userId: string | null = null

      // Check phone uniqueness before creating or updating accounts
      if (phone?.trim()) {
        const phoneCheck = await this.validateIdentifierUniqueness({
          phone: phone.trim(),
        })
        if (!phoneCheck.available && phoneCheck.conflictField === 'phone') {
          return {
            success: false,
            error: phoneCheck.error || 'This phone number is already registered to another account.',
          }
        }
      }

      // Check if email already belongs to an existing employee record
      try {
        const { data: empWithEmail } = await (admin as any)
          .from('employees')
          .select('id, email, portal_credentials')
          .or(`email.ilike.${normalizedEmail},portal_credentials->>email.ilike.${normalizedEmail}`)
          .limit(1)
          .maybeSingle()
        if (empWithEmail) {
          return {
            success: false,
            error: 'An account with this email address is already associated with an employee record. Please sign in.',
          }
        }
      } catch {}

      try {
        const { PrintERPDataStore, STORAGE_KEYS } = await import('../lib/db/data-store.ts')
        const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
        const empConflict = emps.find(
          (e) => (e.email?.toLowerCase() === normalizedEmail || e.portal_credentials?.email?.toLowerCase() === normalizedEmail)
        )
        if (empConflict) {
          return {
            success: false,
            error: 'An account with this email address is already associated with an employee record. Please sign in.',
          }
        }
      } catch {}

      // 1. Check if user already exists in user_profiles
      let existingProfile: any = null
      try {
        const { data: prof } = await (admin as any)
          .from('user_profiles')
          .select('id, email, full_name, phone, is_active')
          .eq('email', normalizedEmail)
          .maybeSingle()
        if (prof) existingProfile = prof
      } catch {}

      if (existingProfile?.id) {
        // Check if user belongs to an active company
        let hasActiveCompany = false
        try {
          const { data: memberships } = await (admin as any)
            .from('company_users')
            .select('id, status, company_id')
            .eq('user_id', existingProfile.id)
            .eq('status', 'active')
            .limit(1)
          if (memberships && memberships.length > 0) {
            hasActiveCompany = true
          }
        } catch {}

        if (hasActiveCompany) {
          return {
            success: false,
            error: 'An account with this email address has already been registered with an active organization. Please sign in.',
          }
        }

        // User exists in auth but has no active company (e.g. previous company was deleted or onboarding incomplete)
        // Allow them to reuse their account: update password & profile, and re-dispatch verification
        userId = existingProfile.id
        if (userId) {
          try {
            await admin.auth.admin.updateUserById(userId, {
              password,
              user_metadata: {
                full_name: fullName,
                phone: phone || null,
                preferred_locale: 'bn',
              },
            })
          } catch (updateErr) {
            console.warn('[AuthService] updateUserById error:', updateErr)
          }
        }
      } else {
        // 2. Create user in Supabase Auth via Admin client (email_confirm: false until verified)
        const { data: newAuthData, error: createAuthErr } = await admin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: false, // Must verify email before activation
          user_metadata: {
            full_name: fullName,
            phone: phone || null,
            preferred_locale: 'bn',
          },
        })

        if (createAuthErr || !newAuthData?.user) {
          if (isTestEnvironment()) {
            userId = `test-user-${normalizedEmail}`
          } else {
            // If user already registered in Supabase Auth but not in user_profiles
            if (createAuthErr?.message?.toLowerCase().includes('already registered')) {
              return {
                success: false,
                error: 'An account with this email already exists. Please sign in to your workspace or complete setup.',
              }
            }

            return {
              success: false,
              error: createAuthErr?.message || 'Registration failed',
            }
          }
        } else {
          userId = newAuthData.user.id
        }
      }

      // 2. Persist initial user_profiles record in pending state (is_active: false until verified)
      if (userId) {
        try {
          await (admin as any).from('user_profiles').upsert({
            id: userId,
            email: normalizedEmail,
            full_name: fullName,
            phone: phone || null,
            preferred_locale: 'bn',
            is_active: false,
            updated_at: new Date().toISOString(),
          })
        } catch {
          // Non-blocking fallback
        }
      }

      // 3. Dispatch Registration Verification Email with 6-digit OTP & Secure Link
      const emailRes = await AuthEmailService.sendRegistrationVerificationEmail({
        email: normalizedEmail,
        fullName,
        userId,
        appUrl,
      })

      if (!emailRes.success && !emailRes.otpCreated) {
        console.error('[AuthService] Verification email failed to dispatch:', emailRes.error)
      }

      return {
        success: true,
        data: {
          userId: userId!,
          requiresVerification: true,
          email: normalizedEmail,
        },
        message: 'A 6-digit verification code has been sent to your email address.',
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Registration failed',
      }
    }
  }

  /**
   * Checks if an email has already been verified (via link, OTP, or active profile)
   * Used for cross-tab / cross-device OTP screen expiration and live status polling
   */
  static async checkRegistrationVerificationStatus(
    email: string
  ): Promise<ApiResponse<{ isVerified: boolean; requiresOnboarding?: boolean; session?: TenantSessionData; destinationUrl?: string }>> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail) {
        return { success: true, data: { isVerified: false, requiresOnboarding: true } }
      }

      const admin = createAdminClient()

      // 1. Check user_profiles table for active status
      let profile: any = null
      try {
        const { data } = await (admin as any)
          .from('user_profiles')
          .select('id, email, full_name, full_name_bn, phone, is_active')
          .eq('email', normalizedEmail)
          .maybeSingle()
        profile = data
      } catch {}

      if (profile && profile.is_active) {
        // Check if user already has an established company membership
        try {
          const membership = await TenantRepository.resolveUserMembership(profile.id)
          if (membership && membership.company) {
            const { company, companyUser, effectivePermissions, primaryRole } = membership
            const isOwner = (company as any)?.owner_id === profile.id || primaryRole === 'business_owner'
            const tenantRole: TenantRole = resolveTenantRole(primaryRole, companyUser.responsibilities, isOwner)

            const sessionData: TenantSessionData = {
              userId: profile.id,
              userEmail: normalizedEmail,
              fullName: companyUser.profile?.full_name || profile.full_name || normalizedEmail.split('@')[0],
              fullNameBn: companyUser.profile?.full_name_bn || profile.full_name_bn || null,
              phone: companyUser.profile?.phone || profile.phone || null,
              companyId: company.id,
              companySlug: company.slug,
              companyName: company.name,
              companyNameBn: company.name_bn || company.name,
              branchId: companyUser.branch_id || 'br-main',
              branchName: companyUser.branch?.name || 'Main Branch',
              role: tenantRole,
              primaryRole: primaryRole as PrimaryRole,
              responsibilities: companyUser.responsibilities || [primaryRole],
              permissions: effectivePermissions,
              loginTime: new Date().toISOString(),
              token: `auth-${profile.id}`,
            }

            return {
              success: true,
              data: {
                isVerified: true,
                requiresOnboarding: false,
                session: sessionData,
                destinationUrl: getTenantLink(company.slug, '/dashboard'),
              },
            }
          }
        } catch {}

        const ownerPermissions = Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
          spec.actions.map((act) => `${mod}.${act}`)
        )

        const sessionData: TenantSessionData = {
          userId: profile.id,
          userEmail: normalizedEmail,
          fullName: profile.full_name || normalizedEmail.split('@')[0],
          fullNameBn: profile.full_name_bn || null,
          phone: profile.phone || null,
          companyId: '',
          companySlug: '',
          companyName: 'New Organization',
          companyNameBn: 'নতুন প্রতিষ্ঠান',
          branchId: 'br-main',
          branchName: 'Main Branch',
          role: 'business_owner',
          primaryRole: 'business_owner',
          responsibilities: ['business_owner'],
          permissions: ownerPermissions,
          loginTime: new Date().toISOString(),
          token: `auth-${profile.id}`,
        }

        return {
          success: true,
          data: {
            isVerified: true,
            requiresOnboarding: true,
            session: sessionData,
            destinationUrl: '/onboarding',
          },
        }
      }

      // 2. In test environment, check AuthEmailService testStore / verified tracking
      if (isTestEnvironment()) {
        const isVerifiedInTest = AuthEmailService.isVerifiedInTestStore(normalizedEmail, 'registration')
        if (isVerifiedInTest) {
          const testUserId = `test-user-${normalizedEmail}`
          try {
            const membership = await TenantRepository.resolveUserMembership(testUserId)
            if (membership && membership.company) {
              const { company, companyUser, effectivePermissions, primaryRole } = membership
              const isOwner = (company as any)?.owner_id === testUserId || primaryRole === 'business_owner'
              const tenantRole: TenantRole = resolveTenantRole(primaryRole, companyUser.responsibilities, isOwner)

              const sessionData: TenantSessionData = {
                userId: testUserId,
                userEmail: normalizedEmail,
                fullName: companyUser.profile?.full_name || normalizedEmail.split('@')[0],
                fullNameBn: companyUser.profile?.full_name_bn || null,
                phone: companyUser.profile?.phone || null,
                companyId: company.id,
                companySlug: company.slug,
                companyName: company.name,
                companyNameBn: company.name_bn || company.name,
                branchId: companyUser.branch_id || 'br-main',
                branchName: companyUser.branch?.name || 'Main Branch',
                role: tenantRole,
                primaryRole: primaryRole as PrimaryRole,
                responsibilities: companyUser.responsibilities || [primaryRole],
                permissions: effectivePermissions,
                loginTime: new Date().toISOString(),
                token: `auth-test-${normalizedEmail}`,
              }

              return {
                success: true,
                data: {
                  isVerified: true,
                  requiresOnboarding: false,
                  session: sessionData,
                  destinationUrl: getTenantLink(company.slug, '/dashboard'),
                },
              }
            }
          } catch {}

          const ownerPermissions = Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
            spec.actions.map((act) => `${mod}.${act}`)
          )
          const sessionData: TenantSessionData = {
            userId: testUserId,
            userEmail: normalizedEmail,
            fullName: normalizedEmail.split('@')[0],
            fullNameBn: null,
            phone: null,
            companyId: '',
            companySlug: '',
            companyName: 'New Organization',
            companyNameBn: 'নতুন প্রতিষ্ঠান',
            branchId: 'br-main',
            branchName: 'Main Branch',
            role: 'business_owner',
            primaryRole: 'business_owner',
            responsibilities: ['business_owner'],
            permissions: ownerPermissions,
            loginTime: new Date().toISOString(),
            token: `auth-test-${normalizedEmail}`,
          }
          return {
            success: true,
            data: {
              isVerified: true,
              requiresOnboarding: true,
              session: sessionData,
              destinationUrl: '/onboarding',
            },
          }
        }
      }

      // 3. Check auth_verifications for used/verified registration records
      try {
        const { data: verRecord } = await (admin as any)
          .from('auth_verifications')
          .select('id, is_used, verified_at, user_id')
          .eq('email', normalizedEmail)
          .eq('purpose', 'registration')
          .not('verified_at', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (verRecord && verRecord.verified_at) {
          if (verRecord.user_id) {
            try {
              const membership = await TenantRepository.resolveUserMembership(verRecord.user_id)
              if (membership && membership.company) {
                return {
                  success: true,
                  data: {
                    isVerified: true,
                    requiresOnboarding: false,
                    destinationUrl: getTenantLink(membership.company.slug, '/dashboard'),
                  },
                }
              }
            } catch {}
          }
          return {
            success: true,
            data: {
              isVerified: true,
              requiresOnboarding: true,
              destinationUrl: '/onboarding',
            },
          }
        }
      } catch {}

      return {
        success: true,
        data: {
          isVerified: false,
          requiresOnboarding: true,
        },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check verification status',
      }
    }
  }

  /**
   * Verifies registration 6-digit OTP, confirms email in Supabase Auth, and establishes onboarding session
   */
  static async verifyRegistrationOtp(
    email: string,
    otp: string
  ): Promise<ApiResponse<SignInResultData>> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const verifyRes = await AuthEmailService.verifyOtp(normalizedEmail, otp, 'registration')

      if (!verifyRes.success) {
        // If already verified previously (e.g. user used the email verification link right before submitting OTP)
        const checkStatus = await this.checkRegistrationVerificationStatus(normalizedEmail)
        if (checkStatus.success && checkStatus.data?.isVerified) {
          return await this.finalizeRegistrationVerification(normalizedEmail, checkStatus.data.session?.userId)
        }
        return { success: false, error: verifyRes.error || 'The verification code is incorrect.' }
      }

      return await this.finalizeRegistrationVerification(normalizedEmail, verifyRes.userId)
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Verification failed',
      }
    }
  }

  /**
   * Verifies registration link token, confirms email in Supabase Auth, and establishes onboarding session
   */
  static async verifyRegistrationToken(
    token: string,
    email?: string | null
  ): Promise<ApiResponse<SignInResultData>> {
    try {
      const verifyRes = await AuthEmailService.verifyToken(token, email, 'registration')

      if (!verifyRes.success) {
        return { success: false, error: verifyRes.error || 'This verification link has expired or is invalid.' }
      }

      const targetEmail = verifyRes.email || email || ''
      return await this.finalizeRegistrationVerification(targetEmail, verifyRes.userId)
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Link verification failed',
      }
    }
  }

  /**
   * Activates user account after successful verification and constructs onboarding session
   */
  static async finalizeRegistrationVerification(
    email: string,
    verifiedUserId?: string
  ): Promise<ApiResponse<SignInResultData>> {
    const admin = createAdminClient()
    let userId = verifiedUserId

    if (isTestEnvironment()) {
      AuthEmailService.markVerifiedInTest(email)
    }

    if (!userId) {
      try {
        const { data: userList } = await admin.auth.admin.listUsers()
        const user = userList?.users?.find((u) => u.email?.toLowerCase() === email)
        if (user) userId = user.id
      } catch {}
    }

    if (!userId) {
      try {
        const { data: profile } = await (admin as any)
          .from('user_profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle()
        if (profile) userId = profile.id
      } catch {}
    }

    if (!userId && isTestEnvironment()) {
      userId = `test-user-${email}`
    }

    if (!userId) {
      return { success: false, error: 'User account not found.' }
    }

    // 1. Confirm email in Supabase Auth
    if (!isTestEnvironment()) {
      try {
        await admin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        })
      } catch {}

      // 2. Activate profile in user_profiles
      try {
        await (admin as any)
          .from('user_profiles')
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq('id', userId)
      } catch {}
    }

    // 3. Check if user already has an active company membership (already completed onboarding)
    try {
      const membership = await TenantRepository.resolveUserMembership(userId)
      if (membership && membership.company) {
        const { company, companyUser, effectivePermissions, primaryRole } = membership
        const isOwner = (company as any)?.owner_id === userId || primaryRole === 'business_owner'
        const tenantRole: TenantRole = resolveTenantRole(primaryRole, companyUser.responsibilities, isOwner)

        const sessionData: TenantSessionData = {
          userId,
          userEmail: email,
          fullName: companyUser.profile?.full_name || email.split('@')[0],
          fullNameBn: companyUser.profile?.full_name_bn || null,
          phone: companyUser.profile?.phone || null,
          companyId: company.id,
          companySlug: company.slug,
          companyName: company.name,
          companyNameBn: company.name_bn || company.name,
          branchId: companyUser.branch_id || 'br-main',
          branchName: companyUser.branch?.name || 'Main Branch',
          role: tenantRole,
          primaryRole: primaryRole as PrimaryRole,
          responsibilities: companyUser.responsibilities || [primaryRole],
          permissions: effectivePermissions,
          loginTime: new Date().toISOString(),
          token: `auth-${userId}`,
        }

        if (typeof document !== 'undefined') {
          const encoded = encodeURIComponent(JSON.stringify(sessionData))
          const maxAge = 60 * 60 * 24 * 7
          document.cookie = `${TENANT_SESSION_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax;`
          window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: sessionData }))
        }

        return {
          success: true,
          data: {
            userId,
            session: sessionData,
            requiresOnboarding: false,
          },
          message: 'Account verified and active.',
        }
      }
    } catch {}

    const { data: profile } = await (admin as any)
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    const ownerPermissions = Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
      spec.actions.map((act) => `${mod}.${act}`)
    )

    const sessionData: TenantSessionData = {
      userId,
      userEmail: email,
      fullName: profile?.full_name || email.split('@')[0],
      fullNameBn: profile?.full_name_bn || null,
      phone: profile?.phone || null,
      companyId: '',
      companySlug: '',
      companyName: 'New Organization',
      companyNameBn: 'নতুন প্রতিষ্ঠান',
      branchId: 'br-main',
      branchName: 'Main Branch',
      role: 'business_owner',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
      permissions: ownerPermissions,
      loginTime: new Date().toISOString(),
      token: `auth-${userId}`,
    }

    if (typeof document !== 'undefined') {
      const encoded = encodeURIComponent(JSON.stringify(sessionData))
      const maxAge = 60 * 60 * 24 * 7
      document.cookie = `${TENANT_SESSION_COOKIE}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax;`
      window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: sessionData }))
    }

    return {
      success: true,
      data: {
        userId,
        session: sessionData,
        requiresOnboarding: true,
      },
      message: 'Email successfully verified! Welcome to InkFlow.',
    }
  }

  /**
   * Resends verification code with cooldown rate-limiting
   */
  static async resendVerification(
    email: string,
    purpose: 'registration' | 'password_reset' = 'registration',
    appUrl?: string
  ): Promise<ApiResponse> {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (purpose === 'registration') {
        const admin = createAdminClient()
        const { data: profile } = await (admin as any)
          .from('user_profiles')
          .select('full_name, id')
          .eq('email', normalizedEmail)
          .maybeSingle()

        const res = await AuthEmailService.sendRegistrationVerificationEmail({
          email: normalizedEmail,
          fullName: profile?.full_name || normalizedEmail.split('@')[0],
          userId: profile?.id,
          appUrl,
        })

        if (!res.success && !res.otpCreated) {
          return { success: false, error: res.error || 'Failed to resend code. Please try again.' }
        }
      } else {
        return await this.forgotPassword(normalizedEmail, appUrl)
      }

      return { success: true, message: 'A new verification code has been dispatched to your email.' }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to resend verification code',
      }
    }
  }

  /**
   * Requests password reset with Email Enumeration Protection & branded email dispatch
   */
  static async forgotPassword(email: string, appUrl?: string): Promise<ApiResponse> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail) {
        return { success: false, error: 'Email address is required.' }
      }

      const admin = createAdminClient()
      let userId: string | null = null
      let userName: string | null = null

      try {
        const { data: userList } = await admin.auth.admin.listUsers()
        const user = userList?.users?.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        )
        if (user) {
          userId = user.id
          userName = user.user_metadata?.full_name || null
        }
      } catch (adminErr) {
        console.warn('[AuthService] admin.auth.admin.listUsers query error:', adminErr)
      }

      // Check user_profiles table as fallback if not matched in first page of auth.users
      if (!userId) {
        try {
          const { data: profile } = await (admin as any)
            .from('user_profiles')
            .select('id, full_name')
            .eq('email', normalizedEmail)
            .maybeSingle()
          if (profile) {
            userId = profile.id
            userName = profile.full_name || null
          }
        } catch {}
      }

      if (userId || isTestEnvironment()) {
        // User exists: Dispatch branded password reset email with 6-digit OTP & reset link
        const emailRes = await AuthEmailService.sendPasswordResetEmail({
          email: normalizedEmail,
          userName: userName || normalizedEmail.split('@')[0],
          userId: userId || undefined,
          appUrl,
        })

        if (!emailRes.success && !emailRes.otpCreated) {
          console.warn('[AuthService] Password reset email failed to dispatch:', emailRes.error)
        }
      } else {
        // User does not exist: Simulate realistic processing delay to prevent timing-based user enumeration
        await new Promise((resolve) => setTimeout(resolve, 80))
      }

      // Always return authoritative anti-enumeration generic response
      return {
        success: true,
        message: 'If an account exists for this email address, we have sent password reset instructions.',
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to request password reset',
      }
    }
  }

  /**
   * Verifies password reset 6-digit OTP and returns temporary reset authorization token
   */
  static async verifyPasswordResetOtp(
    email: string,
    otp: string
  ): Promise<ApiResponse<{ resetToken: string }>> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const verifyRes = await AuthEmailService.verifyOtp(normalizedEmail, otp, 'password_reset')

      if (!verifyRes.success || !verifyRes.resetToken) {
        return { success: false, error: verifyRes.error || 'The verification code is incorrect.' }
      }

      return {
        success: true,
        data: { resetToken: verifyRes.resetToken },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'OTP verification failed',
      }
    }
  }

  /**
   * Verifies password reset link token and returns temporary reset authorization token
   */
  static async verifyPasswordResetToken(
    token: string,
    email?: string | null
  ): Promise<ApiResponse<{ resetToken: string }>> {
    try {
      const verifyRes = await AuthEmailService.verifyToken(token, email, 'password_reset')

      if (!verifyRes.success) {
        return { success: false, error: verifyRes.error || 'This reset link has expired or is invalid.' }
      }

      return {
        success: true,
        data: { resetToken: verifyRes.resetToken || token },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Reset link verification failed',
      }
    }
  }

  /**
   * Updates password after verified reset authorization and invalidates active sessions
   */
  static async confirmPasswordReset(
    email: string,
    resetToken: string,
    newPassword: string
  ): Promise<ApiResponse> {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' }
      }

      // 1. Authoritative validation of reset authorization token
      const authValidation = await AuthEmailService.validateResetAuthorization(normalizedEmail, resetToken)
      if (!authValidation.success) {
        return { success: false, error: authValidation.error || 'Invalid or expired password reset authorization.' }
      }

      const admin = createAdminClient()
      let userId = authValidation.userId

      if (!userId) {
        try {
          const { data: userList } = await admin.auth.admin.listUsers()
          const user = userList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)
          if (user) userId = user.id
        } catch {}
      }

      if (!userId && isTestEnvironment()) {
        userId = `test-user-${normalizedEmail}`
      }

      if (!userId) {
        return { success: false, error: 'User account not found.' }
      }

      // 2. Update password in Supabase Auth via Admin Client
      if (!isTestEnvironment()) {
        const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
          password: newPassword,
        })

        if (updateErr) {
          return { success: false, error: updateErr.message || 'Failed to update password.' }
        }
      }

      // 3. Clear session cookie & purge browser cache
      if (typeof document !== 'undefined') {
        document.cookie = `${TENANT_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`
        window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: null }))
      }

      await AuditService.trackPasswordChanged(normalizedEmail, userId)

      return {
        success: true,
        message: 'Your password has been updated successfully. Please sign in with your new password.',
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to reset password',
      }
    }
  }

  /**
   * Update password from logged-in session via Supabase Auth
   */
  static async resetPassword(password: string): Promise<ApiResponse> {
    try {
      const supabase = await getSupabaseAuthClient()
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, message: 'Password updated successfully.' }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update password',
      }
    }
  }

  /**
   * Sign out current user and purge session cookies & Supabase auth session
   */
  static async signOut(): Promise<ApiResponse> {
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${TENANT_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`
        window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: null }))
      }

      const supabase = await getSupabaseAuthClient()
      await supabase.auth.signOut()
      return { success: true }
    } catch (_err: unknown) {
      if (typeof document !== 'undefined') {
        document.cookie = `${TENANT_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`
        window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: null }))
      }
      return { success: true }
    }
  }
}
