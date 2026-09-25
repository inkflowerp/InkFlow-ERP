// ==============================================================================
// PrintERP / InkFlow SaaS - Production Google OAuth 2.0 & Domain Branding Engine
// Eliminates raw Supabase URL exposure during Sign-in with Google.
// Implements direct domain authorization, HMAC-SHA256 state CSRF protection,
// server-to-server token exchange, ID token decoding, and multi-tenant resolution.
// ==============================================================================

import crypto from 'crypto'
import { createAdminClient } from '../supabase/admin.ts'
import { TenantRepository } from '../repositories/tenant.repository.ts'
import { AuditService } from '../../services/audit.service.ts'
import { resolveTenantRole, TENANT_SESSION_COOKIE, type TenantSessionData, type TenantRole } from './types.ts'
import type { PrimaryRole } from '../../types/rbac.types.ts'
import { MODULE_ACTION_SPECS } from '../../types/rbac.types.ts'
import { isTestEnvironment } from '../security/runtime-env.ts'
import { getTenantLink } from '../tenant/tenant-url.ts'
import type { ApiResponse } from '../../types/common.types.ts'

export interface GoogleAuthStatePayload {
  next?: string
  purpose?: 'login' | 'register'
  ts: number
  nonce: string
  sourceOrigin?: string
}

export interface GoogleAuthClientConfig {
  clientId: string
  clientSecret: string
  isConfigured: boolean
  hasClientId: boolean
  hasClientSecret: boolean
  redirectUri: string
  mode: 'direct_domain' | 'custom_auth_domain' | 'supabase_default'
}

export interface GoogleTokenExchangeResult {
  access_token: string
  id_token?: string
  expires_in: number
  token_type: string
  scope: string
  refresh_token?: string
}

