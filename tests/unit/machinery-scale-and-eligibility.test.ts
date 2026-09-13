import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  MachineryRecord,
  MachineEligibilityParams,
  EligibleMachineSummary,
  EligibleMachineItem,
} from '../../types/machinery.types'

/**
 * Pure Machinery Eligibility & Smart UX Resolver Engine for Unit Testing
 */
export function evaluateFleetEligibility(
  fleet: MachineryRecord[],
  params: MachineEligibilityParams
): EligibleMachineSummary {
  const totalFleetCount = fleet.length

  if (totalFleetCount === 0) {
    return {
      totalFleetCount: 0,
      eligibleCount: 0,
      availableCount: 0,
      smartPreselection: null,
      singleMachineNotice: null,
      machines: [],
    }
  }

  const evaluatedMachines: EligibleMachineItem[] = []

  for (const m of fleet) {
    if (m.is_archived || m.status === 'retired') {
      continue
    }

    const ineligibilityReasons: string[] = []
    let matchScore = 100

    // 1. Branch Isolation
    if (params.branch_id && m.branch_id && m.branch_id !== params.branch_id) {
      ineligibilityReasons.push(`Branch mismatch: machine is in branch ${m.branch_id}`)
      matchScore -= 50
    }

    // 2. Department Check
    if (params.department && params.department !== 'all') {
      const deptNormalized = params.department.toLowerCase().trim()
      if (m.department && m.department.toLowerCase().trim() !== deptNormalized) {
        ineligibilityReasons.push(`Department mismatch: machine is ${m.department}`)
        matchScore -= 30
      }
    }

    // 3. Task Type Matching
    if (params.task_type) {
      const task = params.task_type.toLowerCase().trim()
      const machineType = (m.machine_type || '').toLowerCase()
      const category = (m.category || '').toLowerCase()
      const suppTypes = (m.supported_production_types || []).map((t) => t.toLowerCase())

      let taskMatched = false
      if (task === 'printing' || task === 'print') {
        taskMatched =
          category === 'printing' ||
          machineType.includes('print') ||
          machineType.includes('latex') ||
          machineType.includes('solvent') ||
          machineType.includes('uv') ||
          suppTypes.some((t) => t.includes('print'))
      } else if (task === 'lamination' || task === 'laminating') {
        taskMatched =
          machineType.includes('laminat') ||
          category === 'finishing' ||
          suppTypes.some((t) => t.includes('laminat'))
      } else if (task === 'cutting' || task === 'plotter' || task === 'laser' || task === 'cnc') {
        taskMatched =
          category === 'cutting_cnc' ||
          machineType.includes('cut') ||
          machineType.includes('plotter') ||
          machineType.includes('laser') ||
          machineType.includes('cnc') ||
          suppTypes.some((t) => t.includes('cut') || t.includes('laser') || t.includes('cnc'))
      } else if (task === 'fabrication' || task === 'welding') {
        taskMatched =
          category === 'fabrication' ||
          machineType.includes('fabricat') ||
          machineType.includes('weld') ||
          suppTypes.some((t) => t.includes('fabricat'))
      } else if (task === 'finishing' || task === 'binding') {
        taskMatched =
          category === 'finishing' ||
          machineType.includes('finish') ||
          machineType.includes('bind') ||
          suppTypes.some((t) => t.includes('finish'))
      } else {
        taskMatched =
          machineType.includes(task) ||
          category.includes(task) ||
          suppTypes.some((t) => t.includes(task))
      }

      if (!taskMatched) {
        ineligibilityReasons.push(`Task unsupported: machine is ${m.machine_type}`)
        matchScore -= 40
      }
    }

    // 4. Material Matching
    if (params.material && params.material.trim()) {
      const reqMat = params.material.toLowerCase().trim()
      const suppMats = (m.supported_materials || []).map((s) => s.toLowerCase().trim())
      if (suppMats.length > 0 && !suppMats.some((s) => s.includes(reqMat) || reqMat.includes(s))) {
        ineligibilityReasons.push(`Material "${params.material}" unsupported`)
        matchScore -= 20
      }
    }

    // 5. Dimension Capacity Validation
    if (params.width !== undefined && params.width !== null && params.width > 0) {
      if (m.max_width !== null && m.max_width !== undefined && m.max_width > 0 && params.width > m.max_width) {
        ineligibilityReasons.push(`Width ${params.width}" exceeds max ${m.max_width}"`)
        matchScore -= 50
      }
      if (m.min_width !== null && m.min_width !== undefined && m.min_width > 0 && params.width < m.min_width) {
        ineligibilityReasons.push(`Width ${params.width}" below min ${m.min_width}"`)
        matchScore -= 20
      }
    }

    if (params.height !== undefined && params.height !== null && params.height > 0) {
      if (m.max_height !== null && m.max_height !== undefined && m.max_height > 0 && params.height > m.max_height) {
        ineligibilityReasons.push(`Height ${params.height}" exceeds max ${m.max_height}"`)
        matchScore -= 50
      }
    }

    const isEligible = ineligibilityReasons.length === 0
    let isAvailable = isEligible
    if (m.status === 'breakdown' || m.status === 'maintenance' || m.status === 'offline') {
      isAvailable = false
    }

    evaluatedMachines.push({
      machine: m,
      isEligible,
      isAvailable,
      ineligibilityReasons,
      matchScore: Math.max(0, matchScore),
    })
  }

  const eligibleItems = evaluatedMachines.filter((i) => i.isEligible)
  const availableItems = eligibleItems.filter((i) => i.isAvailable)

  let smartPreselection: MachineryRecord | null = null
  let singleMachineNotice: EligibleMachineSummary['singleMachineNotice'] = null

  if (eligibleItems.length === 1) {
    const single = eligibleItems[0]
    if (single.isAvailable) {
      smartPreselection = single.machine
      singleMachineNotice = {
        hasSingleMachine: true,
        machineName: single.machine.name,
        status: single.machine.status,
        isAvailable: true,
        message: `Auto-selected sole eligible machine (${single.machine.name}).`,
      }
    } else {
      smartPreselection = null
      singleMachineNotice = {
        hasSingleMachine: true,
        machineName: single.machine.name,
        status: single.machine.status,
        isAvailable: false,
        message: `${single.machine.name} is the sole matching machine but is currently ${single.machine.status}.`,
      }
    }
  }

  return {
    totalFleetCount,
    eligibleCount: eligibleItems.length,
    availableCount: availableItems.length,
    smartPreselection,
    singleMachineNotice,
    machines: evaluatedMachines,
  }
}

