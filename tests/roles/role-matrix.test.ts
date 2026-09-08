import { test, describe } from 'node:test'
import assert from 'node:assert'

export type PrimaryRole =
  | 'platform_owner'
  | 'business_owner'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'general_staff'

// RBAC capability checker based on the PrintERP security matrix
export function canUserPerformAction(
  role: PrimaryRole,
  resource: string,
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'override_price' | 'void'
): boolean {
  // 1. Platform Owner: elevated platform administration
  if (role === 'platform_owner') {
    return true
  }

  // 2. Business Owner: full tenant administration
  if (role === 'business_owner') {
    return true
  }

  // 3. Sales Manager: CRM, Quotes, Orders, View Billing
  if (role === 'sales_manager') {
    if (resource === 'hr' || resource === 'payroll' || resource === 'settings') {
      return false
    }
    if (resource === 'billing' && action === 'void') {
      return false // Sales cannot void invoices
    }
    if (resource === 'quotations' || resource === 'customers' || resource === 'orders') {
      return true
    }
    if (resource === 'billing' && (action === 'view' || action === 'create')) {
      return true
    }
    return false
  }

  // 4. Designer: Pre-press, Artwork proofs, Read Orders
  if (role === 'designer') {
    if (resource === 'design' || resource === 'artwork') return true
    if ((resource === 'orders' || resource === 'jobs') && action === 'view') return true
    return false
  }

  // 5. Production Manager: Press jobs, machine routing, inventory view, QC
  if (role === 'production_manager') {
    if (resource === 'jobs' || resource === 'production' || resource === 'machines') {
      return true
    }
    if (resource === 'inventory' && (action === 'view' || action === 'edit')) {
      return true
    }
    if ((resource === 'orders' || resource === 'quotations') && action === 'view') {
      return true
    }
    return false
  }

  // 6. Print Operator: Shop floor, mount media, start/complete assigned press jobs
  if (role === 'operator') {
    if (resource === 'jobs' && (action === 'view' || action === 'edit')) {
      return true
    }
    if (resource === 'machines' && action === 'view') {
      return true
    }
    return false
  }

  // 7. General Staff: Basic self-service, view assigned tasks
  if (role === 'general_staff') {
    if (resource === 'tasks' && (action === 'view' || action === 'edit')) {
      return true
    }
    return false
  }

  return false
}

describe('Role-Based Access Control (RBAC) 7-Persona Matrix Tests', () => {
  // 1. Platform Owner
  test('Platform Owner: unrestricted system access across all resources', () => {
    assert.strictEqual(canUserPerformAction('platform_owner', 'billing', 'void'), true)
    assert.strictEqual(canUserPerformAction('platform_owner', 'settings', 'edit'), true)
  })

  // 2. Business Owner
  test('Business Owner: full company management, price overrides and payroll approval', () => {
    assert.strictEqual(canUserPerformAction('business_owner', 'quotations', 'override_price'), true)
    assert.strictEqual(canUserPerformAction('business_owner', 'payroll', 'approve'), true)
    assert.strictEqual(canUserPerformAction('business_owner', 'billing', 'void'), true)
  })

  // 3. Sales Manager
  test('Sales Manager: can create quotes and orders, but CANNOT view HR or void invoices', () => {
    assert.strictEqual(canUserPerformAction('sales_manager', 'quotations', 'create'), true)
    assert.strictEqual(canUserPerformAction('sales_manager', 'orders', 'create'), true)
    assert.strictEqual(canUserPerformAction('sales_manager', 'billing', 'void'), false)
    assert.strictEqual(canUserPerformAction('sales_manager', 'hr', 'view'), false)
  })

  // 4. Designer
  test('Designer: can upload artwork proofs, but CANNOT access billing or inventory', () => {
    assert.strictEqual(canUserPerformAction('designer', 'design', 'edit'), true)
    assert.strictEqual(canUserPerformAction('designer', 'orders', 'view'), true)
    assert.strictEqual(canUserPerformAction('designer', 'billing', 'view'), false)
    assert.strictEqual(canUserPerformAction('designer', 'inventory', 'edit'), false)
  })

  // 5. Production Manager
  test('Production Manager: manages press queue and machines, CANNOT approve payroll', () => {
    assert.strictEqual(canUserPerformAction('production_manager', 'jobs', 'edit'), true)
    assert.strictEqual(canUserPerformAction('production_manager', 'machines', 'edit'), true)
    assert.strictEqual(canUserPerformAction('production_manager', 'payroll', 'approve'), false)
  })

  // 6. Print Operator
  test('Print Operator: can start/finish press jobs, CANNOT access financials or delete records', () => {
    assert.strictEqual(canUserPerformAction('operator', 'jobs', 'edit'), true)
    assert.strictEqual(canUserPerformAction('operator', 'billing', 'view'), false)
    assert.strictEqual(canUserPerformAction('operator', 'orders', 'delete'), false)
    assert.strictEqual(canUserPerformAction('operator', 'hr', 'view'), false)
  })

  // 7. General Staff
  test('General Staff: strictly limited to assigned tasks', () => {
    assert.strictEqual(canUserPerformAction('general_staff', 'tasks', 'view'), true)
    assert.strictEqual(canUserPerformAction('general_staff', 'billing', 'view'), false)
    assert.strictEqual(canUserPerformAction('general_staff', 'quotations', 'create'), false)
  })
})
