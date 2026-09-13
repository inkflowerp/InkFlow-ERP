// ==============================================================================
// InkFlow SaaS - Machineries & Fleet Management Service
// Authoritative Business Logic, Conflict Detection & Operational State Machine
// ==============================================================================

import { MachineryRepository } from '@/lib/repositories/machinery.repository'
import {
  MachineryRecord,
  MachineryAssignmentRecord,
  MachineryMaintenanceRecord,
  MachineryBreakdownRecord,
  MachineryFilterOptions,
  CreateMachineryInput,
  UpdateMachineryInput,
  MachineryStatus,
  AssignmentStatus,
  ConflictCheckResult,
  MachinerySummaryMetrics,
} from '@/types/machinery.types'

export class MachineryService {
  /**
   * Validates machinery creation or update inputs
   */
  static validateMachineryInput(input: Partial<CreateMachineryInput>): void {
    if (!input.name || !input.name.trim()) {
      throw new Error('Machine name is required')
    }
    if (!input.code || !input.code.trim()) {
      throw new Error('Machine code is required')
    }
    if (!input.machine_type || !input.machine_type.trim()) {
      throw new Error('Machine type is required')
    }

    // Non-negative number checks
    if (input.max_width !== undefined && input.max_width !== null && input.max_width < 0) {
      throw new Error('Maximum width cannot be negative')
    }
    if (input.max_height !== undefined && input.max_height !== null && input.max_height < 0) {
      throw new Error('Maximum height cannot be negative')
    }
    if (input.min_width !== undefined && input.min_width !== null && input.min_width < 0) {
      throw new Error('Minimum width cannot be negative')
    }
    if (input.min_height !== undefined && input.min_height !== null && input.min_height < 0) {
      throw new Error('Minimum height cannot be negative')
    }
    if (input.production_capacity !== undefined && input.production_capacity < 0) {
      throw new Error('Production capacity cannot be negative')
    }
    if (input.estimated_speed !== undefined && input.estimated_speed < 0) {
      throw new Error('Estimated speed cannot be negative')
    }
    if (input.purchase_cost !== undefined && input.purchase_cost < 0) {
      throw new Error('Purchase cost cannot be negative')
    }
    if (input.hourly_machine_cost !== undefined && input.hourly_machine_cost < 0) {
      throw new Error('Hourly machine cost cannot be negative')
    }
    if (input.per_unit_machine_cost !== undefined && input.per_unit_machine_cost < 0) {
      throw new Error('Per-unit cost cannot be negative')
    }
    if (input.electricity_cost_per_hour !== undefined && input.electricity_cost_per_hour < 0) {
      throw new Error('Electricity cost cannot be negative')
    }
    if (input.maintenance_cost_per_hour !== undefined && input.maintenance_cost_per_hour < 0) {
      throw new Error('Maintenance cost cannot be negative')
    }
    if (input.operators_required_count !== undefined && input.operators_required_count < 1) {
      throw new Error('At least 1 operator is required')
    }

    // Date sanity checks
    if (input.purchase_date && input.warranty_expiry) {
      const pDate = new Date(input.purchase_date).getTime()
      const wDate = new Date(input.warranty_expiry).getTime()
      if (wDate < pDate) {
        throw new Error('Warranty expiry date cannot precede purchase date')
      }
    }
  }

  /**
   * Retrieves list of machineries for a tenant
   */
  static async getMachineries(
    companyId: string,
    filters?: MachineryFilterOptions
  ): Promise<MachineryRecord[]> {
    if (!companyId) return []
    return await MachineryRepository.getMachineries(companyId, filters)
  }

  /**
   * Retrieves single machinery by ID
   */
  static async getMachineryById(
    id: string,
    companyId: string
  ): Promise<MachineryRecord | null> {
    if (!companyId || !id) return null
    return await MachineryRepository.getMachineryById(id, companyId)
  }

