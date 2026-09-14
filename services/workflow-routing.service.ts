import { BranchOperationsRepository } from '../lib/repositories/branch-operations.repository.ts'
import type { WorkflowType, WorkflowConfigurationRecord } from '../types/branch.types.ts'

export interface RoutingEvaluationResult {
  isAllowed: boolean
  requiresApproval: boolean
  targetBranchId?: string
  reason?: string
}

export class WorkflowRoutingService {
  /**
   * Evaluate whether an inventory transfer requires management approval based on threshold
   */
  static async evaluateTransferApproval(
    companyId: string,
    quantity: number,
    materialType?: string,
    branchId?: string
  ): Promise<RoutingEvaluationResult> {
    const config = await BranchOperationsRepository.getWorkflowConfig(
      companyId,
      'inventory_transfer',
      branchId
    )

    if (!config || !config.is_active) {
      return { isAllowed: true, requiresApproval: false }
    }

    const rules = config.rules as {
      auto_approve_max_quantity?: number
      restricted_materials?: string[]
      require_manager_approval?: boolean
    }

    if (rules.require_manager_approval) {
      return {
        isAllowed: true,
        requiresApproval: true,
        reason: 'Organization policy requires manager approval for all branch transfers',
      }
    }

    if (
      rules.auto_approve_max_quantity !== undefined &&
      quantity > rules.auto_approve_max_quantity
    ) {
      return {
        isAllowed: true,
        requiresApproval: true,
        reason: `Transfer quantity (${quantity}) exceeds auto-approval threshold (${rules.auto_approve_max_quantity})`,
      }
    }

    if (
      rules.restricted_materials &&
      materialType &&
      rules.restricted_materials.includes(materialType)
    ) {
      return {
        isAllowed: true,
        requiresApproval: true,
        reason: `Material type "${materialType}" is on restricted transfer list`,
      }
    }

    return { isAllowed: true, requiresApproval: false }
  }

  /**
   * Evaluate auto-routing of a production job to appropriate branch based on machine capability
   */
  static async evaluateProductionRouting(
    companyId: string,
    jobType: string,
    preferredBranchId?: string
  ): Promise<{ targetBranchId?: string; isAutoRouted: boolean }> {
    const config = await BranchOperationsRepository.getWorkflowConfig(
      companyId,
      'cross_branch_production'
    )

    if (!config || !config.is_active) {
      return { targetBranchId: preferredBranchId, isAutoRouted: false }
    }

    const rules = config.rules as {
      specialized_routing?: Record<string, string> // jobType -> branchId
    }

    if (rules.specialized_routing && rules.specialized_routing[jobType]) {
      return {
        targetBranchId: rules.specialized_routing[jobType],
        isAutoRouted: true,
      }
    }

    return { targetBranchId: preferredBranchId, isAutoRouted: false }
  }

  /**
   * Configure workflow rule
   */
  static async configureWorkflow(
    companyId: string,
    workflowType: WorkflowType,
    rules: Record<string, unknown>,
    branchId?: string | null,
    userId?: string
  ): Promise<WorkflowConfigurationRecord> {
    return BranchOperationsRepository.setWorkflowConfig(companyId, {
      workflow_type: workflowType,
      branch_id: branchId,
      rules,
      is_active: true,
      updated_by: userId,
    })
  }
}
