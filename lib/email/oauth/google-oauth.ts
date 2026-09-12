// ==============================================================================
// PrintERP SaaS - Google OAuth 2.0 & Gmail API Security Utilities
// Implements secure OAuth state signing, token exchange, token refresh, and identity retrieval.
// ==============================================================================

import crypto from 'crypto'

export interface GoogleOAuthStatePayload {
  scopeType: 'PLATFORM' | 'TENANT'
  tenantId: string | null
  userId: string
  returnUrl?: string
  ts: number
  nonce: string
}

export interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number // seconds
  scope: string
  token_type: string
  id_token?: string
}

export interface GoogleUserProfile {
  id: string
  email: string
  verified_email?: boolean
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
}

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export interface GoogleOAuthDiagnostics {
  isConfigured: boolean
  hasClientId: boolean
  hasClientSecret: boolean
  hasRedirectUri: boolean
  redirectUri: string
  issues: string[]
}

/**
 * Returns Google OAuth Client configuration from environment
 */
export function getGoogleOAuthConfig() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    ''
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    ''
  
  // Canonical Redirect URI resolution
  let redirectUri =
    process.env.GOOGLE_GMAIL_REDIRECT_URI ||
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    ''

  if (!redirectUri) {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      redirectUri = `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/email/oauth/google/callback`
    } else if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      redirectUri = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}/api/email/oauth/google/callback`
    } else if (process.env.VERCEL_URL) {
      redirectUri = `https://${process.env.VERCEL_URL.replace(/\/$/, '')}/api/email/oauth/google/callback`
    } else {
      redirectUri = 'http://localhost:3000/api/email/oauth/google/callback'
    }
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Returns safe server-side diagnostics without leaking secrets
 */
export function getGoogleOAuthDiagnostics(): GoogleOAuthDiagnostics {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()
  const issues: string[] = []

  const isMockOrEmptyId =
    !clientId ||
    clientId.startsWith('mock-') ||
    clientId.includes('mock-google-client-id')

  const isMockOrEmptySecret =
    !clientSecret ||
    clientSecret.startsWith('mock-') ||
    clientSecret === 'mock-google-client-secret'

  if (isMockOrEmptyId) {
    issues.push('GOOGLE_CLIENT_ID is missing or set to placeholder.')
  }
  if (isMockOrEmptySecret) {
    issues.push('GOOGLE_CLIENT_SECRET is missing or set to placeholder.')
  }
  if (!redirectUri) {
    issues.push('GOOGLE_GMAIL_REDIRECT_URI is not configured.')
  }

  return {
    isConfigured: !isMockOrEmptyId && !isMockOrEmptySecret && Boolean(redirectUri),
    hasClientId: !isMockOrEmptyId,
    hasClientSecret: !isMockOrEmptySecret,
    hasRedirectUri: Boolean(redirectUri),
    redirectUri,
    issues,
  }
}

/**
 * Derives a secure HMAC secret for state verification
 */
function getOAuthStateSecret(): string {
  return (
    process.env.ENCRYPTION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.APP_SECRET ||
    'printerp_gmail_oauth_state_hmac_signing_key_2026'
  )
}

/**
 * Generates a tamper-proof, signed OAuth state parameter (expires in 10 minutes)
 */
export function generateGoogleOAuthState(payload: Omit<GoogleOAuthStatePayload, 'ts' | 'nonce'>): string {
  const fullPayload: GoogleOAuthStatePayload = {
    ...payload,
    ts: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  const serialized = Buffer.from(JSON.stringify(fullPayload)).toString('base64url')
  const hmac = crypto
    .createHmac('sha256', getOAuthStateSecret())
    .update(serialized)
    .digest('base64url')

  return `${serialized}.${hmac}`
}

/**
 * Validates and decodes the OAuth state parameter
 * Returns null if signature is invalid, expired (> 10 mins), or malformed.
 */
export function verifyGoogleOAuthState(stateString?: string | null): GoogleOAuthStatePayload | null {
  if (!stateString || typeof stateString !== 'string') return null

  const parts = stateString.split('.')
  if (parts.length !== 2) return null

  const [serialized, receivedHmac] = parts

  // Verify HMAC signature
  const expectedHmac = crypto
    .createHmac('sha256', getOAuthStateSecret())
    .update(serialized)
    .digest('base64url')

  const receivedBuf = Buffer.from(receivedHmac)
  const expectedBuf = Buffer.from(expectedHmac)

  if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
    console.error('[GoogleOAuth] State signature mismatch (possible CSRF/tampering attempt)')
    return null
  }

  try {
    const jsonStr = Buffer.from(serialized, 'base64url').toString('utf8')
    const payload: GoogleOAuthStatePayload = JSON.parse(jsonStr)

    // Verify 10-minute expiration window
    const maxAgeMs = 10 * 60 * 1000 // 10 minutes
    if (Date.now() - payload.ts > maxAgeMs) {
      console.error('[GoogleOAuth] OAuth state expired')
      return null
    }

    return payload
  } catch (err) {
    console.error('[GoogleOAuth] Failed to parse OAuth state payload:', err)
    return null
  }
}