  /**
   * Creates a new machinery with uniqueness check
   */
  static async createMachinery(
    input: CreateMachineryInput & { company_id: string }
  ): Promise<MachineryRecord> {
    this.validateMachineryInput(input)

    const codeExists = await MachineryRepository.checkCodeExists(
      input.code,
      input.company_id
    )
    if (codeExists) {
      throw new Error(`Machine code "${input.code.toUpperCase()}" already exists in your company. Please use a unique machine code.`)
    }

    return await MachineryRepository.createMachinery(input)
  }

  /**
   * Updates an existing machinery
   */
  static async updateMachinery(
    id: string,
    companyId: string,
    updates: UpdateMachineryInput
  ): Promise<MachineryRecord> {
    this.validateMachineryInput(updates)

    if (updates.code) {
      const codeExists = await MachineryRepository.checkCodeExists(
        updates.code,
        companyId,
        id
      )
      if (codeExists) {
        throw new Error(`Machine code "${updates.code.toUpperCase()}" is already used by another machine.`)
      }
    }

    return await MachineryRepository.updateMachinery(id, companyId, updates)
  }

  /**
   * Controlled status transition
   */
  static async changeStatus(
    id: string,
    companyId: string,
    newStatus: MachineryStatus,
    notes?: string | null
  ): Promise<MachineryRecord> {
    const current = await MachineryRepository.getMachineryById(id, companyId)
    if (!current) {
      throw new Error('Machine not found')
    }

    if (current.status === 'retired' && newStatus !== 'available') {
      throw new Error('Retired machines cannot be reactivated without explicit reactivation to Available.')
    }

    return await MachineryRepository.updateStatus(id, companyId, newStatus, notes)
  }

  /**
   * Soft archives / retires a machine
   */
  static async archiveMachinery(id: string, companyId: string): Promise<MachineryRecord> {
    return await MachineryRepository.archiveMachinery(id, companyId)
  }

  // ============================================================================
  // CONFLICT DETECTION & ASSIGNMENTS
  // ============================================================================

  /**
   * Advanced Machine Conflict Detection Engine
   */
  static async checkConflict(
    machineId: string,
    companyId: string,
    scheduledStart: string,
    scheduledEnd: string,
    excludeAssignmentId?: string
  ): Promise<ConflictCheckResult> {
    const machine = await MachineryRepository.getMachineryById(machineId, companyId)
    if (!machine) {
      return {
        hasConflict: true,
        conflictType: 'status_invalid',
        reason: 'Machine record does not exist or has been deleted.',
      }
    }

    // 1. Status Guard Checks
    if (machine.status === 'retired' || machine.is_archived) {
      return {
        hasConflict: true,
        conflictType: 'status_invalid',
        reason: `Cannot assign machine "${machine.name}" because it is retired/archived from fleet service.`,
        suggestions: ['Select an active machine from the fleet', 'Unarchive machine before assigning'],
      }
    }

    if (machine.status === 'breakdown') {
      return {
        hasConflict: true,
        conflictType: 'status_invalid',
        reason: `Machine "${machine.name}" is currently reported as broken down and under repair.`,
        suggestions: ['Resolve breakdown first', 'Re-route job to an alternate available machine'],
      }
    }

    if (machine.status === 'maintenance') {
      return {
        hasConflict: true,
        conflictType: 'status_invalid',
        reason: `Machine "${machine.name}" is currently undergoing scheduled maintenance.`,
        suggestions: ['Wait for maintenance completion', 'Choose an alternate machine'],
      }
    }

    // 2. Overlapping Schedule Window Check
    const startMs = new Date(scheduledStart).getTime()
    const endMs = new Date(scheduledEnd).getTime()

    if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
      return {
        hasConflict: true,
        conflictType: 'status_invalid',
        reason: 'Invalid schedule time window: End time must be after start time.',
      }
    }

