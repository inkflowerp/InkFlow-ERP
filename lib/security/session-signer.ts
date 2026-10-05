import { SignJWT, jwtVerify } from 'jose'

function getSessionSecret(): Uint8Array {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXTAUTH_SECRET ||
    'printflow-secure-session-signing-key-minimum-32-bytes!'
  return new TextEncoder().encode(secret)
}

/**
 * Signs a payload into an HMAC-SHA256 JWT using server secret.
 */
export async function signSessionToken(
  payload: Record<string, any>,
  expiresIn = '7d'
): Promise<string> {
  const secret = getSessionSecret()
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

/**
 * Cryptographically verifies an HMAC-SHA256 JWT session token.
 * Returns null if token is tampered, expired, or invalid.
 */
export async function verifySessionToken<T = Record<string, any>>(
  token: string | undefined | null
): Promise<T | null> {
  if (!token || typeof token !== 'string') return null
  try {
    const secret = getSessionSecret()
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    })
    return payload as unknown as T
  } catch {
    return null
  }
}
