import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  MachineryRecord,
  MachineryAssignmentRecord,
  MachineryBreakdownRecord,
  ReassignBreakdownInput,
} from '../../types/machinery.types'

/**
 * In-Memory Production State Simulator for Multi-Task Job Orders & Fleet Reassignment
 */
class ProductionFleetSimulator {
  machineries: Map<string, MachineryRecord> = new Map()
  assignments: MachineryAssignmentRecord[] = new Map<string, MachineryAssignmentRecord>() as any
  assignmentList: MachineryAssignmentRecord[] = []
  breakdowns: MachineryBreakdownRecord[] = []

  addMachine(machine: MachineryRecord) {
    this.machineries.set(machine.id, { ...machine })
  }

  assignTask(params: {
    companyId: string
    branchId?: string | null
    machineId: string
    jobOrderId?: string | null
    taskType: string
    taskName?: string
    operatorName?: string
    scheduledStart: string
    scheduledEnd: string
    notes?: string
  }): MachineryAssignmentRecord {
    const machine = this.machineries.get(params.machineId)
    if (!machine) throw new Error('Machine not found')
    if (machine.status === 'breakdown' || machine.status === 'maintenance' || machine.status === 'retired') {
      throw new Error(`Machine ${machine.name} is unavailable (status: ${machine.status})`)
    }

    // Schedule window overlap check
    const startMs = new Date(params.scheduledStart).getTime()
    const endMs = new Date(params.scheduledEnd).getTime()

    for (const existing of this.assignmentList) {
      if (existing.machine_id === params.machineId && existing.status !== 'cancelled' && existing.status !== 'completed') {
        const exStart = new Date(existing.scheduled_start).getTime()
        const exEnd = new Date(existing.scheduled_end).getTime()
        if (startMs < exEnd && endMs > exStart) {
          throw new Error(`Schedule conflict with assignment ${existing.id}`)
        }
      }
    }

    const assignment: MachineryAssignmentRecord = {
      id: `asg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      company_id: params.companyId,
      branch_id: params.branchId || machine.branch_id || null,
      machine_id: params.machineId,
      job_order_id: params.jobOrderId || null,
      task_type: params.taskType,
      task_name: params.taskName || params.taskType,
      operator_name: params.operatorName || 'Operator',
      scheduled_start: params.scheduledStart,
      scheduled_end: params.scheduledEnd,
      status: 'scheduled',
      notes: params.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      machine,
    }

    this.assignmentList.push(assignment)
    machine.status = 'scheduled'
    return assignment
  }

  reportBreakdown(params: {
    companyId: string
    machineId: string
    problemTitle: string
    affectedJobOrderId?: string | null
  }): MachineryBreakdownRecord {
    const machine = this.machineries.get(params.machineId)
    if (!machine) throw new Error('Machine not found')

    const breakdown: MachineryBreakdownRecord = {
      id: `bkd-${Date.now()}`,
      company_id: params.companyId,
      machine_id: params.machineId,
      reported_by_name: 'Floor Supervisor',
      reported_at: new Date().toISOString(),
      problem_title: params.problemTitle,
      problem_description: 'Sudden printhead failure during production run',
      severity: 'high',
      production_impact: 'job_stalled',
      affected_job_order_id: params.affectedJobOrderId || null,
      status: 'reported',
      repair_cost: 0,
      downtime_minutes: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      machine,
    }

    this.breakdowns.push(breakdown)
    machine.status = 'breakdown'
    return breakdown
  }

  reassignBreakdownJob(
    companyId: string,
    input: ReassignBreakdownInput
  ): MachineryAssignmentRecord {
    const breakdown = this.breakdowns.find((b) => b.id === input.breakdown_id)
    if (!breakdown) throw new Error('Breakdown not found')

    const targetMachine = this.machineries.get(input.target_machine_id)
    if (!targetMachine) throw new Error('Target machine not found')
    if (targetMachine.status === 'breakdown' || targetMachine.status === 'maintenance') {
      throw new Error('Target machine is not available')
    }

    // Find previous active assignment on broken machine
    const prevAssignment = this.assignmentList.find(
      (a) =>
        a.job_order_id === breakdown.affected_job_order_id &&
        a.machine_id === breakdown.machine_id &&
        (a.status === 'scheduled' || a.status === 'in_progress')
    )

    // Mark previous assignment cancelled without deleting it!
    if (prevAssignment) {
      prevAssignment.status = 'cancelled'
      prevAssignment.notes = `${prevAssignment.notes || ''} [Reassigned to ${targetMachine.name} due to breakdown]`.trim()
    }

    // Create new assignment on target machine
    const newAssignment = this.assignTask({
      companyId,
      branchId: targetMachine.branch_id,
      machineId: input.target_machine_id,
      jobOrderId: breakdown.affected_job_order_id,
      taskType: prevAssignment?.task_type || 'printing',
      taskName: prevAssignment?.task_name || 'Printing',
      operatorName: input.operator_name || 'Alternate Operator',
      scheduledStart: input.scheduled_start || new Date().toISOString(),
      scheduledEnd: input.scheduled_end || new Date(Date.now() + 3600000).toISOString(),
      notes: input.notes || `Reassigned from broken machine ${breakdown.machine?.name}`,
    })

    return newAssignment
  }

  getJobAssignments(jobOrderId: string): MachineryAssignmentRecord[] {
    return this.assignmentList.filter((a) => a.job_order_id === jobOrderId)
  }
}

describe('Machinery Multi-Task Production & Breakdown Reassignment Integration Tests', () => {
  const companyId = 'company-apex-print'

  const machineA: MachineryRecord = {
    id: 'm-latex-335',
    company_id: companyId,
    branch_id: 'branch-main',
    name: 'HP Latex 335',
    code: 'LATEX-01',
    machine_type: 'large_format_printing',
    category: 'printing',
    department: 'printing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['large_format_printing'],
    supported_materials: ['Vinyl', 'PVC'],
    supported_units: ['inch'],
    production_capacity: 500,
    capacity_unit: 'sft/day',
    estimated_speed: 50,
    speed_unit: 'sft/hour',
    setup_time_mins: 15,
    changeover_time_mins: 10,
    operators_required_count: 1,
    purchase_cost: 1500000,
    hourly_machine_cost: 250,
    per_unit_machine_cost: 2,
    electricity_cost_per_hour: 45,
    maintenance_cost_per_hour: 30,
    other_operating_cost_per_hour: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const machineB: MachineryRecord = {
    id: 'm-lam-1600',
    company_id: companyId,
    branch_id: 'branch-main',
    name: 'Fayou Cold Laminator 1600',
    code: 'LAM-01',
    machine_type: 'laminating',
    category: 'finishing',
    department: 'finishing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['cold_lamination'],
    supported_materials: ['Gloss Film', 'Matte Film'],
    supported_units: ['inch'],
    production_capacity: 1000,
    capacity_unit: 'sft/day',
    estimated_speed: 120,
    speed_unit: 'sft/hour',
    setup_time_mins: 5,
    changeover_time_mins: 5,
    operators_required_count: 1,
    purchase_cost: 350000,
    hourly_machine_cost: 80,
    per_unit_machine_cost: 0.5,
    electricity_cost_per_hour: 20,
    maintenance_cost_per_hour: 10,
    other_operating_cost_per_hour: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const machineC: MachineryRecord = {
    id: 'm-graphtec-9000',
    company_id: companyId,
    branch_id: 'branch-main',
    name: 'Graphtec FC9000-140',
    code: 'CUT-01',
    machine_type: 'cutting_plotter',
    category: 'cutting_cnc',
    department: 'printing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['die_cutting'],
    supported_materials: ['Vinyl Sticker'],
    supported_units: ['inch'],
    production_capacity: 800,
    capacity_unit: 'sft/day',
    estimated_speed: 80,
    speed_unit: 'sft/hour',
    setup_time_mins: 10,
    changeover_time_mins: 5,
    operators_required_count: 1,
    purchase_cost: 450000,
    hourly_machine_cost: 100,
    per_unit_machine_cost: 1,
    electricity_cost_per_hour: 15,
    maintenance_cost_per_hour: 15,
    other_operating_cost_per_hour: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const machineD: MachineryRecord = {
    id: 'm-epson-s80600',
    company_id: companyId,
    branch_id: 'branch-main',
    name: 'Epson SureColor S80600',
    code: 'EPSON-01',
    machine_type: 'eco_solvent',
    category: 'printing',
    department: 'printing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['eco_solvent_printing', 'large_format_printing'],
    supported_materials: ['Vinyl', 'PVC', 'Canvas'],
    supported_units: ['inch'],
    production_capacity: 600,
    capacity_unit: 'sft/day',
    estimated_speed: 60,
    speed_unit: 'sft/hour',
    setup_time_mins: 15,
    changeover_time_mins: 10,
    operators_required_count: 1,
    purchase_cost: 1800000,
    hourly_machine_cost: 300,
    per_unit_machine_cost: 2.5,
    electricity_cost_per_hour: 50,
    maintenance_cost_per_hour: 35,
    other_operating_cost_per_hour: 20,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  test('One Job Order can have multiple production tasks assigned to multiple distinct machines, plus a manual step without machine', () => {
    const sim = new ProductionFleetSimulator()
    sim.addMachine(machineA)
    sim.addMachine(machineB)
    sim.addMachine(machineC)

    const jobOrderId = 'job-order-1048'

    // Task 1: Printing on HP Latex 335
    const task1 = sim.assignTask({
      companyId,
      machineId: machineA.id,
      jobOrderId,
      taskType: 'printing',
      taskName: 'Printing 1000sqft Vinyl',
      operatorName: 'Nurul Amin',
      scheduledStart: '2026-09-14T09:00:00Z',
      scheduledEnd: '2026-09-14T11:00:00Z',
    })

    // Task 2: Lamination on Fayou Cold Laminator
    const task2 = sim.assignTask({
      companyId,
      machineId: machineB.id,
      jobOrderId,
      taskType: 'lamination',
      taskName: 'Matte Lamination',
      operatorName: 'Faruk Hossain',
      scheduledStart: '2026-09-14T11:30:00Z',
      scheduledEnd: '2026-09-14T12:30:00Z',
    })

    // Task 3: Cutting on Graphtec Cutter
    const task3 = sim.assignTask({
      companyId,
      machineId: machineC.id,
      jobOrderId,
      taskType: 'cutting',
      taskName: 'Contour Kiss-Cutting',
      operatorName: 'Habibullah',
      scheduledStart: '2026-09-14T13:00:00Z',
      scheduledEnd: '2026-09-14T14:00:00Z',
    })

    // Verify all 3 assignments for the single job order
    const jobAssignments = sim.getJobAssignments(jobOrderId)
    assert.strictEqual(jobAssignments.length, 3)

    assert.strictEqual(jobAssignments[0].task_type, 'printing')
    assert.strictEqual(jobAssignments[0].machine_id, machineA.id)

    assert.strictEqual(jobAssignments[1].task_type, 'lamination')
    assert.strictEqual(jobAssignments[1].machine_id, machineB.id)

    assert.strictEqual(jobAssignments[2].task_type, 'cutting')
    assert.strictEqual(jobAssignments[2].machine_id, machineC.id)
  })

  test('Machine breakdown allows reassignment without losing assignment history or cancelling the Job Order', () => {
    const sim = new ProductionFleetSimulator()
    sim.addMachine(machineA)
    sim.addMachine(machineD)

    const jobOrderId = 'job-order-2099'

    // Initial assignment on HP Latex
    const initialAssignment = sim.assignTask({
      companyId,
      machineId: machineA.id,
      jobOrderId,
      taskType: 'printing',
      scheduledStart: '2026-09-14T10:00:00Z',
      scheduledEnd: '2026-09-14T12:00:00Z',
    })

    // HP Latex breaks down
    const breakdown = sim.reportBreakdown({
      companyId,
      machineId: machineA.id,
      problemTitle: 'Carriage Board Overheat',
      affectedJobOrderId: jobOrderId,
    })

    assert.strictEqual(sim.machineries.get(machineA.id)?.status, 'breakdown')

    // Reassign to Epson S80600
    const reassignedAssignment = sim.reassignBreakdownJob(companyId, {
      breakdown_id: breakdown.id,
      target_machine_id: machineD.id,
      operator_name: 'Tareq Rahman',
      scheduled_start: '2026-09-14T11:00:00Z',
      scheduled_end: '2026-09-14T13:00:00Z',
      notes: 'Emergency reroute due to Latex breakdown',
    })

    // Verify assignment history is intact
    const allJobAssignments = sim.getJobAssignments(jobOrderId)
    assert.strictEqual(allJobAssignments.length, 2)

    // Original assignment on Latex is cancelled with notes, NOT destroyed
    const original = allJobAssignments.find((a) => a.machine_id === machineA.id)
    assert.strictEqual(original?.status, 'cancelled')
    assert.match(original?.notes || '', /Reassigned to Epson SureColor S80600/)

    // New assignment on Epson is active/scheduled
    const newAssig = allJobAssignments.find((a) => a.machine_id === machineD.id)
    assert.strictEqual(newAssig?.status, 'scheduled')
    assert.strictEqual(newAssig?.machine_id, machineD.id)
  })

  test('Cannot assign two overlapping jobs on the same machine (concurrency / race protection)', () => {
    const sim = new ProductionFleetSimulator()
    sim.addMachine(machineA)

    // Manager A schedules 10:00 - 12:00
    sim.assignTask({
      companyId,
      machineId: machineA.id,
      jobOrderId: 'job-101',
      taskType: 'printing',
      scheduledStart: '2026-09-14T10:00:00Z',
      scheduledEnd: '2026-09-14T12:00:00Z',
    })

    // Manager B attempts 10:30 - 11:30 (overlap) -> MUST throw conflict
    assert.throws(
      () => {
        sim.assignTask({
          companyId,
          machineId: machineA.id,
          jobOrderId: 'job-102',
          taskType: 'printing',
          scheduledStart: '2026-09-14T10:30:00Z',
          scheduledEnd: '2026-09-14T11:30:00Z',
        })
      },
      /Schedule conflict/
    )
  })
})
