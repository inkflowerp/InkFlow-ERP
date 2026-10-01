import { NextRequest, NextResponse } from 'next/server'
import { getCurrentPlatformUser, hasPlatformPermission } from '@/lib/auth/platform-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { TenantRepository } from '@/lib/repositories/tenant.repository'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ companyId: string }> }
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Active platform administrator session required.' },
        { status: 401 }
      )
    }

    if (
      !hasPlatformPermission(platformUser, 'tenant.view') &&
      !hasPlatformPermission(platformUser, 'company.view') &&
      !hasPlatformPermission(platformUser, 'company.export')
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient platform permissions to export tenant data.' },
        { status: 403 }
      )
    }

    const { companyId } = await context.params
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Bad Request: Missing company ID.' },
        { status: 400 }
      )
    }

    const admin = createAdminClient()

    // 1. Fetch Company metadata
    const { data: company, error: companyErr } = await (admin as any)
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle()

    if (companyErr || !company) {
      return NextResponse.json(
        { success: false, error: 'Tenant record not found.' },
        { status: 404 }
      )
    }

    // 2. Fetch Subscription details
    const { data: subscriptions } = await (admin as any)
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)

    // 3. Fetch Company Users (with user profile details)
    const rawUsers = await TenantRepository.getCompanyUsers(companyId)
    const exportUsers = (rawUsers || []).map((u) => ({
      id: u.id,
      user_id: u.user_id,
      email: u.profile?.email || u.invited_email || '',
      full_name: u.profile?.full_name || '',
      role: u.role?.name || u.role?.slug || 'member',
      status: u.status,
      created_at: u.created_at,
      last_login_at: u.last_login_at || null,
    }))

    // 4. Construct export archive
    const exportData = {
      archive_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: {
        admin_id: platformUser.id,
        email: platformUser.email,
        name: platformUser.full_name,
      },
      tenant: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        email: company.email,
        phone: company.phone,
        status: company.status,
        plan: company.plan,
        created_at: company.created_at,
        settings: company.settings,
      },
      subscriptions: subscriptions || [],
      users: exportUsers,
    }

    const filename = `tenant-export-${company.slug || companyId}-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error while exporting tenant data.' },
      { status: 500 }
    )
  }
}
