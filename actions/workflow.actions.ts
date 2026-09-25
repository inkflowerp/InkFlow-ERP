'use server'

import { revalidatePath } from 'next/cache'
import { WorkflowService } from '@/services/workflow.service'
import { WorkflowRule } from '@/types/workflow.types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export async function toggleWorkflowRuleAction(
  companyId: string,
  ruleId: string,
  isActive: boolean
) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.toggleRule(tenant.companyId, ruleId, isActive)
  revalidatePath('/[tenantSlug]/settings/automations', 'page')
  return res
}

export async function saveWorkflowRuleAction(
  companyId: string,
  ruleData: Partial<WorkflowRule>
) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.saveRule(tenant.companyId, ruleData)
  revalidatePath('/[tenantSlug]/settings/automations', 'page')
  return res
}

export async function deleteWorkflowRuleAction(
  companyId: string,
  ruleId: string
) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.deleteRule(tenant.companyId, ruleId)
  revalidatePath('/[tenantSlug]/settings/automations', 'page')
  return res
}

export async function getWorkflowRulesAction(companyId?: string) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }
  return await WorkflowService.getRules(tenant.companyId)
}

export async function getWorkflowExecutionLogsAction(companyId?: string) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }
  return await WorkflowService.getExecutionLogs(tenant.companyId)
}

export async function testTriggerWorkflowRuleAction(
  companyId: string,
  ruleId: string,
  customPayload?: Record<string, any>
) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.simulateRuleRun(tenant.companyId, ruleId, customPayload)
  revalidatePath('/[tenantSlug]/settings/automations', 'page')
  return res
}

export async function dispatchWorkflowEventAction(
  companyId: string,
  triggerType: any,
  entityType: any,
  entityId: string,
  payload: Record<string, any> = {}
) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  try {
    const logs = await WorkflowService.dispatchTrigger(
      tenant.companyId,
      triggerType,
      entityType,
      entityId,
      payload
    )
    revalidatePath('/[tenantSlug]/settings/automations', 'page')
    return { success: true, data: logs }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to dispatch workflow trigger' }
  }
}