describe('Machinery Scale & Eligibility Unit Tests', () => {
  const dummyMachine1: MachineryRecord = {
    id: 'm-1',
    company_id: 'tenant-1',
    branch_id: 'branch-dhaka',
    name: 'HP Latex 335',
    code: 'LATEX-01',
    machine_type: 'large_format_printing',
    category: 'printing',
    department: 'printing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['large_format_printing', 'banner_printing', 'vinyl_printing'],
    supported_materials: ['Vinyl', 'PVC Banner', 'Backlit Film', 'Canvas'],
    supported_units: ['inch', 'sft'],
    max_width: 64,
    max_height: 1200,
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

  const dummyLaminator: MachineryRecord = {
    id: 'm-2',
    company_id: 'tenant-1',
    branch_id: 'branch-dhaka',
    name: 'Fayou Cold Laminator 1600',
    code: 'LAM-01',
    machine_type: 'laminating',
    category: 'finishing',
    department: 'finishing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['cold_lamination', 'hot_lamination'],
    supported_materials: ['Gloss Film', 'Matte Film', 'Anti-Scratch Film'],
    supported_units: ['inch', 'sft'],
    max_width: 63,
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

  const dummyCutterChittagong: MachineryRecord = {
    id: 'm-3',
    company_id: 'tenant-1',
    branch_id: 'branch-ctg',
    name: 'Graphtec FC9000-140',
    code: 'CUT-01',
    machine_type: 'cutting_plotter',
    category: 'cutting_cnc',
    department: 'printing',
    status: 'available',
    is_archived: false,
    supported_production_types: ['die_cutting', 'kiss_cutting', 'plotter_drawing'],
    supported_materials: ['Vinyl Sticker', 'Reflective Sheet', 'Sandblast Film'],
    supported_units: ['inch'],
    max_width: 54,
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

  test('0 machines fleet returns graceful empty state with 0 counts', () => {
    const result = evaluateFleetEligibility([], {
      task_type: 'printing',
      material: 'Vinyl',
    })

    assert.strictEqual(result.totalFleetCount, 0)
    assert.strictEqual(result.eligibleCount, 0)
    assert.strictEqual(result.availableCount, 0)
    assert.strictEqual(result.smartPreselection, null)
    assert.strictEqual(result.singleMachineNotice, null)
    assert.deepStrictEqual(result.machines, [])
  })

  test('1 machine fleet auto-preselects when available', () => {
    const fleet = [dummyMachine1]
    const result = evaluateFleetEligibility(fleet, {
      task_type: 'printing',
      material: 'Vinyl',
      width: 48,
    })

    assert.strictEqual(result.totalFleetCount, 1)
    assert.strictEqual(result.eligibleCount, 1)
    assert.strictEqual(result.availableCount, 1)
    assert.strictEqual(result.smartPreselection?.id, 'm-1')
    assert.strictEqual(result.singleMachineNotice?.isAvailable, true)
    assert.match(result.singleMachineNotice?.message || '', /Auto-selected sole eligible machine/)
  })

  test('1 machine fleet does NOT preselect if in breakdown status, and gives informative warning', () => {
    const brokenMachine: MachineryRecord = {
      ...dummyMachine1,
      status: 'breakdown',
    }

    const result = evaluateFleetEligibility([brokenMachine], {
      task_type: 'printing',
      material: 'Vinyl',
    })

    assert.strictEqual(result.totalFleetCount, 1)
    assert.strictEqual(result.eligibleCount, 1)
    assert.strictEqual(result.availableCount, 0)
    assert.strictEqual(result.smartPreselection, null)
    assert.strictEqual(result.singleMachineNotice?.isAvailable, false)
    assert.strictEqual(result.singleMachineNotice?.status, 'breakdown')
    assert.match(result.singleMachineNotice?.message || '', /breakdown/)
  })

  test('1 machine fleet does NOT preselect if in maintenance status', () => {
    const maintenanceMachine: MachineryRecord = {
      ...dummyMachine1,
      status: 'maintenance',
    }

    const result = evaluateFleetEligibility([maintenanceMachine], {
      task_type: 'printing',
    })

    assert.strictEqual(result.totalFleetCount, 1)
    assert.strictEqual(result.eligibleCount, 1)
    assert.strictEqual(result.availableCount, 0)
    assert.strictEqual(result.smartPreselection, null)
    assert.strictEqual(result.singleMachineNotice?.isAvailable, false)
    assert.strictEqual(result.singleMachineNotice?.status, 'maintenance')
  })

  test('Multi-machine fleet correctly filters by task type (printing vs lamination)', () => {
    const fleet = [dummyMachine1, dummyLaminator]

    const printResult = evaluateFleetEligibility(fleet, {
      task_type: 'printing',
    })
    assert.strictEqual(printResult.eligibleCount, 1)
    assert.strictEqual(printResult.smartPreselection?.id, 'm-1')

    const lamResult = evaluateFleetEligibility(fleet, {
      task_type: 'lamination',
    })
    assert.strictEqual(lamResult.eligibleCount, 1)
    assert.strictEqual(lamResult.smartPreselection?.id, 'm-2')
  })

  test('Multi-machine fleet rejects machine when width exceeds machine max_width', () => {
    const fleet = [dummyMachine1] // max_width = 64"

    const oversizedResult = evaluateFleetEligibility(fleet, {
      task_type: 'printing',
      width: 72, // Exceeds 64"
    })

    assert.strictEqual(oversizedResult.eligibleCount, 0)
    assert.strictEqual(oversizedResult.machines[0].isEligible, false)
    assert.match(oversizedResult.machines[0].ineligibilityReasons[0], /exceeds/)
  })

  test('Multi-machine fleet rejects machine from another branch', () => {
    const fleet = [dummyCutterChittagong]

    const dhakaResult = evaluateFleetEligibility(fleet, {
      branch_id: 'branch-dhaka',
      task_type: 'cutting',
    })

    assert.strictEqual(dhakaResult.eligibleCount, 0)
    assert.match(dhakaResult.machines[0].ineligibilityReasons[0], /Branch mismatch/)
  })

  test('Multi-machine fleet rejects unsupported material', () => {
    const fleet = [dummyMachine1]

    const matResult = evaluateFleetEligibility(fleet, {
      task_type: 'printing',
      material: 'Stainless Steel Sheet', // Not supported by Latex 335
    })

    assert.strictEqual(matResult.eligibleCount, 0)
    assert.match(matResult.machines[0].ineligibilityReasons[0], /Material "Stainless Steel Sheet" unsupported/)
  })
})
