import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  Machinery,
  MachineryAssignment,
  MachineryBreakdown,
  MachineryMaintenance,
  MachineryStatus,
} from '../../types/machinery.types'
import { checkMachineryConflict } from '../unit/machinery-conflict-detection.test.ts'
import { calculateDowntimeMinutes, validateStatusTransition } from '../unit/machinery-state-transitions.test.ts'
import { validateMachineryPayload } from '../unit/machinery-validation.test.ts'

describe('Machinery End-to-End Operational Lifecycle Integration Tests', () => {
  const companyId = 'tenant-inkflow-001'

  test('Complete Machine Lifecycle: Creation -> Assignment -> Breakdown -> Resolution -> Maintenance -> Available', () => {
    // 1. Machine Creation & Validation
    const createInput = {
      name: 'Mimaki JFX200 UV Flatbed',
      code: 'PRN-UV-01',
      machine_type: 'uv_flatbed' as const,
      category: 'printing' as const,
      department: 'printing' as const,
      brand: 'Mimaki',
      model: 'JFX200-2513 EX',
      max_width: 98.4,
      max_height: 51.2,
      dimension_unit: 'inch' as const,
      production_capacity: 350,
      capacity_unit: 'sft/hour',
      hourly_machine_cost: 800,
      electricity_cost_per_hour: 150,
      maintenance_cost_per_hour: 100,
    }

    const valResult = validateMachineryPayload(createInput)
    assert.strictEqual(valResult.valid, true)

    let machine: Machinery = {
      id: 'mach-uv-01',
      company_id: companyId,
      ...createInput,
      supported_production_types: ['uv_signage'],
      supported_materials: ['Acrylic', 'Foam Board'],
      supported_units: ['sft', 'pcs'],
      estimated_speed: 350,
      speed_unit: 'sft/hour',
      setup_time_mins: 15,
      changeover_time_mins: 10,
      status: 'available',
      is_archived: false,
      operators_required_count: 1,
      purchase_cost: 3200000,
      per_unit_machine_cost: 2.3,
      other_operating_cost_per_hour: 50,
      created_at: new Date('2026-09-14T08:00:00Z').toISOString(),
      updated_at: new Date('2026-09-14T08:00:00Z').toISOString(),
    }
    assert.strictEqual(machine.status, 'available')

    // 2. Schedule Assignment & Conflict Check
    const assignments: MachineryAssignment[] = []
    const newAssignmentWindow = {
      scheduledStart: '2026-09-14T09:00:00Z',
      scheduledEnd: '2026-09-14T13:00:00Z',
    }

    const conflictCheck = checkMachineryConflict({
      machine,
      existingAssignments: assignments,
      ...newAssignmentWindow,
    })
    assert.strictEqual(conflictCheck.hasConflict, false)

    const assignment: MachineryAssignment = {
      id: 'asg-001',
      company_id: companyId,
      machine_id: machine.id,
      operator_name: 'Tareq Rahman',
      scheduled_start: newAssignmentWindow.scheduledStart,
      scheduled_end: newAssignmentWindow.scheduledEnd,
      status: 'scheduled',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    assignments.push(assignment)

    // 3. Start Production Run -> Machine becomes "in_use"
    assert.strictEqual(validateStatusTransition(machine.status, 'in_use').allowed, true)
    machine.status = 'in_use'
    assignment.status = 'in_progress'
    assignment.actual_start = '2026-09-14T09:05:00Z'

    // 4. Report Breakdown during production run
    const breakdownReportTime = '2026-09-14T10:30:00Z'
    assert.strictEqual(validateStatusTransition(machine.status, 'breakdown').allowed, true)
    machine.status = 'breakdown'

    const breakdown: MachineryBreakdown = {
      id: 'bkd-001',
      company_id: companyId,
      machine_id: machine.id,
      reported_by_name: 'Tareq Rahman',
      reported_at: breakdownReportTime,
      problem_title: 'UV Lamp cooling subsystem failure & printhead overheat',
      problem_description: 'UV cure lamp sensor tripped error E044. System auto-halted mid-run.',
      severity: 'high',
      production_impact: 'job_stalled',
      status: 'reported',
      repair_cost: 0,
      downtime_minutes: 0,
      created_at: breakdownReportTime,
      updated_at: breakdownReportTime,
    }

    // Verify machine is blocked while in breakdown
    const blockedAssignmentCheck = checkMachineryConflict({
      machine,
      existingAssignments: assignments,
      scheduledStart: '2026-09-14T14:00:00Z',
      scheduledEnd: '2026-09-14T16:00:00Z',
    })
    assert.strictEqual(blockedAssignmentCheck.hasConflict, true)
    assert.ok(blockedAssignmentCheck.reason?.includes('Breakdown status'))

    // 5. Technician arrives & resolves breakdown
    const breakdownResolveTime = '2026-09-14T12:00:00Z' // 90 minutes downtime
    breakdown.status = 'resolved'
    breakdown.diagnosis = 'Cooling fan cable loose and dust clogged sensor'
    breakdown.repair_action = 'Reseated power connector, cleaned filter, ran UV cure test'
    breakdown.technician_name = 'Sumon Service Engr.'
    breakdown.repair_cost = 4500
    breakdown.resolved_at = breakdownResolveTime
    breakdown.resolved_by_name = 'Production Manager'
    breakdown.downtime_minutes = calculateDowntimeMinutes(breakdown.reported_at, breakdown.resolved_at)

    assert.strictEqual(breakdown.downtime_minutes, 90)

    // Machine restored to available after repair
    assert.strictEqual(validateStatusTransition(machine.status, 'available').allowed, true)
    machine.status = 'available'

    // 6. Schedule Preventive Maintenance & Complete
    const maintenance: MachineryMaintenance = {
      id: 'mnt-001',
      company_id: companyId,
      machine_id: machine.id,
      maintenance_type: 'preventive',
      scheduled_date: '2026-09-20',
      status: 'scheduled',
      cost: 12000,
      technician_name: 'Mimaki Authorized Service',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    assert.strictEqual(maintenance.status, 'scheduled')
    maintenance.status = 'completed'
    maintenance.work_performed = 'Replaced wiper blades, flushed ink lines, calibrated printhead alignment'
    maintenance.next_maintenance_date = '2026-12-20'

    assert.strictEqual(maintenance.status, 'completed')
    assert.strictEqual(machine.status, 'available')
  })
})
