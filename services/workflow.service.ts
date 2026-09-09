// ==============================================================================
// PrintERP SaaS - Phase 25: Structured Workflow Automation Engine
// Deterministic trigger-condition-action pipeline without unrestricted code evaluation.
// ==============================================================================

import {
  WorkflowRule,
  WorkflowExecutionLog,
  WorkflowTriggerType,
  WorkflowTriggerEntity,
  WorkflowActionItem,
  WorkflowCondition,
} from '@/types/workflow.types'
import { ApiResponse } from '@/types/common.types'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin'

// Production workflow automation rule templates
export const SEEDED_WORKFLOW_RULES: WorkflowRule[] = [
  {
    id: 'wf-rule-01',
    company_id: 'c-01',
    name: 'Quotation Approved ➔ Auto-Create Order',
    description: 'Automatically converts an approved quotation into a booked Job Order with media specifications.',
    is_active: true,
    trigger_type: 'status_changed',
    trigger_entity: 'quotation',
    trigger_config: { to_status: 'approved' },
    conditions: [],
    actions: [
      {
        id: 'act-01',
        type: 'create_document',
        config: { target_document: 'order', copy_items: true, note: 'Generated from approved quote' },
      },
      {
        id: 'act-02',
        type: 'send_notification',
        config: { title: 'Order Generated', message: 'Job order automatically spawned from approved quotation.' },
      },
    ],
    execution_count: 14,
    last_executed_at: '2026-09-03T10:45:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T10:45:00Z',
  },
  {
    id: 'wf-rule-02',
    company_id: 'c-01',
    name: 'Order Confirmed ➔ Create Production Jobs',
    description: 'Generates digital press or CNC acrylic fabrication job tickets upon order confirmation.',
    is_active: true,
    trigger_type: 'status_changed',
    trigger_entity: 'order',
    trigger_config: { to_status: 'confirmed' },
    conditions: [],
    actions: [
      {
        id: 'act-03',
        type: 'create_document',
        config: { target_document: 'production_job', machine_allocation: 'auto_by_material' },
      },
      {
        id: 'act-04',
        type: 'change_status',
        config: { target: 'order', new_status: 'in_prepress' },
      },
    ],
    execution_count: 28,
    last_executed_at: '2026-09-03T11:20:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T11:20:00Z',
  },
  {
    id: 'wf-rule-03',
    company_id: 'c-01',
    name: 'Design Approved ➔ Route to Production Press',
    description: 'Routes prepress approved vector artwork to the allocated print machine floor queue.',
    is_active: true,
    trigger_type: 'approval_completed',
    trigger_entity: 'design',
    trigger_config: { approval_type: 'prepress_proof' },
    conditions: [],
    actions: [
      {
        id: 'act-05',
        type: 'change_status',
        config: { target: 'job', new_status: 'queued_for_print' },
      },
      {
        id: 'act-06',
        type: 'send_notification',
        config: { title: 'Artwork Approved for Press', message: 'Job ready for plate burning or solvent press mounting.' },
      },
    ],
    execution_count: 19,
    last_executed_at: '2026-09-03T12:05:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T12:05:00Z',
  },
  {
    id: 'wf-rule-04',
    company_id: 'c-01',
    name: 'Production Completed ➔ Notify Sales Team',
    description: 'Alerts sales representatives when the print job finishes and passes QC inspection.',
    is_active: true,
    trigger_type: 'status_changed',
    trigger_entity: 'job',
    trigger_config: { to_status: 'completed' },
    conditions: [],
    actions: [
      {
        id: 'act-07',
        type: 'send_notification',
        config: { title: 'Job Print Complete', role: 'sales_manager', message: 'Print and finishing completed for order.' },
      },
      {
        id: 'act-08',
        type: 'send_whatsapp',
        config: { template: 'order_ready_client', recipient: 'customer_phone' },
      },
    ],
    execution_count: 32,
    last_executed_at: '2026-09-03T13:30:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T13:30:00Z',
  },
  {
    id: 'wf-rule-05',
    company_id: 'c-01',
    name: 'Order Ready ➔ Create Delivery Task',
    description: 'Creates a dispatch challan and assigns an installation or delivery rider.',
    is_active: true,
    trigger_type: 'status_changed',
    trigger_entity: 'order',
    trigger_config: { to_status: 'ready' },
    conditions: [],
    actions: [
      {
        id: 'act-09',
        type: 'create_task',
        config: { task_type: 'delivery', priority: 'high', auto_assign: true },
      },
      {
        id: 'act-10',
        type: 'assign_employee',
        config: { role: 'delivery_rider' },
      },
    ],
    execution_count: 11,
    last_executed_at: '2026-09-03T14:15:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T14:15:00Z',
  },
  {
    id: 'wf-rule-06',
    company_id: 'c-01',
    name: 'Invoice Overdue ➔ Multi-Channel Reminder',
    description: 'Dispatches SMS and WhatsApp payment reminder when invoice reaches overdue status.',
    is_active: true,
    trigger_type: 'date_reached',
    trigger_entity: 'invoice',
    trigger_config: { condition: 'overdue_days >= 3' },
    conditions: [
      { field: 'due_amount', operator: 'greater_than', value: 0 },
    ],
    actions: [
      {
        id: 'act-11',
        type: 'send_sms',
        config: { message: 'Gentle reminder: Your invoice is overdue. Kindly settle via bKash or Bank.' },
      },
      {
        id: 'act-12',
        type: 'create_task',
        config: { task_type: 'payment_follow_up', assign_to: 'accountant' },
      },
    ],
    execution_count: 9,
    last_executed_at: '2026-09-03T15:00:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T15:00:00Z',
  },
  {
    id: 'wf-rule-07',
    company_id: 'c-01',
    name: 'Stock Below Minimum ➔ Alert Purchase Manager',
    description: 'Alerts raw material procurement team when roll media or ink chemistry breaches reorder point.',
    is_active: true,
    trigger_type: 'stock_threshold',
    trigger_entity: 'material',
    trigger_config: { threshold_type: 'below_min_stock_level' },
    conditions: [],
    actions: [
      {
        id: 'act-13',
        type: 'send_notification',
        config: { title: 'Low Stock Reorder Alert', message: 'Material level breached safety buffer. Reorder required.' },
      },
      {
        id: 'act-14',
        type: 'create_task',
        config: { task_type: 'rfq_supplier', priority: 'urgent' },
      },
    ],
    execution_count: 7,
    last_executed_at: '2026-09-03T15:40:00Z',
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-09-03T15:40:00Z',
  },
]

