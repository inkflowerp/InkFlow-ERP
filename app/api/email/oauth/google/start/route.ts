// ==============================================================================
// PrintERP SaaS - Google OAuth 2.0 Initiation Route
// GET /api/email/oauth/google/start?scope=platform|tenant&tenantId=...&returnUrl=...
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedPlatformContext } from '@/lib/auth/platform-auth'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { generateGoogleAuthUrl, getGoogleOAuthDiagnostics } from '@/lib/email/oauth/google-oauth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scopeParam = searchParams.get('scope') || 'tenant'
    const tenantIdParam = searchParams.get('tenantId')
    const returnUrlParam = searchParams.get('returnUrl') || undefined

    const isPlatform = scopeParam.toLowerCase() === 'platform'

    let scopeType: 'PLATFORM' | 'TENANT' = 'TENANT'
    let resolvedTenantId: string | null = null
    let userId: string = ''

    if (isPlatform) {
      const platformUser = await getAuthenticatedPlatformContext()
      if (!platformUser || !platformUser.isActive) {
        return NextResponse.json(
          { error: 'Unauthorized: Platform admin authorization required' },
          { status: 401 }
        )
      }
      scopeType = 'PLATFORM'
      resolvedTenantId = null
      userId = platformUser.userId
    } else {
      const tenantUser = await getCurrentTenant(tenantIdParam || undefined)
      if (!tenantUser || (!tenantUser.permissions.includes('*') && !tenantUser.permissions.includes('settings.edit'))) {
        return NextResponse.json(
          { error: 'Unauthorized: Tenant admin settings.edit permission required' },
          { status: 401 }
        )
      }
      scopeType = 'TENANT'
      resolvedTenantId = tenantUser.companyId
      userId = tenantUser.userId
    }

    const diag = getGoogleOAuthDiagnostics()
    if (!diag.isConfigured) {
      const returnUrl = returnUrlParam || (isPlatform ? '/platform/settings/communication' : `/${resolvedTenantId || 'tenant'}/settings/email`)
      const redirectUrl = new URL(returnUrl, request.url)
      redirectUrl.searchParams.set('error', 'google_client_id_missing')
      return NextResponse.redirect(redirectUrl)
    }

    const authUrl = generateGoogleAuthUrl({
      scopeType,
      tenantId: resolvedTenantId,
      userId,
      returnUrl: returnUrlParam,
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