    const overlapping = await MachineryRepository.getOverlappingAssignments(
      machineId,
      companyId,
      scheduledStart,
      scheduledEnd,
      excludeAssignmentId
    )

    if (overlapping.length > 0) {
      const topConflict = overlapping[0]
      const jobLabel = topConflict.job_order?.job_number || topConflict.production_job?.production_job_number || 'Production Run'
      const customer = topConflict.job_order?.customer_name || topConflict.production_job?.customer_name || 'Client'
      const startFormatted = new Date(topConflict.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      const endFormatted = new Date(topConflict.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      return {
        hasConflict: true,
        conflictType: 'overlapping_assignment',
        reason: `Machine is already scheduled for Job #${jobLabel} (${customer}) from ${startFormatted} to ${endFormatted}.`,
        conflictingItem: {
          id: topConflict.id,
          title: `Job #${jobLabel}`,
          start: topConflict.scheduled_start,
          end: topConflict.scheduled_end,
          details: `Assigned Operator: ${topConflict.operator_name || 'Unassigned'}`,
        },
        suggestions: [
          'Select another available machine from the list',
          'Adjust the scheduled start/end time to an open window',
        ],
      }
    }

    // 3. Maintenance Window Overlap Check
    const maintenances = await MachineryRepository.getMaintenances(machineId, companyId)
    const activeMaintenances = maintenances.filter(
      (m) => m.status === 'scheduled' || m.status === 'in_progress'
    )

    for (const maint of activeMaintenances) {
      if (maint.start_time && maint.end_time) {
        const mStart = new Date(maint.start_time).getTime()
        const mEnd = new Date(maint.end_time).getTime()
        if (mStart < endMs && mEnd > startMs) {
          return {
            hasConflict: true,
            conflictType: 'overlapping_maintenance',
            reason: `Machine has scheduled maintenance (${maint.maintenance_type}) from ${new Date(maint.start_time).toLocaleTimeString()} to ${new Date(maint.end_time).toLocaleTimeString()}.`,
            suggestions: ['Adjust schedule outside the maintenance window', 'Choose an alternate machine'],
          }
        }
      }
    }

    return { hasConflict: false }
  }

  /**
   * Assigns a machine to a job order / production task with strict conflict enforcement
   */
  static async assignMachine(input: {
    company_id: string
    machine_id: string
    job_order_id?: string | null
    production_job_id?: string | null
    operator_id?: string | null
    operator_name?: string | null
    scheduled_start: string
    scheduled_end: string
    notes?: string | null
    created_by?: string | null
    bypassConflict?: boolean
  }): Promise<MachineryAssignmentRecord> {
    if (!input.company_id) throw new Error('Company ID is required')
    if (!input.machine_id) throw new Error('Machine ID is required')
    if (!input.scheduled_start || !input.scheduled_end) {
      throw new Error('Scheduled start and end dates are required')
    }

    const conflict = await this.checkConflict(
      input.machine_id,
      input.company_id,
      input.scheduled_start,
      input.scheduled_end
    )

    if (conflict.hasConflict && !input.bypassConflict) {
      throw new Error(`Assignment Conflict: ${conflict.reason}`)
    }

    const assignment = await MachineryRepository.createAssignment({
      company_id: input.company_id,
      machine_id: input.machine_id,
      job_order_id: input.job_order_id,
      production_job_id: input.production_job_id,
      operator_id: input.operator_id,
      operator_name: input.operator_name,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      status: 'scheduled',
      notes: input.notes,
      created_by: input.created_by,
    })

    // If starting immediately, transition status to in_use or scheduled
    const now = Date.now()
    const startMs = new Date(input.scheduled_start).getTime()
    if (Math.abs(startMs - now) < 15 * 60 * 1000) {
      await MachineryRepository.updateStatus(input.machine_id, input.company_id, 'in_use', 'Active Job Assignment')
    } else {
      await MachineryRepository.updateStatus(input.machine_id, input.company_id, 'scheduled', 'Job Scheduled')
    }

    return assignment
  }

  /**
   * Updates assignment status
   */
  static async updateAssignmentStatus(
    id: string,
    companyId: string,
    status: AssignmentStatus
  ): Promise<MachineryAssignmentRecord> {
    const assignment = await MachineryRepository.updateAssignmentStatus(id, companyId, status)
    
    // When assignment completes or is cancelled, restore machine to available if no other active jobs
    if (status === 'completed' || status === 'cancelled') {
      const remaining = await MachineryRepository.getOverlappingAssignments(
        assignment.machine_id,
        companyId,
        new Date().toISOString(),
        new Date(Date.now() + 60000).toISOString(),
        id
      )
      if (remaining.length === 0) {
        await MachineryRepository.updateStatus(assignment.machine_id, companyId, 'available', 'Job Completed')
      }
    } else if (status === 'in_progress') {
      await MachineryRepository.updateStatus(assignment.machine_id, companyId, 'in_use', 'Production Running')
    }

    return assignment
  }

  // ============================================================================
  // MAINTENANCE WORKFLOW
  // ============================================================================

  static async scheduleMaintenance(input: {
    company_id: string
    machine_id: string
    maintenance_type: any
    scheduled_date: string
    start_time?: string | null
    end_time?: string | null
    technician_name?: string | null
    vendor_name?: string | null
    problem_description?: string | null
    notes?: string | null
    cost?: number
    attachment_url?: string | null
    next_maintenance_date?: string | null
    created_by?: string | null
  }): Promise<MachineryMaintenanceRecord> {
    if (!input.machine_id) throw new Error('Machine ID is required')
    if (!input.scheduled_date) throw new Error('Scheduled date is required')

    return await MachineryRepository.createMaintenance({
      company_id: input.company_id,
      machine_id: input.machine_id,
      maintenance_type: input.maintenance_type || 'preventive',
      scheduled_date: input.scheduled_date,
      start_time: input.start_time,
      end_time: input.end_time,
      technician_name: input.technician_name,
      vendor_name: input.vendor_name,
      problem_description: input.problem_description,
      notes: input.notes,
      cost: input.cost || 0,
      attachment_url: input.attachment_url,
      next_maintenance_date: input.next_maintenance_date,
      created_by: input.created_by,
      status: 'scheduled',
    })
  }

  static async completeMaintenance(
    id: string,
    machineId: string,
    companyId: string,
    completionData: {
      work_performed: string
      parts_used?: string | null
      cost?: number
      next_maintenance_date?: string | null
      technician_name?: string | null
      notes?: string | null
    }
  ): Promise<MachineryMaintenanceRecord> {
    if (!completionData.work_performed || !completionData.work_performed.trim()) {
      throw new Error('Work performed summary is required to complete maintenance')
    }

    const updatedMaint = await MachineryRepository.updateMaintenance(id, companyId, {
      status: 'completed',
      work_performed: completionData.work_performed.trim(),
      parts_used: completionData.parts_used || null,
      cost: completionData.cost || 0,
      next_maintenance_date: completionData.next_maintenance_date || null,
      technician_name: completionData.technician_name || null,
      notes: completionData.notes || null,
      end_time: new Date().toISOString(),
    })

    // Restore machine status to available unless in breakdown
    const machine = await MachineryRepository.getMachineryById(machineId, companyId)
    if (machine && machine.status === 'maintenance') {
      await MachineryRepository.updateStatus(machineId, companyId, 'available', 'Maintenance Completed')
    }

    return updatedMaint
  }

  // ============================================================================
  // BREAKDOWN WORKFLOW
  // ============================================================================

  static async reportBreakdown(input: {
    company_id: string
    machine_id: string
    reported_by_id?: string | null
    reported_by_name: string
    problem_title: string
    problem_description: string
    severity?: any
    production_impact?: any
    affected_job_order_id?: string | null
    affected_production_job_id?: string | null
    attachment_url?: string | null
  }): Promise<MachineryBreakdownRecord> {
    if (!input.problem_title || !input.problem_title.trim()) {
      throw new Error('Problem title is required')
    }
    if (!input.problem_description || !input.problem_description.trim()) {
      throw new Error('Problem description is required')
    }
    if (!input.reported_by_name || !input.reported_by_name.trim()) {
      throw new Error('Reporter name is required')
    }

    const breakdown = await MachineryRepository.createBreakdown(input)

    // Transition machine status to breakdown
    await MachineryRepository.updateStatus(
      input.machine_id,
      input.company_id,
      'breakdown',
      `Breakdown: ${input.problem_title}`
    )

    return breakdown
  }

  static async resolveBreakdown(
    id: string,
    machineId: string,
    companyId: string,
    resolution: {
      diagnosis: string
      repair_action: string
      technician_name?: string | null
      parts_replaced?: string | null
      repair_cost?: number
      downtime_minutes?: number
      resolved_by_name: string
      resolution_notes?: string | null
      targetStatus?: MachineryStatus
    }
  ): Promise<MachineryBreakdownRecord> {
    if (!resolution.diagnosis || !resolution.diagnosis.trim()) {
      throw new Error('Diagnosis is required to resolve breakdown')
    }
    if (!resolution.repair_action || !resolution.repair_action.trim()) {
      throw new Error('Repair action is required to resolve breakdown')
    }

    // Auto-calculate downtime if not provided
    let downtime = resolution.downtime_minutes || 0
    if (!downtime) {
      const breakdown = await MachineryRepository.getBreakdownById(id, companyId)
      if (breakdown && breakdown.reported_at) {
        const start = new Date(breakdown.reported_at).getTime()
        const end = Date.now()
        downtime = Math.max(0, Math.round((end - start) / (60 * 1000)))
      }
    }

    const resolved = await MachineryRepository.resolveBreakdown(id, companyId, {
      ...resolution,
      downtime_minutes: downtime,
      status: 'resolved',
    })

    // Return machine to available or target status
    const targetStatus = resolution.targetStatus || 'available'
    await MachineryRepository.updateStatus(
      machineId,
      companyId,
      targetStatus,
      `Breakdown resolved: ${resolution.repair_action}`
    )

    return resolved
  }

  // ============================================================================
  // SUMMARY METRICS
  // ============================================================================

  static async getSummaryMetrics(companyId: string): Promise<MachinerySummaryMetrics> {
    const machines = await MachineryRepository.getMachineries(companyId, { includeArchived: true })

    const totalMachines = machines.filter((m) => !m.is_archived).length
    const available = machines.filter((m) => m.status === 'available' && !m.is_archived).length
    const inUse = machines.filter((m) => m.status === 'in_use' && !m.is_archived).length
    const scheduled = machines.filter((m) => m.status === 'scheduled' && !m.is_archived).length
    const maintenance = machines.filter((m) => m.status === 'maintenance' && !m.is_archived).length
    const breakdown = machines.filter((m) => m.status === 'breakdown' && !m.is_archived).length
    const offline = machines.filter((m) => m.status === 'offline' && !m.is_archived).length
    const retired = machines.filter((m) => m.status === 'retired' || m.is_archived).length

    // Calculate maintenance due in next 7 days
    const next7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    let maintenanceDueCount = 0
    for (const m of machines) {
      if (m.next_maintenance?.scheduled_date && m.next_maintenance.scheduled_date <= next7Days) {
        maintenanceDueCount++
      }
    }

    return {
      totalMachines,
      available,
      inUse,
      scheduled,
      maintenance,
      breakdown,
      offline,
      retired,
      totalDowntimeMinutesThisMonth: 0,
      maintenanceDueCount,
    }
  }
}