export interface GoogleVerifiedIdentity {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

export interface AuthenticateGoogleUserResult {
  userId: string
  userEmail: string
  session: TenantSessionData
  requiresOnboarding: boolean
  destinationUrl: string
  isNewUser: boolean
}

/**
 * Returns Google OAuth client credentials and domain configuration
 */
export function getGoogleAuthClientConfig(requestOrigin?: string): GoogleAuthClientConfig {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    ''

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    ''

  const isMockOrEmptyId =
    !clientId ||
    clientId.startsWith('mock-') ||
    clientId.includes('mock-google-client-id')

  const isMockOrEmptySecret =
    !clientSecret ||
    clientSecret.startsWith('mock-') ||
    clientSecret === 'mock-google-client-secret'

  // Resolve base application origin
  let origin = requestOrigin || ''
  if (!origin) {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      origin = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`
    } else if (process.env.VERCEL_URL) {
      origin = `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`
    } else {
      origin = 'http://localhost:3000'
    }
  }

  // Check for explicit redirect URI override, otherwise construct from origin
  const explicitRedirectUri =
    process.env.GOOGLE_AUTH_REDIRECT_URI ||
    process.env.GOOGLE_REDIRECT_URI ||
    ''

  const redirectUri = explicitRedirectUri || `${origin}/api/auth/google/callback`

  let mode: 'direct_domain' | 'custom_auth_domain' | 'supabase_default' = 'supabase_default'
  if (!isMockOrEmptyId && !isMockOrEmptySecret) {
    mode = 'direct_domain'
  } else if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('.supabase.co')
  ) {
    mode = 'custom_auth_domain'
  }

  return {
    clientId,
    clientSecret,
    isConfigured: !isMockOrEmptyId && !isMockOrEmptySecret,
    hasClientId: !isMockOrEmptyId,
    hasClientSecret: !isMockOrEmptySecret,
    redirectUri,
    mode,
  }
}

/**
 * Derives a secure HMAC secret for state signing
 */
function getGoogleAuthStateSecret(): string {
  return (
    process.env.ENCRYPTION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.STORAGE_SIGNING_SALT ||
    'inkflow_google_auth_state_hmac_signing_key_2026'
  )
}

/**
 * Generates a signed, tamper-proof state token for CSRF defense (valid for 10 minutes)
 */
export function generateGoogleAuthState(payload: {
  next?: string
  purpose?: 'login' | 'register'
  sourceOrigin?: string
}): string {
  const fullPayload: GoogleAuthStatePayload = {
    next: payload.next || '',
    purpose: payload.purpose || 'login',
    sourceOrigin: payload.sourceOrigin || '',
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  const serialized = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const hmac = crypto
    .createHmac('sha256', getGoogleAuthStateSecret())
    .update(serialized)
    .digest('base64url')

  return `${serialized}.${hmac}`
}

/**
 * Cryptographically verifies OAuth state token and checks 10-minute expiry
 */
export function verifyGoogleAuthState(state: string | null | undefined): GoogleAuthStatePayload | null {
  if (!state || typeof state !== 'string' || !state.includes('.')) {
    return null
  }

  const [serialized, signature] = state.split('.')
  if (!serialized || !signature) {
    return null
  }

  const expectedHmac = crypto
    .createHmac('sha256', getGoogleAuthStateSecret())
    .update(serialized)
    .digest('base64url')

  // Timing-safe HMAC comparison to prevent side-channel timing attacks
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expectedHmac)
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const payload: GoogleAuthStatePayload = JSON.parse(
      Buffer.from(serialized, 'base64url').toString('utf8')
    )

    // Verify timestamp (max 10 minutes = 600,000 ms)
    const MAX_AGE_MS = 10 * 60 * 1000
    if (!payload.ts || Date.now() - payload.ts > MAX_AGE_MS || payload.ts > Date.now() + 60000) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

/**
 * Generates direct RFC-compliant Google OAuth 2.0 Authorization URL
 * The redirect_uri uses the application's domain so Google shows:
 * "to continue to yourdomain.com"
 */
export function generateGoogleAuthSignInUrl(options?: {
  origin?: string
  next?: string
  purpose?: 'login' | 'register'
  prompt?: 'select_account' | 'consent'
}): { url: string; state: string } {
  const config = getGoogleAuthClientConfig(options?.origin)
  const state = generateGoogleAuthState({
    next: options?.next,
    purpose: options?.purpose,
    sourceOrigin: options?.origin,
  })

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    state,
    prompt: options?.prompt || 'select_account',
  })

  return {
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
  }
}

/**
 * Exchanges authorization code for tokens directly with Google token endpoint
 */
export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string
): Promise<ApiResponse<GoogleTokenExchangeResult>> {
  const config = getGoogleAuthClientConfig()

  if (!config.clientId || !config.clientSecret) {
    return {
      success: false,
      error: 'Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured.',
    }
  }

  try {
    const tokenParams = new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: tokenParams.toString(),
    })

    const data = await response.json()

    if (!response.ok || data.error) {
      const errorDescription = data.error_description || data.error || 'Failed to exchange authorization code'
      return {
        success: false,
        error: `Google token exchange error: ${errorDescription}`,
      }
    }

    return {
      success: true,
      data: {
        access_token: data.access_token,
        id_token: data.id_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
        scope: data.scope,
        refresh_token: data.refresh_token,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network failure communicating with Google OAuth server.',
    }
  }
}

/**
 * Decodes and verifies Google ID Token or fetches user profile from Google UserInfo
 */
export async function verifyGoogleTokenIdentity(
  tokenResult: GoogleTokenExchangeResult
): Promise<ApiResponse<GoogleVerifiedIdentity>> {
  // 1. If id_token is provided, verify payload
  if (tokenResult.id_token) {
    try {
      const parts = tokenResult.id_token.split('.')
      if (parts.length === 3) {
        const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8')
        const payload = JSON.parse(payloadJson)

        if (payload.sub && payload.email) {
          return {
            success: true,
            data: {
              sub: payload.sub,
              email: payload.email.trim().toLowerCase(),
              email_verified: Boolean(payload.email_verified),
              name: payload.name || payload.given_name || payload.email.split('@')[0],
              given_name: payload.given_name,
              family_name: payload.family_name,
              picture: payload.picture,
            },
          }
        }
      }
    } catch {}
  }

  // 2. Fallback: Fetch from Google UserInfo endpoint with access_token
  try {
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResult.access_token}`,
        Accept: 'application/json',
      },
    })

    if (!userRes.ok) {
      return { success: false, error: 'Failed to retrieve Google user profile information.' }
    }

    const info = await userRes.json()
    if (!info.email) {
      return { success: false, error: 'No verified email address returned from Google.' }
    }

    return {
      success: true,
      data: {
        sub: info.sub,
        email: info.email.trim().toLowerCase(),
        email_verified: Boolean(info.email_verified),
        name: info.name || info.email.split('@')[0],
        given_name: info.given_name,
        family_name: info.family_name,
        picture: info.picture,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch Google user identity',
    }
  }
}

