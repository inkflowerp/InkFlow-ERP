import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { TenantSessionData } from '@/lib/auth/types';
import { AuditService } from '@/services/audit.service';

export interface CreateHandoffTokenParams {
  userId: string;
  email: string;
  slug: string;
  sessionData?: TenantSessionData | null;
}

export interface VerifyHandoffTokenParams {
  token: string;
  expectedSlug: string;
  requestHost?: string;
  ipAddress?: string;
}

export interface VerifyHandoffResult {
  success: boolean;
  error?: string;
  sessionData?: TenantSessionData;
  userId?: string;
  email?: string;
  slug?: string;
}

/**
 * Creates a cryptographically secure, single-use subdomain handoff token.
 * Valid for <= 60 seconds.
 */
export async function createSubdomainHandoffToken(
  params: CreateHandoffTokenParams
): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 60s max lifetime

  const adminClient = createAdminClient();

  const { error } = await adminClient.from('auth_verifications').insert({
    user_id: params.userId,
    email: params.email.toLowerCase().trim(),
    purpose: 'subdomain_handoff',
    token_hash: tokenHash,
    expires_at: expiresAt,
    is_used: false,
    attempts: 0,
    max_attempts: 1,
    metadata: {
      slug: params.slug.toLowerCase().trim(),
      session_data: params.sessionData || null,
    } as any,
  });

  if (error) {
    console.error('[createSubdomainHandoffToken] Failed to persist handoff token:', error);
    throw new Error('Failed to generate secure handoff token');
  }

  return rawToken;
}

/**
 * Validates and atomically consumes a single-use subdomain handoff token.
 * Performs constant-time token hash verification and tenant slug binding checks.
 */
export async function verifyAndConsumeSubdomainHandoffToken(
  params: VerifyHandoffTokenParams
): Promise<VerifyHandoffResult> {
  const { token, expectedSlug, requestHost, ipAddress } = params;

  if (!token || typeof token !== 'string' || token.length < 32) {
    return { success: false, error: 'Invalid handoff token format' };
  }

  const incomingHash = crypto.createHash('sha256').update(token).digest('hex');
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  // 1. Fetch active verification record
  const { data: record, error: fetchErr } = await adminClient
    .from('auth_verifications')
    .select('*')
    .eq('purpose', 'subdomain_handoff')
    .eq('token_hash', incomingHash)
    .eq('is_used', false)
    .gt('expires_at', now)
    .maybeSingle();

  if (fetchErr || !record) {
    console.warn(`[verifyAndConsumeSubdomainHandoffToken] Token lookup failed or expired for ${expectedSlug}`);
    try {
      await adminClient.from('platform_audit_logs').insert({
        action: 'auth.subdomain_handoff_failed',
        entity_type: 'auth',
        details: { expectedSlug, requestHost, ipAddress, reason: 'Token expired, invalid, or already consumed' },
      });
    } catch {}
    return { success: false, error: 'Handoff token expired or invalid' };
  }

  // 2. Constant-time hash verification
  const storedHash = record.token_hash || '';
  const storedHashBuf = Buffer.from(storedHash, 'hex');
  const incomingHashBuf = Buffer.from(incomingHash, 'hex');
  if (!storedHash || storedHashBuf.length !== incomingHashBuf.length || !crypto.timingSafeEqual(storedHashBuf, incomingHashBuf)) {
    return { success: false, error: 'Cryptographic hash mismatch' };
  }

  // 3. Verify target slug matches the tenant host
  const tokenSlug = (record.metadata as any)?.slug?.toLowerCase()?.trim();
  const cleanExpectedSlug = expectedSlug.toLowerCase().trim();

  if (tokenSlug !== cleanExpectedSlug) {
    console.error(`[verifyAndConsumeSubdomainHandoffToken] SLUG MISMATCH: token for "${tokenSlug}" presented on "${cleanExpectedSlug}"`);
    try {
      await adminClient.from('platform_audit_logs').insert({
        action: 'auth.subdomain_handoff_spoof_attempt',
        entity_type: 'auth',
        details: { tokenSlug, expectedSlug: cleanExpectedSlug, requestHost, ipAddress },
      });
    } catch {}
    return { success: false, error: 'Tenant boundary mismatch' };
  }

  // 4. Atomically consume the token (prevents concurrent replay)
  const { data: updated, error: updateErr } = await adminClient
    .from('auth_verifications')
    .update({
      is_used: true,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', record.id)
    .eq('is_used', false)
    .select('id')
    .maybeSingle();

  if (updateErr || !updated) {
    return { success: false, error: 'Token already consumed concurrently' };
  }

  const sessionData = (record.metadata as any)?.session_data as TenantSessionData | undefined;

  return {
    success: true,
    sessionData,
    userId: record.user_id || undefined,
    email: record.email || undefined,
    slug: tokenSlug,
  };
}
