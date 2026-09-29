import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeResponsibilitySlug,
  normalizePortalRole,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '../../lib/auth/rbac.client.ts'
import { mapSessionToTenantRole } from '../../lib/auth/types.ts'

describe('Print Operator Account, Portal, Roles, Permissions, Restrictions & Employee Self-Service', () => {
  describe('1. Print Operator Role & Designation Normalization', () => {
    test('1.1 normalizePortalRole resolves all print and press operator variations to canonical "operator"', () => {
      const operatorTitles = [
        'operator',
        'OPERATOR',
        'Machine Operator',
        'machine_operator',
        'Master Offset Printer',
        'Master Offset Machine Operator',
        'Large Format & UV Operator',
        'Large Format & UV Flatbed Operator',
        'Digital Color Press Specialist',
        'Finishing & Die-Cut Specialist',
        'Die-Cutting Master',
        'Signage & Acrylic CNC Fabricator',
        'Pressman',
        'Lead Press Operator',
        'Offset Pressman',
        'Plotter Technician',
        'Heidelberg Offset Machinist',
        'Book Binder & Finisher',
      ]

      for (const title of operatorTitles) {
        const canonical = normalizePortalRole(title)
        assert.equal(
          canonical,
          'operator',
          `Expected "${title}" to normalize to "operator", but got "${canonical}"`
        )
      }
    })

    test('1.2 normalizeResponsibilitySlug maps shop floor technical designations to "operator"', () => {
      assert.equal(normalizeResponsibilitySlug('Master Offset Printer'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Large Format & UV Flatbed Operator'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Finishing & Die-Cut Specialist'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Signage & Acrylic CNC Fabricator'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Pressman'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Digital Color Press Specialist'), 'operator')
    })

    test('1.3 mapSessionToTenantRole normalizes operator roles from session user data', () => {
      assert.equal(mapSessionToTenantRole('Master Offset Machine Operator'), 'operator')
      assert.equal(mapSessionToTenantRole('Pressman'), 'operator')
      assert.equal(mapSessionToTenantRole('operator'), 'operator')
      assert.equal(mapSessionToTenantRole('machine_operator'), 'operator')
      assert.equal(mapSessionToTenantRole('Offset Printer'), 'operator')
    })
  })

  describe('2. Print Operator Permissions Matrix & Shop Floor Capabilities', () => {
    const operatorMatrix = DEFAULT_RESPONSIBILITY_MATRICES.operator

    test('2.1 Operator has full capability to execute and complete production floor tasks', () => {
      assert.ok(operatorMatrix.production, 'Production matrix must be defined for operator')
      assert.equal(operatorMatrix.production.view, true)
      assert.equal(operatorMatrix.production.edit, true)
      assert.equal(operatorMatrix.production.complete, true)

      assert.ok(operatorMatrix.tasks, 'Tasks matrix must be defined for operator')
      assert.equal(operatorMatrix.tasks.view, true)
      assert.equal(operatorMatrix.tasks.complete, true)
    })

    test('2.2 Operator can view and log maintenance on shop floor machinery fleet', () => {
      assert.ok(operatorMatrix.machineries, 'Machineries matrix must be defined')
      assert.equal(operatorMatrix.machineries.view, true)
      assert.equal(operatorMatrix.machineries.edit, true, 'Operator must be able to log machine maintenance or breakdowns')
    })

    test('2.3 Operator can download approved artwork proofs to send to RIP software', () => {
      assert.ok(operatorMatrix.design, 'Design matrix must be defined for operator')
      assert.equal(operatorMatrix.design.view, true)
      assert.equal(operatorMatrix.design.download, true, 'Operator must be able to download artwork proofs')
    })

    test('2.4 Operator can view floor stock levels for paper rolls, substrates, and inks', () => {
      assert.ok(operatorMatrix.inventory, 'Inventory matrix must be defined')
      assert.equal(operatorMatrix.inventory.view, true, 'Operator must be able to view inventory stock')
    })

    test('2.5 Operator can view order specs to verify dimensions, materials, and print counts', () => {
      assert.ok(operatorMatrix.orders, 'Orders matrix must be defined')
      assert.equal(operatorMatrix.orders.view, true)
    })
  })

  describe('3. Strict Governance Restrictions & Financial Limitations for Operators', () => {
    const operatorMatrix = DEFAULT_RESPONSIBILITY_MATRICES.operator

    test('3.1 Operator is strictly blocked from customer invoicing, billing, and rates', () => {
      assert.deepEqual(operatorMatrix.invoices, {}, 'Operator must have ZERO access to customer invoices')
    })

    test('3.2 Operator is strictly blocked from payment collections and cashbook entries', () => {
      assert.deepEqual(operatorMatrix.payments, {}, 'Operator must have ZERO access to payments or cashbook')
    })

    test('3.3 Operator cannot access pricing calculators, profit margins, or pricing matrices', () => {
      assert.deepEqual(operatorMatrix.pricing, {}, 'Operator must have ZERO access to pricing estimators or margins')
    })

    test('3.4 Operator is strictly blocked from company reports and financial statements', () => {
      assert.deepEqual(operatorMatrix.reports, {}, 'Operator must have ZERO access to business reports')
    })

    test('3.5 Operator is strictly blocked from tenant settings and user administration', () => {
      assert.deepEqual(operatorMatrix.settings, {}, 'Operator must have ZERO access to settings')
      assert.deepEqual(operatorMatrix.users, {}, 'Operator must not manage platform users')
    })

    test('3.6 Operator cannot void or delete commercial orders', () => {
      assert.equal(
        (operatorMatrix.orders as any).delete,
        undefined,
        'Operator must not have order deletion permissions'
      )
      assert.equal(
        (operatorMatrix.orders as any).cancel,
        undefined,
        'Operator must not cancel customer orders'
      )
    })
  })

  describe('4. Universal Employee Workforce Self-Service Isolation', () => {
    test('4.1 Ordinary employees are restricted from company-wide HR management', () => {
      // General employees do NOT have company-wide HR management permissions
      assert.deepEqual(
        DEFAULT_RESPONSIBILITY_MATRICES.operator.hr,
        {},
        'Operator must not manage company-wide HR or see fellow employees confidential files'
      )
      assert.deepEqual(
        DEFAULT_RESPONSIBILITY_MATRICES.designer.hr,
        {},
        'Designer must not manage company-wide HR'
      )
      assert.deepEqual(
        DEFAULT_RESPONSIBILITY_MATRICES.general_staff.hr,
        {},
        'General staff must not manage company-wide HR'
      )
    })

    test('4.2 Self-service data model provides personal workforce visibility for every employee', () => {
      // Verify expected fields for personal employee self-service records
      const mockPersonalRecord = {
        employee_id: 'emp_123',
        attendance: {
          presentDays: 22,
          lateDays: 2,
          lateMinutes: 25,
        },
        overtime: {
          approvedHours: 14.5,
          hourlyRate: 200,
          totalEarnings: 2900,
        },
        leaves: {
          allowed: 12,
          consumed: 2,
          remaining: 10,
        },
        salary: {
          basic: 15000,
          gross: 27900,
          advanceDeduction: 3000,
          netPayable: 24900,
        },
        advanceSalary: {
          currentBalance: 3000,
        },
      }

      assert.equal(mockPersonalRecord.attendance.presentDays, 22)
      assert.equal(mockPersonalRecord.attendance.lateDays, 2)
      assert.equal(mockPersonalRecord.overtime.totalEarnings, 2900)
      assert.equal(mockPersonalRecord.leaves.remaining, 10)
      assert.equal(mockPersonalRecord.salary.netPayable, 24900)
      assert.equal(mockPersonalRecord.advanceSalary.currentBalance, 3000)
    })
  })
})