// Seeded execution logs
let memoryExecutionLogs: WorkflowExecutionLog[] = [
  {
    id: 'log-01',
    company_id: 'c-01',
    rule_id: 'wf-rule-01',
    rule_name: 'Quotation Approved ➔ Auto-Create Order',
    trigger_type: 'status_changed',
    entity_type: 'quotation',
    entity_id: 'QT-2026-089',
    status: 'success',
    actions_taken: [
      { action_type: 'create_document', status: 'completed', detail: 'Generated Job Order ORD-2026-104 with 2 line items' },
      { action_type: 'send_notification', status: 'completed', detail: 'Dispatched alert to Sales & Production channels' },
    ],
    executed_at: '2026-09-03T10:45:00Z',
  },
  {
    id: 'log-02',
    company_id: 'c-01',
    rule_id: 'wf-rule-02',
    rule_name: 'Order Confirmed ➔ Create Production Jobs',
    trigger_type: 'status_changed',
    entity_type: 'order',
    entity_id: 'ORD-2026-101',
    status: 'success',
    actions_taken: [
      { action_type: 'create_document', status: 'completed', detail: 'Created Press Job Ticket JOB-2026-101 (Konica 512i)' },
      { action_type: 'change_status', status: 'completed', detail: 'Updated Order status to in_prepress' },
    ],
    executed_at: '2026-09-03T11:20:00Z',
  },
  {
    id: 'log-03',
    company_id: 'c-01',
    rule_id: 'wf-rule-04',
    rule_name: 'Production Completed ➔ Notify Sales Team',
    trigger_type: 'status_changed',
    entity_type: 'job',
    entity_id: 'JOB-2026-098',
    status: 'success',
    actions_taken: [
      { action_type: 'send_notification', status: 'completed', detail: 'Notified Sales Manager: 500 SFT Flex job ready' },
      { action_type: 'send_whatsapp', status: 'completed', detail: 'WhatsApp template sent to +8801711223344' },
    ],
    executed_at: '2026-09-03T13:30:00Z',
  },
  {
    id: 'log-04',
    company_id: 'c-01',
    rule_id: 'wf-rule-07',
    rule_name: 'Stock Below Minimum ➔ Alert Purchase Manager',
    trigger_type: 'stock_threshold',
    entity_type: 'material',
    entity_id: 'MAT-INK-MG',
    status: 'success',
    actions_taken: [
      { action_type: 'send_notification', status: 'completed', detail: 'Alerted Warehouse Manager: Magenta Ink stock at 3L (Min: 5L)' },
      { action_type: 'create_task', status: 'completed', detail: 'Created RFQ task to Meghna Printing Media' },
    ],
    executed_at: '2026-09-03T15:40:00Z',
  },
]

import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

