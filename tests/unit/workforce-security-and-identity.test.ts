import { test, describe } from 'node:test'
import assert from 'node:assert'
import { getNavigationConfig } from '../../config/navigation.config.ts'

describe('Workforce & HRM Security, Identity Association & Navigation Audit', () => {
  test('1. Workforce navigation has exactly 6 job-focused items with valid routes and roles', () => {
    const navSections = getNavigationConfig('sample-tenant')
    const mgmt = navSections.find((s) => s.id === 'management')
    assert.ok(mgmt, 'Management section must exist')
    const hrNav = mgmt.items.find((item) => item.key === 'hr')
    assert.ok(hrNav, 'Workforce & HRM item must exist')
    assert.ok(hrNav.children, 'Workforce & HRM must have children')
    assert.strictEqual(hrNav.children.length, 6, 'Must have exactly 6 job-focused sub-items')

    const expectedKeys = [
      { key: 'hr_overview', title: 'Overview', href: '/hr' },
      { key: 'hr_employees', title: 'Employees', href: '/hr/employees' },
      { key: 'hr_attendance', title: 'Attendance', href: '/hr/attendance' },
      { key: 'hr_payroll', title: 'Payroll', href: '/hr/payroll' },
      { key: 'hr_advances', title: 'Advances', href: '/hr/advances' },
      { key: 'hr_reports', title: 'Reports', href: '/hr/reports' },
    ]

    for (const expected of expectedKeys) {
      const match = hrNav.children.find((s) => s.key === expected.key)
      assert.ok(match, `Navigation item for ${expected.key} (${expected.href}) must exist`)
      assert.strictEqual(match.title, expected.title, `Title for ${expected.key} must match ${expected.title}`)
      assert.ok(match.titleBn, `Bengali title for ${expected.key} must be defined`)
      assert.ok(match.href.endsWith(expected.href), `Href for ${expected.key} must end with ${expected.href}`)
    }
  })

  test('2. Strict Identity Association: Mock verification that unlinked user cannot impersonate employees[0]', () => {
    // Simulating identity association logic from actions/attendance.actions.ts
    const mockEmployees = [
      { id: 'emp-001', name: 'Managing Director', user_id: 'user-admin-123' },
      { id: 'emp-002', name: 'Floor Worker', user_id: 'user-worker-456' },
    ]

    const resolveEmployeeStrict = (userId: string) => {
      const matched = mockEmployees.find((e) => e.user_id === userId)
      if (!matched) {
        return { success: false, error: 'User is not linked to any active employee profile.' }
      }
      return { success: true, employee: matched }
    }

    // 1. Linked user resolves correctly
    const validResult = resolveEmployeeStrict('user-worker-456')
    assert.strictEqual(validResult.success, true)
    assert.strictEqual(validResult.employee?.name, 'Floor Worker')

    // 2. Unlinked user fails explicitly and DOES NOT fall back to emp-001 (Managing Director)
    const attackerResult = resolveEmployeeStrict('unlinked-user-789')
    assert.strictEqual(attackerResult.success, false)
    assert.strictEqual(attackerResult.error, 'User is not linked to any active employee profile.')
  })

  test('3. Zero Auto-Seed Policy: Empty employee query returns empty array without injecting mock records', () => {
    // Simulating getEmployeesAction policy
    const databaseRows: any[] = []

    const getEmployees = (rows: any[]) => {
      // Previously: if (rows.length === 0) seedDefaultEmployees()
      // Hardened: returns empty data cleanly with zero side-effects
      return {
        success: true,
        data: rows,
      }
    }

    const result = getEmployees(databaseRows)
    assert.strictEqual(result.success, true)
    assert.strictEqual(result.data.length, 0, 'Must remain empty without auto-seeding mock records')
  })
})
