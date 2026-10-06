import { NextResponse, type NextRequest } from 'next/server';
import { verifyAndConsumeSubdomainHandoffToken } from '@/lib/auth/subdomain-handoff';
import { resolveHostname, getAuthCookieOptions } from '@/lib/tenant/tenant-resolution';
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types';
import { checkRateLimitAsync } from '@/lib/security/rate-limiter';
import { signSessionToken } from '@/lib/security/session-signer';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/types/database.types';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const next = request.nextUrl.searchParams.get('next') || '/dashboard';
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

  // 1. Rate-limit handoff attempts
  const rateLimitKey = `handoff:${ip}`;
  const rl = await checkRateLimitAsync(rateLimitKey, 'auth');
  if (!rl.success) {
    return NextResponse.redirect(new URL('/login?error=rate_limited', request.url));
  }

  // 2. Identify and validate the tenant host
  const hostRes = resolveHostname(rawHost);
  if (hostRes.hostType !== 'tenant' || !hostRes.tenantSlug) {
    return NextResponse.redirect(new URL('/login?error=handoff_invalid_host', request.url));
  }

  if (!token) {
    return NextResponse.redirect(new URL('/login?error=missing_handoff_token', request.url));
  }

  // 3. Verify and atomically consume the single-use handoff token
  const result = await verifyAndConsumeSubdomainHandoffToken({
    token,
    expectedSlug: hostRes.tenantSlug,
    requestHost: rawHost,
    ipAddress: ip,
  });

  if (!result.success || !result.sessionData) {
    const errorParam = encodeURIComponent(result.error || 'handoff_failed');
    return NextResponse.redirect(new URL(`/login?error=${errorParam}`, request.url));
  }

  // 4. Set host-only tenant session cookie on the tenant host (cryptographically signed)
  const cookieOpts = getAuthCookieOptions(rawHost);
  const targetPath = next.startsWith('/') ? next : `/${next}`;
  const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url));

  const signedSession = await signSessionToken(result.sessionData, '7d');

  redirectResponse.cookies.set(
    TENANT_SESSION_COOKIE,
    signedSession,
    {
      path: '/',
      maxAge: cookieOpts.maxAge,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
      domain: undefined, // STRICTLY HOST-ONLY!
      httpOnly: cookieOpts.httpOnly,
    }
  );

  // 5. Establish Supabase Auth session on the tenant host (host-only Supabase auth cookies)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const tenantSupabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
        cookieOptions: cookieOpts.domain ? { domain: cookieOpts.domain } : undefined,
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const merged = cookieOpts.domain ? { ...options, domain: cookieOpts.domain } : options;
              redirectResponse.cookies.set(name, value, {
                ...merged,
                domain: undefined, // STRICTLY HOST-ONLY!
              });
            });
          },
        },
      });

      if (result.authTokens?.accessToken && result.authTokens?.refreshToken) {
        try {
          await tenantSupabase.auth.setSession({
            access_token: result.authTokens.accessToken,
            refresh_token: result.authTokens.refreshToken,
          });
        } catch (setSessErr) {
          console.warn('[handoff] Supabase setSession failed, attempting magic link fallback:', setSessErr);
        }
      }

      // If setSession didn't establish session or tokens not available, attempt link generation
      if (result.email) {
        const { data: userCheck } = await tenantSupabase.auth.getUser();
        if (!userCheck?.user) {
          try {
            const admin = createAdminClient();
            const { data: linkData } = await admin.auth.admin.generateLink({
              type: 'magiclink',
              email: result.email,
            });
            if (linkData?.properties?.hashed_token) {
              await tenantSupabase.auth.verifyOtp({
                token_hash: linkData.properties.hashed_token,
                type: 'magiclink',
              });
            }
          } catch (linkErr) {
            console.warn('[handoff] Magic link token exchange failed:', linkErr);
          }
        }
      }
    } catch (sbErr) {
      console.warn('[handoff] Supabase SSR client initialization failed:', sbErr);
    }
  }

  return redirectResponse;
}
