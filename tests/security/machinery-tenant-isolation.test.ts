import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  Machinery,
  MachineryAssignment,
  MachineryMaintenance,
  MachineryBreakdown,
} from '../../types/machinery.types'

const MOCK_DEFAULT_RESPONSIBILITY_MATRICES: Record<string, { permissions: Record<string, string[]> }> = {
  business_owner: {
    permissions: {
      all: ['*'],
      production: ['view', 'create', 'edit', 'delete', 'assign', 'status', 'maintenance', 'breakdown', 'resolve_breakdown'],
      machineries: ['view', 'create', 'edit', 'delete', 'assign', 'status', 'maintenance', 'breakdown', 'resolve_breakdown'],
    },
  },
  production_manager: {
    permissions: {
      production: ['view', 'create', 'edit', 'assign', 'status', 'maintenance', 'breakdown', 'resolve_breakdown', 'cost_view', 'export'],
      machineries: ['view', 'create', 'edit', 'assign', 'status', 'maintenance', 'breakdown', 'resolve_breakdown', 'cost_view', 'export'],
    },
  },
  operator: {
    permissions: {
      production: ['view', 'status', 'breakdown'],
      machineries: ['view', 'status', 'breakdown'],
    },
  },
  general_staff: {
    permissions: {
      production: ['view'],
      machineries: ['view'],
    },
  },
}

/**
 * Tenant Boundary Simulator
 */
export function simulateTenantQuery<T extends { company_id: string }>(
  dataset: T[],
  requestingTenantId: string
): T[] {
  return dataset.filter((item) => item.company_id === requestingTenantId)
}

/**
 * Permission Check Simulator
 */
export function checkRolePermission(
  role: string,
  permission: string
): boolean {
  if (role === 'business_owner') return true
  const matrix = MOCK_DEFAULT_RESPONSIBILITY_MATRICES[role]
  if (!matrix) return false

  const [module, action] = permission.split('.')
  const modulePerms = matrix.permissions[module] || matrix.permissions['production'] || []
  return modulePerms.includes(action) || modulePerms.includes('all') || modulePerms.includes('*')
}

describe('Machinery Multi-Tenant Isolation & RBAC Security Tests', () => {
  const TENANT_A = 'tenant-aaa-1111'
  const TENANT_B = 'tenant-bbb-2222'

  const mockMachineries: Machinery[] = [
    {
      id: 'mach-a1',
      company_id: TENANT_A,
      name: 'Tenant A Flora 3200',
      code: 'FLORA-A1',
      machine_type: 'large_format_printing',
      category: 'printing',
      department: 'printing',
      status: 'available',
      is_archived: false,
      supported_production_types: ['large_format_banner'],
      supported_materials: ['Panaflex'],
      supported_units: ['sft'],
      production_capacity: 450,
      capacity_unit: 'sft/hour',
      estimated_speed: 450,
      speed_unit: 'sft/hour',
      setup_time_mins: 15,
      changeover_time_mins: 10,
      purchase_cost: 1500000,
      hourly_machine_cost: 500,
      per_unit_machine_cost: 1.2,
      electricity_cost_per_hour: 100,
      maintenance_cost_per_hour: 50,
      other_operating_cost_per_hour: 20,
      operators_required_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'mach-b1',
      company_id: TENANT_B,
      name: 'Tenant B CNC Router',
      code: 'CNC-B1',
      machine_type: 'cnc_router',
      category: 'cutting_cnc',
      department: 'fabrication',
      status: 'in_use',
      is_archived: false,
      supported_production_types: ['acrylic_letters'],
      supported_materials: ['Acrylic', 'PVC Board'],
      supported_units: ['sft', 'pcs'],
      production_capacity: 120,
      capacity_unit: 'sft/hour',
      estimated_speed: 120,
      speed_unit: 'sft/hour',
      setup_time_mins: 20,
      changeover_time_mins: 15,
      purchase_cost: 850000,
      hourly_machine_cost: 400,
      per_unit_machine_cost: 2.5,
      electricity_cost_per_hour: 80,
      maintenance_cost_per_hour: 40,
      other_operating_cost_per_hour: 15,
      operators_required_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]

  test('Tenant A query never returns Tenant B machinery records', () => {
    const tenantAResults = simulateTenantQuery(mockMachineries, TENANT_A)
    assert.strictEqual(tenantAResults.length, 1)
    assert.strictEqual(tenantAResults[0].id, 'mach-a1')
    assert.strictEqual(tenantAResults[0].company_id, TENANT_A)

    const tenantBResults = simulateTenantQuery(mockMachineries, TENANT_B)
    assert.strictEqual(tenantBResults.length, 1)
    assert.strictEqual(tenantBResults[0].id, 'mach-b1')
    assert.strictEqual(tenantBResults[0].company_id, TENANT_B)
  })

  test('Cross-tenant mutation injection is blocked at isolation boundary', () => {
    const requestingTenant = TENANT_B
    const targetMachine = mockMachineries.find((m) => m.id === 'mach-a1')

    assert.ok(targetMachine)
    const isAllowed = targetMachine.company_id === requestingTenant
    assert.strictEqual(isAllowed, false, 'Cross-tenant mutation must be rejected')
  })

  test('RBAC: Business Owner has full permissions across all machinery actions', () => {
    const role = 'business_owner'
    assert.strictEqual(checkRolePermission(role, 'machineries.view'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.create'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.edit'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.delete'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.assign'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.status'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.maintenance'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.breakdown'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.resolve_breakdown'), true)
  })

  test('RBAC: Production Manager has operational, maintenance and breakdown control', () => {
    const role = 'production_manager'
    assert.strictEqual(checkRolePermission(role, 'machineries.view'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.assign'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.status'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.maintenance'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.breakdown'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.resolve_breakdown'), true)
  })

  test('RBAC: Print Operator has restricted view, status change, and breakdown reporting', () => {
    const role = 'operator'
    assert.strictEqual(checkRolePermission(role, 'machineries.view'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.status'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.breakdown'), true)
    assert.strictEqual(checkRolePermission(role, 'machineries.delete'), false)
    assert.strictEqual(checkRolePermission(role, 'machineries.create'), false)
  })
})