let memoryRules: WorkflowRule[] = typeof window !== 'undefined'
  ? (PrintERPDataStore.get<WorkflowRule[]>(STORAGE_KEYS.AUTOMATION_RULES) || [...SEEDED_WORKFLOW_RULES])
  : [...SEEDED_WORKFLOW_RULES]

export class WorkflowService {
  /**
   * Fetch all workflow rules for a company
   */
  static async getRules(companyId: string): Promise<ApiResponse<WorkflowRule[]>> {
    try {
      if (typeof window !== 'undefined') {
        const stored = PrintERPDataStore.get<WorkflowRule[]>(STORAGE_KEYS.AUTOMATION_RULES)
        if (stored && stored.length > 0) memoryRules = stored
      }
      const results = memoryRules.filter((r) => r.company_id === companyId || r.company_id === 'c-01')
      return { success: true, data: results }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch rules' }
    }
  }

  /**
   * Toggle a rule active/inactive
   */
  static async toggleRule(
    companyId: string,
    ruleId: string,
    isActive: boolean
  ): Promise<ApiResponse<WorkflowRule>> {
    const rule = memoryRules.find((r) => r.id === ruleId)
    if (!rule) {
      return { success: false, error: 'Rule not found' }
    }

    rule.is_active = isActive
    rule.updated_at = new Date().toISOString()
    PrintERPDataStore.set(STORAGE_KEYS.AUTOMATION_RULES, memoryRules)

    try {
      const supabase = createAdminClient()
      await (supabase as any)
        .from('workflow_rules')
        .update({ is_active: isActive, updated_at: rule.updated_at })
        .eq('id', ruleId)
        .eq('company_id', companyId)
    } catch {
      // Local dev pass
    }

    return { success: true, data: rule }
  }

  /**
   * Save (create or update) a workflow rule
   */
  static async saveRule(
    companyId: string,
    ruleData: Partial<WorkflowRule>
  ): Promise<ApiResponse<WorkflowRule>> {
    try {
      if (!ruleData.name || !ruleData.trigger_type || !ruleData.trigger_entity) {
        return { success: false, error: 'Rule name, trigger type, and trigger entity are required.' }
      }

      if (ruleData.id) {
        const idx = memoryRules.findIndex((r) => r.id === ruleData.id)
        if (idx >= 0) {
          memoryRules[idx] = {
            ...memoryRules[idx],
            ...ruleData,
            updated_at: new Date().toISOString(),
          } as WorkflowRule
          PrintERPDataStore.set(STORAGE_KEYS.AUTOMATION_RULES, memoryRules)
          return { success: true, data: memoryRules[idx] }
        }
      }

      const newRule: WorkflowRule = {
        id: `wf-rule-${Date.now()}`,
        company_id: companyId,
        name: ruleData.name,
        description: ruleData.description || '',
        is_active: ruleData.is_active ?? true,
        trigger_type: ruleData.trigger_type,
        trigger_entity: ruleData.trigger_entity,
        trigger_config: ruleData.trigger_config || {},
        conditions: ruleData.conditions || [],
        actions: ruleData.actions || [],
        execution_count: 0,
        last_executed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      memoryRules.unshift(newRule)
      PrintERPDataStore.set(STORAGE_KEYS.AUTOMATION_RULES, memoryRules)
      return { success: true, data: newRule }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save workflow rule' }
    }
  }

  /**
   * Delete a workflow rule
   */
  static async deleteRule(companyId: string, ruleId: string): Promise<ApiResponse<boolean>> {
    memoryRules = memoryRules.filter((r) => r.id !== ruleId)
    PrintERPDataStore.set(STORAGE_KEYS.AUTOMATION_RULES, memoryRules)
    return { success: true, data: true }
  }

  /**
   * Fetch execution audit logs
   */
  static async getExecutionLogs(companyId: string): Promise<ApiResponse<WorkflowExecutionLog[]>> {
    const logs = memoryExecutionLogs.filter(
      (l) => l.company_id === companyId || l.company_id === 'c-01'
    )
    return { success: true, data: logs }
  }

  /**
   * Core Dispatcher: Evaluates triggers against active rules and executes structured actions
   */
  static async dispatchTrigger(
    companyId: string,
    triggerType: WorkflowTriggerType,
    triggerEntity: WorkflowTriggerEntity,
    entityId: string,
    context: Record<string, any> = {}
  ): Promise<WorkflowExecutionLog[]> {
    const activeRules = memoryRules.filter(
      (r) =>
        (r.company_id === companyId || r.company_id === 'c-01') &&
        r.is_active &&
        r.trigger_type === triggerType &&
        r.trigger_entity === triggerEntity
    )

    const logs: WorkflowExecutionLog[] = []

    for (const rule of activeRules) {
      // 1. Evaluate Trigger Config Filter
      let triggerMatches = true
      if (rule.trigger_config?.to_status && context.to_status) {
        if (rule.trigger_config.to_status !== context.to_status) {
          triggerMatches = false
        }
      }
      if (rule.trigger_config?.approval_type && context.approval_type) {
        if (rule.trigger_config.approval_type !== context.approval_type) {
          triggerMatches = false
        }
      }

      if (!triggerMatches) continue

      // 2. Evaluate Conditions
      let conditionsMet = true
      for (const cond of rule.conditions) {
        const val = context[cond.field]
        if (cond.operator === 'equals' && val !== cond.value) conditionsMet = false
        if (cond.operator === 'not_equals' && val === cond.value) conditionsMet = false
        if (cond.operator === 'greater_than' && Number(val) <= Number(cond.value)) conditionsMet = false
        if (cond.operator === 'less_than' && Number(val) >= Number(cond.value)) conditionsMet = false
        if (cond.operator === 'contains' && !String(val).includes(String(cond.value))) conditionsMet = false
      }

      if (!conditionsMet) {
        const skipLog: WorkflowExecutionLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          company_id: companyId,
          rule_id: rule.id,
          rule_name: rule.name,
          trigger_type: triggerType,
          entity_type: triggerEntity,
          entity_id: entityId,
          status: 'skipped',
          actions_taken: [{ action_type: 'condition_check', status: 'failed', detail: 'Conditions not satisfied' }],
          executed_at: new Date().toISOString(),
        }
        memoryExecutionLogs.unshift(skipLog)
        logs.push(skipLog)
        continue
      }

      // 3. Execute Structured Actions Safely
      const actionsTaken: WorkflowExecutionLog['actions_taken'] = []
      let overallStatus: 'success' | 'failed' = 'success'
      let errorMessage: string | undefined

      for (const action of rule.actions) {
        try {
          const detail = this.executeStructuredAction(action, triggerEntity, entityId, context)
          actionsTaken.push({ action_type: action.type, status: 'completed', detail })
        } catch (err: any) {
          overallStatus = 'failed'
          errorMessage = err.message || 'Action failed'
          actionsTaken.push({ action_type: action.type, status: 'failed', detail: errorMessage || 'Action failed' })
        }
      }

      rule.execution_count += 1
      rule.last_executed_at = new Date().toISOString()

      const log: WorkflowExecutionLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        company_id: companyId,
        rule_id: rule.id,
        rule_name: rule.name,
        trigger_type: triggerType,
        entity_type: triggerEntity,
        entity_id: entityId,
        status: overallStatus,
        actions_taken: actionsTaken,
        error_message: errorMessage,
        executed_at: new Date().toISOString(),
      }

      memoryExecutionLogs.unshift(log)
      logs.push(log)
    }

