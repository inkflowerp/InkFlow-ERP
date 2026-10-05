// ==============================================================================
// PrintFlow SaaS - Google OAuth 2.0 Callback Route
// GET /api/email/oauth/google/callback?code=...&state=...
// ==============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  verifyGoogleOAuthState,
  exchangeGoogleAuthCode,
  fetchGoogleUserProfile,
} from '@/lib/email/oauth/google-oauth'
import { encryptSecret } from '@/lib/security/encryption'
import { EmailDataStore } from '@/services/email-gateway.service'
import { AuditService } from '@/services/audit.service'
import type { EmailGatewayRecord } from '@/types/communication.types'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'

const isValidUuid = (str?: string | null): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = resolveRequestOrigin(request)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // 1. Handle user cancellation / Google error
  if (oauthError) {
    console.warn('[GoogleOAuthCallback] Google returned error:', oauthError)
    const statePayload = verifyGoogleOAuthState(state)
    if (statePayload) {
      let returnBase = '/platform/settings/communication'
      if (statePayload.scopeType === 'TENANT') {
        try {
          const adminClient = createAdminClient()
          const { data: comp } = await (adminClient as any)
            .from('companies')
            .select('slug')
            .eq('id', statePayload.tenantId)
            .maybeSingle()
          returnBase = `/${comp?.slug || 'tenant'}/settings/email`
        } catch {
          returnBase = `/${statePayload.tenantId || 'tenant'}/settings/email`
        }
      }
      const errUrl = new URL(statePayload.returnUrl || returnBase, origin)
      errUrl.searchParams.set('error', oauthError)
      return NextResponse.redirect(errUrl)
    }
    return NextResponse.redirect(`${origin}/?oauth_error=${encodeURIComponent(oauthError)}`)
  }

  // 2. Validate HMAC-signed State Token & Expiration Window
  const statePayload = verifyGoogleOAuthState(state)
  if (!statePayload) {
    console.error('[GoogleOAuthCallback] Invalid, expired or forged OAuth state')
    return NextResponse.redirect(`${origin}/?oauth_error=invalid_or_expired_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?oauth_error=missing_authorization_code`)
  }

  try {
    // 3. Exchange Authorization Code for Tokens
    const tokenResponse = await exchangeGoogleAuthCode(code, statePayload.redirectUri)
    const { access_token, refresh_token, expires_in, scope } = tokenResponse

    // 4. Retrieve Google Identity Profile
    const profile = await fetchGoogleUserProfile(access_token)

    // 5. Encrypt OAuth Tokens at rest using AES-256-GCM
    const tokenPayload = JSON.stringify({
      access_token,
      refresh_token: refresh_token || undefined,
      scope,
    })
    const encryptedCredentials = encryptSecret(tokenPayload)

    const tokenExpiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
    const nowIso = new Date().toISOString()

    const adminClient = createAdminClient()

    const gatewayPayload = {
      tenant_id: statePayload.scopeType === 'PLATFORM' ? null : statePayload.tenantId,
      scope_type: statePayload.scopeType,
      provider: 'gmail' as const,
      type: 'transactional' as const,
      gmail_account_email: profile.email,
      gmail_display_name: profile.name || profile.email,
      encrypted_credentials: encryptedCredentials,
      token_expires_at: tokenExpiresAt,
      sender_name: profile.name || profile.email,
      sender_email: profile.email,
      reply_to_email: profile.email,
      status: 'active' as const,
      is_default: true,
      last_tested_at: nowIso,
      last_test_status: 'healthy',
      last_checked_at: nowIso,
      updated_at: nowIso,
    }

    // 6. Upsert into database
    let savedRecord: EmailGatewayRecord = {
      id: `gw-gmail-${Date.now()}`,
      ...gatewayPayload,
    } as EmailGatewayRecord

    try {
      // 1. Deactivate other non-Gmail gateways as default before making Gmail default
      try {
        let deactQuery = (adminClient as any)
          .from('email_gateways')
          .update({ is_default: false })
          .neq('provider', 'gmail')

        if (statePayload.scopeType === 'PLATFORM') {
          deactQuery = deactQuery.is('tenant_id', null)
        } else {
          deactQuery = deactQuery.eq('tenant_id', statePayload.tenantId!)
        }
        await deactQuery
      } catch {}

      // 2. Find existing Gmail gateway for this scope
      let query = (adminClient as any)
        .from('email_gateways')
        .select('id')
        .eq('provider', 'gmail')

      if (statePayload.scopeType === 'PLATFORM') {
        query = query.is('tenant_id', null)
      } else {
        query = query.eq('tenant_id', statePayload.tenantId!)
      }

      const { data: existing } = await query.maybeSingle()

      if (existing?.id) {
        const { data, error } = await (adminClient as any)
          .from('email_gateways')
          .update(gatewayPayload)
          .eq('id', existing.id)
          .select()
          .single()

        if (!error && data) {
          savedRecord = data
        } else if (error) {
          console.error('[GoogleOAuthCallback] Failed to update email_gateways row:', error)
        }
      } else {
        const candidateUserId = isValidUuid(statePayload.userId) ? statePayload.userId : null
        let insertRes = await (adminClient as any)
          .from('email_gateways')
          .insert({
            ...gatewayPayload,
            created_by: candidateUserId,
            created_at: nowIso,
          })
          .select()
          .single()

        if (
          insertRes.error &&
          (insertRes.error.message?.includes('created_by_fkey') || insertRes.error.code === '23503')
        ) {
          insertRes = await (adminClient as any)
            .from('email_gateways')
            .insert({
              ...gatewayPayload,
              created_by: null,
              created_at: nowIso,
            })
            .select()
            .single()
        }

        if (!insertRes.error && insertRes.data) {
          savedRecord = insertRes.data
        } else if (insertRes.error) {
          console.error('[GoogleOAuthCallback] Failed to insert email_gateways row:', insertRes.error)
        }
      }
    } catch (dbErr) {
      console.warn('[GoogleOAuthCallback] Database persist warning, proceeding with in-memory store:', dbErr)
    }

    // 7. Update in-memory / local data store
    const localGateways = EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []
    const filtered = localGateways.filter((g) =>
      statePayload.scopeType === 'PLATFORM' ? g.tenant_id !== null : g.tenant_id !== statePayload.tenantId
    )
    filtered.push(savedRecord)
    EmailDataStore.set('printerp_email_gateways', filtered)

    // 8. Record audit log
    try {
      await AuditService.logEvent(
        statePayload.tenantId || 'platform',
        statePayload.userId,
        profile.name || profile.email,
        'email.gmail_connected',
        'email_gateway',
        savedRecord.id,
        null,
        {
          provider: 'gmail',
          account_email: profile.email,
          scope_type: statePayload.scopeType,
        },
        `Gmail account ${profile.email} connected as active email provider`
      )
    } catch {
      // Non-blocking audit log
    }

    // 9. Redirect back with success indicator
    let redirectDestination = statePayload.returnUrl

    if (!redirectDestination) {
      if (statePayload.scopeType === 'PLATFORM') {
        redirectDestination = `${origin}/platform/settings/communication?gmail=connected`
      } else {
        // Resolve tenant slug
        const { data: company } = await (adminClient as any)
          .from('companies')
          .select('slug')
          .eq('id', statePayload.tenantId)
          .maybeSingle()

        const slug = company?.slug || 'default'
        redirectDestination = `${origin}/${slug}/settings/email?gmail=connected`
      }
    } else {
      let safePath = redirectDestination
      if (
        !safePath.startsWith('/') ||
        safePath.startsWith('//') ||
        safePath.startsWith('/\\')
      ) {
        safePath = '/settings/email'
      }
      try {
        const parsed = new URL(safePath, origin)
        if (parsed.origin === origin) {
          parsed.searchParams.set('gmail', 'connected')
          redirectDestination = parsed.toString()
        } else {
          redirectDestination = `${origin}/settings/email?gmail=connected`
        }
      } catch {
        redirectDestination = `${origin}/settings/email?gmail=connected`
      }
    }

    return NextResponse.redirect(redirectDestination)
  } catch (err: any) {
    console.error('[GoogleOAuthCallback] OAuth exchange failure:', err)
    const errUrl = `${origin}/?oauth_error=${encodeURIComponent(err?.message || 'Token exchange failed')}`
    return NextResponse.redirect(errUrl)
  }
}
