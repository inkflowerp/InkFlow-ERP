import { NextResponse, type NextRequest } from 'next/server';
import { verifyAndConsumeSubdomainHandoffToken } from '@/lib/auth/subdomain-handoff';
import { resolveHostname, getAuthCookieOptions } from '@/lib/tenant/tenant-resolution';
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types';
import { checkRateLimitAsync } from '@/lib/security/rate-limiter';

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

  // 4. Set host-only tenant session cookie on the tenant host
  const cookieOpts = getAuthCookieOptions(rawHost);
  const targetPath = next.startsWith('/') ? next : `/${next}`;
  const redirectResponse = NextResponse.redirect(new URL(targetPath, request.url));

  redirectResponse.cookies.set(
    TENANT_SESSION_COOKIE,
    encodeURIComponent(JSON.stringify(result.sessionData)),
    {
      path: '/',
      maxAge: cookieOpts.maxAge,
      sameSite: cookieOpts.sameSite,
      secure: cookieOpts.secure,
      domain: undefined, // STRICTLY HOST-ONLY!
      httpOnly: cookieOpts.httpOnly,
    }
  );

  return redirectResponse;
}
