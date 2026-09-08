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

export async function testTriggerWorkflowRuleAction(
  companyId: string,
  ruleId: string
) {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.simulateRuleRun(tenant.companyId, ruleId)
  revalidatePath('/[tenantSlug]/settings/automations', 'page')
  return res
}