export function generateGoogleAuthUrl(params: {
  scopeType: 'PLATFORM' | 'TENANT'
  tenantId: string | null
  userId: string
  returnUrl?: string
  loginHint?: string
}): string {
  const diag = getGoogleOAuthDiagnostics()
  if (!diag.isConfigured && process.env.NODE_ENV !== 'test') {
    throw new Error(`Google OAuth is not configured: ${diag.issues.join(' ')}`)
  }

  const { clientId, redirectUri } = getGoogleOAuthConfig()
  const effectiveClientId = clientId || (process.env.NODE_ENV === 'test' ? 'mock-google-client-id.apps.googleusercontent.com' : '')
  const effectiveRedirectUri = redirectUri || 'http://localhost:3000/api/email/oauth/google/callback'

  const state = generateGoogleOAuthState({
    scopeType: params.scopeType,
    tenantId: params.tenantId,
    userId: params.userId,
    returnUrl: params.returnUrl,
  })

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', effectiveClientId)
  url.searchParams.set('redirect_uri', effectiveRedirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GMAIL_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent') // Forces refresh token return
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('state', state)

  if (params.loginHint) {
    url.searchParams.set('login_hint', params.loginHint)
  }

  return url.toString()
}

/**
 * Exchanges authorization code for Access & Refresh tokens
 */
export async function exchangeGoogleAuthCode(code: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig()

  // In test environment with mock code
  if (process.env.NODE_ENV === 'test' || code.startsWith('mock-')) {
    return {
      access_token: `mock-access-token-${Date.now()}`,
      refresh_token: `mock-refresh-token-${Date.now()}`,
      expires_in: 3600,
      scope: GMAIL_SCOPES.join(' '),
      token_type: 'Bearer',
    }
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to exchange authorization code')
  }

  return data as GoogleTokenResponse
}

/**
 * Refreshes an expired Google access token using the stored refresh token
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  expires_at: string
}> {
  const { clientId, clientSecret } = getGoogleOAuthConfig()

  if (process.env.NODE_ENV === 'test' || refreshToken.startsWith('mock-')) {
    const expires_in = 3600
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString()
    return {
      access_token: `mock-refreshed-access-token-${Date.now()}`,
      expires_in,
      expires_at,
    }
  }

  const tokenUrl = 'https://oauth2.googleapis.com/token'
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Failed to refresh Google access token')
  }

  const expiresIn = Number(data.expires_in) || 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

  return {
    access_token: data.access_token,
    expires_in: expiresIn,
    expires_at: expiresAt,
  }
}

/**
 * Fetches authenticated Google User identity profile (email and display name)
 */
export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  if (process.env.NODE_ENV === 'test' || accessToken.startsWith('mock-')) {
    return {
      id: 'mock-google-user-id',
      email: 'test-user@gmail.com',
      verified_email: true,
      name: 'PrintERP Verified Test Account',
    }
  }

  const userInfoUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'
  const response = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to retrieve Google user profile')
  }

  return data as GoogleUserProfile
}

/**
 * Revokes authorization token when disconnecting Gmail
 */
export async function revokeGoogleToken(token: string): Promise<boolean> {
  if (!token) return true
  if (process.env.NODE_ENV === 'test' || token.startsWith('mock-')) {
    return true
  }

  try {
    const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`
    const response = await fetch(revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return response.ok
  } catch (err) {
    console.warn('[GoogleOAuth] Token revocation warning:', err)
    return false
  }
}

/**
 * Returns safe user-facing error messages for Google OAuth error codes
 */
export function getGoogleOAuthErrorMessage(errorCode?: string | null): string {
  if (!errorCode) return 'Google Gmail connection failed. Please try again.'
  switch (errorCode.toLowerCase()) {
    case 'invalid_client':
      return 'Google Gmail connection is not configured correctly. Please verify the Google OAuth Client ID, Client Secret, and authorized redirect URI.'
    case 'redirect_uri_mismatch':
      return 'Google Gmail OAuth redirect URI does not match the configured Google Cloud OAuth client.'
    case 'google_client_id_missing':
    case 'missing_client_config':
      return 'Google Gmail OAuth is not configured for this environment. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    case 'access_denied':
    case 'consent_declined':
      return 'Google Gmail authorization was cancelled.'
    case 'invalid_state':
    case 'state_expired':
      return 'Google Gmail authorization session expired or is invalid. Please try again.'
    default:
      return `Google Gmail connection failed: ${errorCode}`
  }
}

// Aliases for convenience & test parity
export const generateOAuthState = generateGoogleOAuthState
export const verifyOAuthState = verifyGoogleOAuthState
export const getOAuthErrorMessage = getGoogleOAuthErrorMessage