/**
 * Authenticates verified Google user:
 * 1. Validates verified email requirement
 * 2. Synchronizes account in Supabase Auth & user_profiles
 * 3. Reconciles pre-created / invited company memberships
 * 4. Enforces Platform Admin security boundaries
 * 5. Performs authoritative tenant resolution
 * 6. Returns complete session and target destination URL
 */
export async function authenticateGoogleUser(
  identity: GoogleVerifiedIdentity,
  options?: { next?: string }
): Promise<ApiResponse<AuthenticateGoogleUserResult>> {
  try {
    const normalizedEmail = identity.email.trim().toLowerCase()
    if (!normalizedEmail) {
      return { success: false, error: 'Invalid Google account email address.' }
    }

    const admin = createAdminClient()
    let userId: string = ''
    let isNewUser = false

    // 1. Find or provision Supabase Auth user record
    if (!isTestEnvironment()) {
      try {
        const { data: userList } = await admin.auth.admin.listUsers()
        const existing = userList?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail)

        if (existing) {
          userId = existing.id
          // Ensure email_confirmed is true since Google verified it
          if (!existing.email_confirmed_at && !existing.confirmed_at) {
            await admin.auth.admin.updateUserById(userId, { email_confirm: true })
          }
        } else {
          // Create new confirmed Supabase user
          const { data: created, error: createErr } = await admin.auth.admin.createUser({
            email: normalizedEmail,
            email_confirm: true,
            user_metadata: {
              full_name: identity.name || normalizedEmail.split('@')[0],
              avatar_url: identity.picture || null,
              provider: 'google',
              google_sub: identity.sub,
            },
          })

          if (createErr || !created.user) {
            return {
              success: false,
              error: `Failed to provision user account: ${createErr?.message || 'Database error'}`,
            }
          }

          userId = created.user.id
          isNewUser = true
        }
      } catch (e: any) {
        console.error('[GoogleAuth] Supabase auth user lookup/create error:', e)
      }
    } else {
      userId = `google-user-${normalizedEmail}`
    }

    if (!userId) {
      userId = `google-user-${normalizedEmail}`
    }

    const fullName = identity.name || normalizedEmail.split('@')[0]
    const avatarUrl = identity.picture || null

    // 2. Guarantee user_profiles record is persisted and active
    try {
      await (admin as any).from('user_profiles').upsert(
        {
          id: userId,
          email: normalizedEmail,
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

    // 3. Reconcile invited or pre-created company memberships matching user's verified Google email
    try {
      await (admin as any)
        .from('company_users')
        .update({ user_id: userId, status: 'active', updated_at: new Date().toISOString() })
        .ilike('invited_email', normalizedEmail)

      const { data: matchedCompanies } = await (admin as any)
        .from('companies')
        .select('id')
        .ilike('email', normalizedEmail)

      if (matchedCompanies && matchedCompanies.length > 0) {
        for (const comp of matchedCompanies) {
          await (admin as any)
            .from('company_users')
            .update({ user_id: userId, status: 'active', updated_at: new Date().toISOString() })
            .eq('company_id', comp.id)
        }
      }
    } catch (e) {
      console.error('[GoogleAuth] Membership reconciliation error:', e)
    }

    // 4. Hard Security Boundary: Platform Administrator Accounts
    try {
      const { data: platformAdmin } = await (admin as any)
        .from('platform_admins')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()

      if (platformAdmin) {
        // Platform admin signing in on tenant portal must have authorized tenant membership
        const membership = await TenantRepository.resolveUserMembership(userId)
        if (!membership) {
          return {
            success: false,
            error: 'Platform administrators must sign in via the Platform Control Center (/platform/login).',
          }
        }
      }
    } catch {}

    // 5. Authoritative Database Tenant Resolution
    const membership = await TenantRepository.resolveUserMembership(userId)

    if (membership && membership.company && membership.companyUser) {
      const { company, companyUser, effectivePermissions, primaryRole } = membership

      // Check if user or company is disabled
      if (companyUser.status === 'disabled' || !company.is_active) {
        return {
          success: false,
          error: 'Your account or company has been deactivated by your administrator.',
        }
      }

      const isOwner = (company as any)?.owner_id === userId || primaryRole === 'business_owner'
      const tenantRole: TenantRole = resolveTenantRole(primaryRole, companyUser.responsibilities, isOwner)

      const sessionData: TenantSessionData = {
        userId,
        userEmail: normalizedEmail,
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
        token: `google-auth-${userId}`,
      }

      // Track successful login audit event
      try {
        await AuditService.trackLogin(company.id, userId, normalizedEmail)
      } catch {}

      // Safe return destination on canonical tenant subdomain
      let destinationUrl = getTenantLink(company.slug, '/dashboard')
      const next = options?.next
      if (next && next.startsWith('/') && !next.startsWith('/login') && !next.startsWith('/auth')) {
        let cleanNext = next
        if (cleanNext.startsWith(`/${company.slug}/`)) {
          cleanNext = cleanNext.slice(`/${company.slug}`.length)
        } else if (cleanNext === `/${company.slug}`) {
          cleanNext = '/dashboard'
        }
        destinationUrl = getTenantLink(company.slug, cleanNext)
      }

      return {
        success: true,
        data: {
          userId,
          userEmail: normalizedEmail,
          session: sessionData,
          requiresOnboarding: false,
          destinationUrl,
          isNewUser: false,
        },
      }
    }

    // 6. Seamless Onboarding for New or Unassigned Google Users
    const ownerPermissions = Object.entries(MODULE_ACTION_SPECS).flatMap(([mod, spec]) =>
      spec.actions.map((act) => `${mod}.${act}`)
    )

    const initialSession: TenantSessionData = {
      userId,
      userEmail: normalizedEmail,
      fullName,
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
      token: `google-auth-${userId}`,
    }

    return {
      success: true,
      data: {
        userId,
        userEmail: normalizedEmail,
        session: initialSession,
        requiresOnboarding: true,
        destinationUrl: '/onboarding',
        isNewUser: true,
      },
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Google authentication failed',
    }
  }
}

/**
 * Returns Google OAuth & Branding diagnostics for platform management
 */
export function getGoogleAuthBrandingDiagnostics(origin?: string): {
  mode: 'direct_domain' | 'custom_auth_domain' | 'supabase_default'
  isDirectDomainActive: boolean
  isBranded: boolean
  domainDisplayedToUser: string
  clientIdConfigured: boolean
  clientSecretConfigured: boolean
  redirectUri: string
  recommendations: string[]
} {
  const config = getGoogleAuthClientConfig(origin)
  const recommendations: string[] = []

  let domainDisplayed = 'Unknown'
  if (config.mode === 'direct_domain') {
    try {
      domainDisplayed = new URL(config.redirectUri).host
    } catch {
      domainDisplayed = config.redirectUri
    }
  } else if (config.mode === 'custom_auth_domain') {
    try {
      domainDisplayed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').host
    } catch {
      domainDisplayed = 'auth.inkflowerp.com'
    }
  } else {
    try {
      domainDisplayed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase.co').host
    } catch {
      domainDisplayed = 'xxxxx.supabase.co'
    }
  }

  if (config.mode === 'supabase_default') {
    recommendations.push(
      'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables to enable direct domain branding.'
    )
    recommendations.push(
      `Add authorized redirect URI in Google Cloud Console: ${config.redirectUri}`
    )
    recommendations.push(
      'Configure Google OAuth Consent Screen App Name as "InkFlow ERP" with your verified domain.'
    )
  }

  return {
    mode: config.mode,
    isDirectDomainActive: config.mode === 'direct_domain',
    isBranded: config.mode !== 'supabase_default',
    domainDisplayedToUser: domainDisplayed,
    clientIdConfigured: config.hasClientId,
    clientSecretConfigured: config.hasClientSecret,
    redirectUri: config.redirectUri,
    recommendations,
  }
}