    return logs
  }

  /**
   * Deterministic action execution (No unrestricted code execution)
   */
  private static executeStructuredAction(
    action: WorkflowActionItem,
    entityType: string,
    entityId: string,
    context: Record<string, any>
  ): string {
    switch (action.type) {
      case 'change_status':
        return `Updated ${action.config.target || entityType} status to '${action.config.new_status}'`

      case 'create_task':
        return `Created ${action.config.task_type || 'operational'} task with ${action.config.priority || 'normal'} priority`

      case 'send_notification':
        return `Dispatched in-app notification: "${action.config.title || 'Workflow Event'}"`

      case 'send_sms':
        return `Dispatched SMS to client: "${action.config.message?.slice(0, 40)}..."`

      case 'send_whatsapp':
        return `Dispatched WhatsApp template '${action.config.template || 'generic'}' to ${action.config.recipient || 'client'}`

      case 'create_document':
        return `Auto-generated ${action.config.target_document || 'document'} record linked to ${entityType} ${entityId}`

      case 'assign_employee':
        return `Assigned task to employee with role '${action.config.role || 'operator'}'`

      default:
        return `Executed ${action.type}`
    }
  }

  /**
   * Test-run simulation helper for the UI
   */
  static async simulateRuleRun(companyId: string, ruleId: string): Promise<ApiResponse<WorkflowExecutionLog>> {
    const rule = memoryRules.find((r) => r.id === ruleId)
    if (!rule) {
      return { success: false, error: 'Rule not found' }
    }

    const testLogs = await this.dispatchTrigger(
      companyId,
      rule.trigger_type,
      rule.trigger_entity,
      'SIM-TEST-001',
      {
        to_status: rule.trigger_config?.to_status || 'approved',
        approval_type: rule.trigger_config?.approval_type || 'prepress_proof',
        due_amount: 50000,
        customer_phone: '+8801711223344',
      }
    )

    if (testLogs.length > 0) {
      return { success: true, data: testLogs[0] }
    }

    return { success: false, error: 'Rule simulation did not trigger' }
  }
}
