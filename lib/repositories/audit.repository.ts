import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AuditLogEntry, DeviceMetadata } from '@/types/audit.types'
import { sanitizeForLog } from '@/lib/security/secrets'

export class AuditRepository {
  static async logEvent(params: {
    companyId: string
    userId?: string | null
    userEmail?: string | null
    action: string
    entity: string
    entityId?: string | null
    previousValue?: Record<string, any> | null
    newValue?: Record<string, any> | null
    description?: string | null
    ipAddress?: string | null
    deviceMetadata?: DeviceMetadata | null
  }): Promise<AuditLogEntry> {
    const sanitizedPrev = params.previousValue ? sanitizeForLog(params.previousValue) : null
    const sanitizedNew = params.newValue ? sanitizeForLog(params.newValue) : null

    const admin = createAdminClient()
    const payload: any = {
      company_id: params.companyId,
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId || null,
      previous_value: sanitizedPrev,
      new_value: sanitizedNew,
      description: params.description || null,
      ip_address: params.ipAddress || null,
      device_metadata: params.deviceMetadata || null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await (admin as any)
      .from('audit_logs')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error(`[AuditRepository] Failed to write audit log: ${error.message}`)
      return {
        id: `aud-${Date.now()}`,
        company_id: params.companyId,
        user_id: params.userId || null,
        user_email: params.userEmail || 'system',
        action: params.action as any,
        entity: params.entity as any,
        entity_id: params.entityId || null,
        previous_value: sanitizedPrev,
        new_value: sanitizedNew,
        timestamp: new Date().toISOString(),
        description: params.description || undefined,
      }
    }

    return {
      id: data.id,
      company_id: data.company_id,
      user_id: data.user_id,
      user_email: data.user_email || params.userEmail || 'system',
      action: data.action,
      entity: data.entity || data.entity_type,
      entity_id: data.entity_id,
      previous_value: data.previous_value || data.old_values,
      new_value: data.new_value || data.new_values,
      timestamp: data.created_at || new Date().toISOString(),
      ip_address: data.ip_address,
      device_metadata: data.device_metadata,
      description: data.description,
    }
  }

  static async getLogs(companyId: string, options?: {
    entity?: string
    action?: string
    userId?: string
    limit?: number
  }): Promise<AuditLogEntry[]> {
    const supabase = await createClient()
    let query = (supabase as any)
      .from('audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(options?.limit || 100)

    if (options?.entity) {
      query = query.or(`entity.eq.${options.entity},entity_type.eq.${options.entity}`)
    }
    if (options?.action) {
      query = query.eq('action', options.action)
    }
    if (options?.userId) {
      query = query.eq('user_id', options.userId)
    }

    const { data, error } = await query
    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`)
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      company_id: row.company_id,
      user_id: row.user_id,
      user_email: row.user_email || 'authenticated_user',
      action: row.action,
      entity: row.entity,
      entity_id: row.entity_id,
      previous_value: row.previous_value,
      new_value: row.new_value,
      timestamp: row.created_at,
      ip_address: row.ip_address,
      device_metadata: row.device_metadata,
      description: row.description,
    }))
  }
}
