import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { AuditService } from '@/services/audit.service'
import { TENANT_SESSION_COOKIE, TenantSessionData, TenantRole } from '@/lib/auth/types'
import { PrimaryRole } from '@/types/rbac.types'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')
  const next = searchParams.get('next')

  // 1. Handle OAuth Provider Errors or User Cancellations
  if (errorParam) {
    if (errorParam === 'access_denied' || errorDesc?.toLowerCase().includes('cancel')) {
      return NextResponse.redirect(`${origin}/login?error=cancelled`)
    }
    const descParam = errorDesc
      ? `&error_description=${encodeURIComponent(errorDesc)}`
      : `&error_description=${encodeURIComponent(errorParam)}`
    return NextResponse.redirect(`${origin}/login?error=oauth_error${descParam}`)
  }

  // 2. Validate Authorization Code
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent('No authorization code returned from OAuth provider')}`
    )
  }

  try {
    const supabase = await createClient()
    const { data: authData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !authData?.user) {
      console.error('[OAuth Callback] Code exchange error:', exchangeError)
      const desc = exchangeError?.message || 'Code exchange failed'
      return NextResponse.redirect(
        `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(desc)}`
      )
    }

    const user = authData.user
    const email = user.email?.trim().toLowerCase() || ''
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      email.split('@')[0] ||
      'User'
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

    // 3. Guarantee user_profiles record is persisted/synced
    try {
      const admin = createAdminClient()
      await (admin as any).from('user_profiles').upsert(
        {
          id: user.id,
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    } catch {
      // Non-blocking sync
    }

    // 3b. Reconcile invited or pre-created company memberships matching user's verified Google email
    if (email) {
      try {
        const admin = createAdminClient()
        await (admin as any)
          .from('company_users')
          .update({ user_id: user.id, status: 'active', updated_at: new Date().toISOString() })
          .ilike('invited_email', email)
      } catch {
        // Non-blocking
      }
    }

    // 4. Hard Security Boundary: Platform Administrator Accounts
    try {
      const admin = createAdminClient()
      const { data: platformAdmin } = await (admin as any)
        .from('platform_admins')
        .select('id, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (platformAdmin) {
        // Platform admins must not use tenant Google OAuth without authorized tenant membership
        const membership = await TenantRepository.resolveUserMembership(user.id)
        if (!membership) {
          await supabase.auth.signOut()
          const redirectResponse = NextResponse.redirect(
            `${origin}/platform/login?error=platform_user_on_tenant_portal`
          )
          redirectResponse.cookies.delete(TENANT_SESSION_COOKIE)
          return redirectResponse
        }
      }
    } catch {
      // Non-blocking fallback
    }

    // 5. Authoritative Database Tenant Resolution (company_users + companies)
    const membership = await TenantRepository.resolveUserMembership(user.id)

    if (membership && membership.company && membership.companyUser) {
      const { company, companyUser, effectivePermissions, primaryRole } = membership

      // Check if user or company is disabled
      if (companyUser.status === 'disabled' || !company.is_active) {
        await supabase.auth.signOut()
        const redirectResponse = NextResponse.redirect(`${origin}/login?error=disabled`)
        redirectResponse.cookies.delete(TENANT_SESSION_COOKIE)
        return redirectResponse
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
        userEmail: email,
        fullName: companyUser.profile?.full_name || fullName,
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

      // Track successful login audit event
      try {
        await AuditService.trackLogin(company.id, user.id, email)
      } catch {
        // Non-blocking
      }

      // Determine safe redirect destination
      let destination = `/${company.slug}/dashboard`
      if (
        next &&
        next.startsWith('/') &&
        !next.startsWith('/login') &&
        !next.startsWith('/auth')
      ) {
        if (next.startsWith(`/${company.slug}`)) {
          destination = next
        }
      }

      const redirectResponse = NextResponse.redirect(`${origin}${destination}`)
      redirectResponse.cookies.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(sessionData)), {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })

      return redirectResponse
    }

    // 6. Seamless Onboarding for New Google OAuth Users
    // User has authenticated in Google/Supabase but has no active company membership yet.
    // Set initial onboarding session and redirect to /onboarding to setup their business workspace.
    const ownerPermissions = Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
      spec.actions.map((act) => `${mod}.${act}`)
    )

    const initialSession: TenantSessionData = {
      userId: user.id,
      userEmail: email,
      fullName: fullName,
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
      token: authData.session?.access_token || `auth-${user.id}`,
    }

    const redirectResponse = NextResponse.redirect(`${origin}/onboarding`)
    redirectResponse.cookies.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(initialSession)), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return redirectResponse
  } catch (err: any) {
    console.error('[OAuth Callback] Unexpected error during OAuth callback handling:', err)
    const desc = err?.message || 'Unexpected OAuth callback error'
    return NextResponse.redirect(
      `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(desc)}`
    )
  }
}

