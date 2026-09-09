import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ApiResponse } from '@/types/common.types'
import { TenantSessionData, TENANT_SESSION_COOKIE, TenantRole } from '@/lib/auth/types'
import { PrimaryRole } from '@/types/rbac.types'
import { TenantRepository } from '@/lib/repositories/tenant.repository'

export interface SignInResultData {
  userId: string
  session: TenantSessionData
  requiresOnboarding?: boolean
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
   * Browser / Client side sign in with Supabase Auth & authoritative database tenant resolution
   */
  static async signIn(
    email: string,
    password: string,
    targetCompanySlug?: string
  ): Promise<ApiResponse<SignInResultData>> {
    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (!normalizedEmail || !password) {
        return { success: false, error: 'Email and password are required' }
      }

      const supabase = await getSupabaseAuthClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (authError || !authData?.user) {
        return {
          success: false,
          error: authError?.message || 'Invalid email or password',
        }
      }

      const user = authData.user
      const admin = createAdminClient()

      // 1. HARD SECURITY BOUNDARY: Platform Administrator accounts are strictly forbidden from logging into tenant accounts
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

      // 2. Resolve tenant membership and calculate effective permissions across responsibilities
      let membership = await TenantRepository.resolveUserMembership(user.id, targetCompanySlug)

      if (!membership) {
        // Check if there is any company membership for this user
        membership = await TenantRepository.resolveUserMembership(user.id)
      }

      if (!membership) {
        // User is authenticated in Supabase Auth but has no active tenant membership yet (e.g. freshly registered tenant owner)
        const { data: profile } = await (admin as any)
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

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
          permissions: ['*'],
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

      let tenantRole: TenantRole = 'business_owner'
      if (primaryRole === 'business_owner') tenantRole = 'business_owner'
      else if (primaryRole === 'sales_manager' || primaryRole === 'manager') tenantRole = 'sales_manager'
      else if (primaryRole === 'designer') tenantRole = 'graphic_designer'
      else if (primaryRole === 'operator') tenantRole = 'machine_operator'
      else if (primaryRole === 'accountant') tenantRole = 'accountant'
      else if (primaryRole === 'delivery') tenantRole = 'delivery_coordinator'

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
   * Authoritative Supabase Auth sign up with guaranteed user_profiles synchronization
   */
  static async signUp(
    email: string,
    password: string,
    fullName: string,
    phone?: string
  ): Promise<ApiResponse<{ userId: string }>> {
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const admin = createAdminClient()
      let userId: string | null = null

      // Check if user already exists in auth.users
      const { data: userList } = await admin.auth.admin.listUsers()
      const existingUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      )

      if (existingUser) {
        return { success: false, error: 'An account with this email already exists. Please sign in.' }
      }

      // 1. Create user in Supabase Auth via Admin client with auto-confirm
      const { data: newAuthData, error: createAuthErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          phone: phone || null,
          preferred_locale: 'bn',
        },
      })

      if (createAuthErr || !newAuthData?.user) {
        // Fallback to client signUp if admin createUser is restricted
        const supabase = await getSupabaseAuthClient()
        const { data: clientAuthData, error: clientErr } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || null,
              preferred_locale: 'bn',
            },
          },
        })

        if (clientErr || !clientAuthData?.user) {
          return {
            success: false,
            error: clientErr?.message || createAuthErr?.message || 'Registration failed',
          }
        }
        userId = clientAuthData.user.id
      } else {
        userId = newAuthData.user.id
      }

      // 2. Guarantee user_profiles record is persisted
      if (userId) {
        await (admin as any).from('user_profiles').upsert({
          id: userId,
          email: normalizedEmail,
          full_name: fullName,
          phone: phone || null,
          preferred_locale: 'bn',
          is_active: true,
          updated_at: new Date().toISOString(),
        })

        try {
          await (admin as any).from('profiles').upsert({
            id: userId,
            full_name: fullName,
            phone: phone || null,
            preferred_locale: 'bn',
            updated_at: new Date().toISOString(),
          })
        } catch {
          // Non-blocking fallback
        }
      }

      return {
        success: true,
        data: { userId: userId! },
      }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Registration failed',
      }
    }
  }

  /**
   * Send password reset email via Supabase Auth
   */
  static async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const supabase = await getSupabaseAuthClient()
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, message: 'Password reset link sent to your email.' }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to request reset',
      }
    }
  }

  /**
   * Update password from reset flow via Supabase Auth
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
    } catch (err: unknown) {
      if (typeof document !== 'undefined') {
        document.cookie = `${TENANT_SESSION_COOKIE}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;`
        window.dispatchEvent(new CustomEvent('printerp_auth_changed', { detail: null }))
      }
      return { success: true }
    }
  }
}


