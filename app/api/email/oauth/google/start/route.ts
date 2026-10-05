// ==============================================================================
// PrintFlow SaaS - Google OAuth 2.0 Initiation Route
// GET /api/email/oauth/google/start?scope=platform|tenant&tenantId=...&returnUrl=...
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedPlatformContext } from '@/lib/auth/platform-auth'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { generateGoogleAuthUrl, getGoogleOAuthDiagnostics } from '@/lib/email/oauth/google-oauth'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scopeParam = searchParams.get('scope') || 'tenant'
    const tenantIdParam = searchParams.get('tenantId')
    const rawReturnUrl = searchParams.get('returnUrl')
    const origin = resolveRequestOrigin(request)
    const returnUrlParam =
      rawReturnUrl &&
      rawReturnUrl.startsWith('/') &&
      !rawReturnUrl.startsWith('//') &&
      !rawReturnUrl.startsWith('/\\')
        ? rawReturnUrl
        : undefined

    const isPlatform = scopeParam.toLowerCase() === 'platform'

    let scopeType: 'PLATFORM' | 'TENANT' = 'TENANT'
    let resolvedTenantId: string | null = null
    let resolvedSlug: string | null = null
    let userId: string = ''

    if (isPlatform) {
      const platformUser = await getAuthenticatedPlatformContext()
      if (!platformUser || !platformUser.isActive) {
        const returnUrl = returnUrlParam || '/platform/settings/communication'
        const redirectUrl = new URL(returnUrl, request.url)
        redirectUrl.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(redirectUrl)
      }
      scopeType = 'PLATFORM'
      resolvedTenantId = null
      userId = platformUser.userId
    } else {
      const tenantUser = await getCurrentTenant(tenantIdParam || undefined)
      if (
        !tenantUser ||
        (tenantUser.companyRole !== 'business_owner' &&
          !tenantUser.permissions.includes('settings.edit') &&
          !tenantUser.permissions.includes('settings.manage'))
      ) {
        const returnUrl = returnUrlParam || `/${tenantUser?.companySlug || tenantIdParam || 'tenant'}/settings/email`
        const redirectUrl = new URL(returnUrl, request.url)
        redirectUrl.searchParams.set('error', 'unauthorized')
        return NextResponse.redirect(redirectUrl)
      }
      scopeType = 'TENANT'
      resolvedTenantId = tenantUser.companyId
      resolvedSlug = tenantUser.companySlug
      userId = tenantUser.userId
    }

    const diag = getGoogleOAuthDiagnostics(origin)
    if (!diag.isConfigured) {
      const returnUrl = returnUrlParam || (isPlatform ? '/platform/settings/communication' : `/${resolvedSlug || resolvedTenantId || 'tenant'}/settings/email`)
      const redirectUrl = new URL(returnUrl, request.url)
      redirectUrl.searchParams.set('error', 'google_client_id_missing')
      return NextResponse.redirect(redirectUrl)
    }

    const authUrl = generateGoogleAuthUrl({
      scopeType,
      tenantId: resolvedTenantId,
      userId,
      returnUrl: returnUrlParam,
      requestOrigin: origin,
    })

    return NextResponse.redirect(authUrl)
  } catch (err: any) {
    console.error('[GoogleOAuthStart] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to initiate Google OAuth authorization' },
      { status: 500 }
    )
  }
}
