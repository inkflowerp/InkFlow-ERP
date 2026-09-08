// ==============================================================================
// PrintERP SaaS - Phase 25: Workflow Automation Types
// Strictly structured triggers, condition rules, and deterministic action pipelines.
// ==============================================================================

export type WorkflowTriggerType =
  | 'record_created'
  | 'status_changed'
  | 'payment_received'
  | 'date_reached'
  | 'stock_threshold'
  | 'approval_completed'

export type WorkflowTriggerEntity =
  | 'quotation'
  | 'order'
  | 'design'
  | 'job'
  | 'invoice'
  | 'payment'
  | 'material'
  | 'delivery'
  | 'customer'

export type WorkflowActionType =
  | 'change_status'
  | 'create_task'
  | 'send_notification'
  | 'send_sms'
  | 'send_whatsapp'
  | 'create_document'
  | 'assign_employee'

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'

export interface WorkflowCondition {
  field: string
  operator: ConditionOperator
  value: any
}

export interface WorkflowActionItem {
  id?: string
  type: WorkflowActionType
  config: Record<string, any>
}

export interface WorkflowRule {
  id: string
  company_id: string
  name: string
  description?: string
  is_active: boolean
  trigger_type: WorkflowTriggerType
  trigger_entity: WorkflowTriggerEntity
  trigger_config: Record<string, any>
  conditions: WorkflowCondition[]
  actions: WorkflowActionItem[]
  execution_count: number
  last_executed_at?: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowExecutionLog {
  id: string
  company_id: string
  rule_id?: string | null
  rule_name: string
  trigger_type: string
  entity_type: string
  entity_id?: string | null
  status: 'success' | 'failed' | 'skipped'
  actions_taken: Array<{
    action_type: string
    status: 'completed' | 'failed'
    detail: string
  }>
  error_message?: string | null
  executed_at: string
}

export interface TriggerOptionDefinition {
  type: WorkflowTriggerType
  label: string
  labelBn: string
  description: string
  supportedEntities: WorkflowTriggerEntity[]
}

export interface ActionOptionDefinition {
  type: WorkflowActionType
  label: string
  labelBn: string
  description: string
}

export const TRIGGER_DEFINITIONS: TriggerOptionDefinition[] = [
  {
    type: 'record_created',
    label: 'Record Created',
    labelBn: 'নতুন রেকর্ড তৈরি',
    description: 'Triggers when a new entity (Order, Quotation, Customer, etc.) is created',
    supportedEntities: ['quotation', 'order', 'invoice', 'customer', 'material'],
  },
  {
    type: 'status_changed',
    label: 'Status Changed',
    labelBn: 'স্ট্যাটাস পরিবর্তন',
    description: 'Triggers when an entity transitions to a target state (e.g. Approved, Ready, Completed)',
    supportedEntities: ['quotation', 'order', 'job', 'invoice', 'delivery'],
  },
  {
    type: 'payment_received',
    label: 'Payment Received',
    labelBn: 'পেমেন্ট গ্রহণ',
    description: 'Triggers when a customer pays cash, bKash, or bank transfer',
    supportedEntities: ['payment', 'invoice', 'order'],
  },
  {
    type: 'date_reached',
    label: 'Date Reached',
    labelBn: 'নির্দিষ্ট তারিখ উত্তীর্ণ',
    description: 'Triggers when an invoice is overdue or milestone date is reached',
    supportedEntities: ['invoice', 'order', 'delivery'],
  },
  {
    type: 'stock_threshold',
    label: 'Stock Threshold',
    labelBn: 'স্টক সংকট সীমা',
    description: 'Triggers when material inventory drops below minimum buffer stock',
    supportedEntities: ['material'],
  },
  {
    type: 'approval_completed',
    label: 'Approval Completed',
    labelBn: 'অনুমোদন সম্পন্ন',
    description: 'Triggers when pre-press proof, price override, or artwork is approved',
    supportedEntities: ['design', 'quotation', 'order'],
  },
]

export const ACTION_DEFINITIONS: ActionOptionDefinition[] = [
  {
    type: 'change_status',
    label: 'Change Status',
    labelBn: 'স্ট্যাটাস পরিবর্তন',
    description: 'Update the target entity status (e.g. move order to in_production)',
  },
  {
    type: 'create_task',
    label: 'Create Task',
    labelBn: 'নতুন টাস্ক তৈরি',
    description: 'Spawn a delivery, pre-press check, or payment collection task',
  },
  {
    type: 'send_notification',
    label: 'Send In-App Notification',
    labelBn: 'ইন-অ্যাপ নোটিফিকেশন',
    description: 'Notify sales rep, production manager, or workshop owner',
  },
  {
    type: 'send_sms',
    label: 'Send SMS',
    labelBn: 'এসএমএস পাঠান',
    description: 'Send text alert via Bangladeshi SMS gateway (BulkSMSBD / SSL Wireless)',
  },
  {
    type: 'send_whatsapp',
    label: 'Send WhatsApp',
    labelBn: 'হোয়াটসঅ্যাপ পাঠান',
    description: 'Send instant WhatsApp update to client or delivery rider',
  },
  {
    type: 'create_document',
    label: 'Create Document',
    labelBn: 'ডকুমেন্ট তৈরি',
    description: 'Auto-generate Order from Quote or Job Tickets from Order',
  },
  {
    type: 'assign_employee',
    label: 'Assign Employee',
    labelBn: 'কর্মী নির্ধারণ',
    description: 'Assign press operator, pre-press designer, or delivery rider',
  },
]
