'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


import { revalidatePath } from 'next/cache'
import { WorkflowService } from '@/services/workflow.service'
import { WorkflowRule } from '@/types/workflow.types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export const toggleWorkflowRuleAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "workflow"
  },
  async (ctx, companyId: string,
  ruleId: string,
  isActive: boolean) => {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.toggleRule(tenant.companyId, ruleId, isActive)
  if (tenant.companySlug) revalidatePath(`/${tenant.companySlug}/settings/automations`, 'page')
  revalidatePath('/', 'layout')
  return res

})

export const saveWorkflowRuleAction = withTenantAction(
  {
    permission: "settings.manage",
    entityType: "workflow"
  },
  async (ctx, companyId: string,
  ruleData: Partial<WorkflowRule>) => {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.saveRule(tenant.companyId, ruleData)
  if (tenant.companySlug) revalidatePath(`/${tenant.companySlug}/settings/automations`, 'page')
  revalidatePath('/', 'layout')
  return res

})

export const deleteWorkflowRuleAction = withTenantAction(
  {
    permission: "settings.manage",
    destructive: true,
    auditAction: "workflow.deleteworkflowrule",
    entityType: "workflow"
  },
  async (ctx, companyId: string,
  ruleId: string) => {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.deleteRule(tenant.companyId, ruleId)
  if (tenant.companySlug) revalidatePath(`/${tenant.companySlug}/settings/automations`, 'page')
  revalidatePath('/', 'layout')
  return res

})

export const getWorkflowRulesAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "workflow"
  },
  async (ctx, companyId?: string) => {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }
  return await WorkflowService.getRules(tenant.companyId)

})

export const getWorkflowExecutionLogsAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "workflow"
  },
  async (ctx, companyId?: string) => {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }
  return await WorkflowService.getExecutionLogs(tenant.companyId)

})

export const testTriggerWorkflowRuleAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "workflow"
  },
  async (ctx, companyId: string,
  ruleId: string,
  customPayload?: Record<string, any>) => {
  const tenant = await getCurrentTenant(companyId)
  if (!tenant) {
    return { success: false, message: 'Unauthorized: Session expired or invalid.' }
  }

  const res = await WorkflowService.simulateRuleRun(tenant.companyId, ruleId, customPayload)
  if (tenant.companySlug) revalidatePath(`/${tenant.companySlug}/settings/automations`, 'page')
  revalidatePath('/', 'layout')
  return res

})

export const dispatchWorkflowEventAction = withTenantAction(
  {
    permission: "settings.view",
    entityType: "workflow"
  },
  async (ctx, companyId: string,
  triggerType: any,
  entityType: any,
  entityId: string,
  payload: Record<string, any> = {}) => {
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
    if (tenant.companySlug) revalidatePath(`/${tenant.companySlug}/settings/automations`, 'page')
    revalidatePath('/', 'layout')
    return { success: true, data: logs }
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to dispatch workflow trigger' }
  }

})

