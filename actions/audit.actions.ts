'use server'

import { AuditService } from '@/services/audit.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export async function getAuditLogsAction(searchTerm?: string) {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    return { success: false, error: 'Unauthorized: No active tenant context.' }
  }

  // Audit logs require owner or view permissions
  if (
    tenant.companyRole !== 'business_owner' &&
    !tenant.permissions.includes('settings.view') &&
    !tenant.permissions.includes('audit.view')
  ) {
    return { success: false, error: 'Unauthorized: Insufficient permissions to view audit records.' }
  }

  return await AuditService.getAuditLogs(tenant.companyId, searchTerm)
}
