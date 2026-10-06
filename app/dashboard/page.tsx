import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getTenantRedirectSlug, getCurrentTenant } from '@/lib/auth/tenant-auth';
import { getTenantBaseUrl } from '@/lib/tenant/tenant-url';
import { createSubdomainHandoffToken } from '@/lib/auth/subdomain-handoff';

export default async function GlobalDashboardRedirect() {
  const slug = await getTenantRedirectSlug();
  try {
    const headerStore = await headers();
    const host = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').toLowerCase();
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      redirect(`/${slug}/dashboard`);
    }
  } catch {}

  const tenant = await getCurrentTenant(slug);
  if (tenant) {
    try {
      const handoffToken = await createSubdomainHandoffToken({
        userId: tenant.userId,
        email: tenant.userEmail,
        slug,
        sessionData: {
          userId: tenant.userId,
          userEmail: tenant.userEmail,
          fullName: tenant.fullName || 'User',
          fullNameBn: tenant.fullNameBn || null,
          phone: tenant.phone || null,
          companyId: tenant.companyId,
          companySlug: tenant.companySlug,
          companyName: tenant.companyName,
          companyNameBn: tenant.companyNameBn || null,
          branchId: tenant.branchId || 'br-main',
          branchName: tenant.branchName || 'Main Branch',
          role: tenant.companyRole,
          primaryRole: tenant.primaryRole || tenant.companyRole || 'business_owner',
          responsibilities: tenant.responsibilities || [],
          permissions: tenant.permissions || [],
          loginTime: new Date().toISOString(),
          token: `sess_${tenant.userId}_${Date.now()}`,
        },
      });
      redirect(`${getTenantBaseUrl(slug)}/api/auth/handoff?token=${handoffToken}&next=/dashboard`);
    } catch {}
  }

  redirect(`${getTenantBaseUrl(slug)}/login`);
}
