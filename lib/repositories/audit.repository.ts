import { createAdminClient } from '../supabase/admin.ts'
import type { AuditLogEntry, DeviceMetadata } from '../../types/audit.types.ts'
import { sanitizeForLog } from '../security/secrets.ts'

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
    let sanitizedNew = params.newValue ? sanitizeForLog(params.newValue) : null

    // Ensure description is embedded cleanly inside new_values if provided
    if (params.description) {
      if (!sanitizedNew || typeof sanitizedNew !== 'object') {
        sanitizedNew = { description: params.description }
      } else {
        sanitizedNew = { ...sanitizedNew, description: params.description }
      }
    }

    try {
      const admin = createAdminClient()
      const userAgentStr = params.deviceMetadata ? JSON.stringify(params.deviceMetadata) : null

      // Use schema-conforming payload (supporting both legacy entity_type/old_values and entity/previous_value)
      const payload: any = {
        company_id: params.companyId,
        user_id: params.userId || null,
        action: params.action,
        entity_type: params.entity,
        entity_id: params.entityId || null,
        old_values: sanitizedPrev,
        new_values: sanitizedNew,
        ip_address: params.ipAddress || null,
        user_agent: userAgentStr,
        created_at: new Date().toISOString(),
      }

      const { data, error } = await (admin as any)
        .from('audit_logs')
        .insert(payload)
        .select()
        .single()

      if (!error && data) {
        return {
          id: data.id,
          company_id: data.company_id,
          user_id: data.user_id,
          user_email: params.userEmail || 'system',
          action: data.action,
          entity: data.entity_type || data.entity || params.entity,
          entity_id: data.entity_id,
          previous_value: data.old_values || data.previous_value,
          new_value: data.new_values || data.new_value,
          timestamp: data.created_at || new Date().toISOString(),
          ip_address: data.ip_address,
          device_metadata: params.deviceMetadata,
          description: params.description || undefined,
        }
      }
    } catch {
      // Fail closed / gracefully without crashing caller workflow
    }

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

  static async getLogs(companyId: string, options?: {
    entity?: string
    action?: string
    userId?: string
    limit?: number
  }): Promise<AuditLogEntry[]> {
    try {
      const supabase = createAdminClient()
      let query = (supabase as any)
        .from('audit_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(options?.limit || 100)

      if (options?.entity) {
        query = query.or(`entity_type.eq.${options.entity},entity.eq.${options.entity}`)
      }
      if (options?.action) {
        query = query.eq('action', options.action)
      }
      if (options?.userId) {
        query = query.eq('user_id', options.userId)
      }

      const { data, error } = await query
      if (!error && data) {
        return (data || []).map((row: any) => ({
          id: row.id,
          company_id: row.company_id,
          user_id: row.user_id,
          user_email: row.user_email || 'authenticated_user',
          action: row.action,
          entity: row.entity_type || row.entity,
          entity_id: row.entity_id,
          previous_value: row.old_values || row.previous_value,
          new_value: row.new_values || row.new_value,
          timestamp: row.created_at,
          ip_address: row.ip_address,
          device_metadata: row.device_metadata,
          description: row.description || row.new_values?.description || row.new_value?.description,
        }))
      }
    } catch {}

    return []
  }
}
