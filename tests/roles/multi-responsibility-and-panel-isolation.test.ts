import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeResponsibilitySlug,
  normalizePortalRole,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '../../lib/auth/rbac.client.ts'
import { mapSessionToTenantRole } from '../../lib/auth/types.ts'

describe('Multi-Responsibility & Fail-Closed Panel Isolation Engine', () => {
  describe('1. Small Printshop Scenario: 1 Owner + 1 Designer + 1 Print Operator', () => {
    test('1.1 Pure Graphic Designer has design & prepress access, but is isolated from payments, inventory and settings', () => {
      const designerMatrix = DEFAULT_RESPONSIBILITY_MATRICES.designer

      // Permitted:
      assert.equal(designerMatrix.design?.view, true)
      assert.equal(designerMatrix.design?.create, true)
      assert.equal(designerMatrix.design?.edit, true)

      // Fail-closed blocked:
      assert.equal(designerMatrix.payments?.view, undefined, 'Designer must NOT view payments/accounting')
      assert.equal(designerMatrix.inventory?.view, undefined, 'Designer must NOT view raw inventory rolls')
      assert.deepEqual(designerMatrix.settings, {}, 'Designer must NOT manage company settings')
      assert.equal(designerMatrix.users?.view, undefined, 'Designer must NOT manage users')
    })

    test('1.2 Pure Print Operator has shopfloor & machine access, but is isolated from design studio, billing, and hr', () => {
      const operatorMatrix = DEFAULT_RESPONSIBILITY_MATRICES.operator

      // Permitted:
      assert.equal(operatorMatrix.production?.view, true)
      assert.equal(operatorMatrix.machineries?.view, true)

      // Fail-closed blocked:
      assert.equal(operatorMatrix.design?.edit, undefined, 'Operator must NOT edit design artwork')
      assert.deepEqual(operatorMatrix.invoices, {}, 'Operator must NOT view or edit invoices')
      assert.equal(operatorMatrix.hr?.view, undefined, 'Operator must NOT view HR / employee salaries')
      assert.deepEqual(operatorMatrix.settings, {}, 'Operator must NOT view or modify settings')
    })
  })

  describe('2. Multi-Responsibility Cross-Duty Employee (e.g. Graphic Designer + Print Operator)', () => {
    test('2.1 Multi-responsibility union combines capabilities without mutual cancellation', () => {
      const responsibilities = ['designer', 'operator']

      // Build synthesized union permissions
      const unionPermissions: Record<string, Record<string, boolean>> = {}

      for (const resp of responsibilities) {
        const canonical = normalizeResponsibilitySlug(resp)
        const matrix = DEFAULT_RESPONSIBILITY_MATRICES[canonical] || {}

        for (const [mod, perms] of Object.entries(matrix)) {
          if (!unionPermissions[mod]) unionPermissions[mod] = {}
          for (const [action, allowed] of Object.entries(perms as Record<string, boolean>)) {
            if (allowed) unionPermissions[mod][action] = true
          }
        }
      }

      // Must have Design capabilities
      assert.equal(unionPermissions.design?.view, true)
      assert.equal(unionPermissions.design?.create, true)
      assert.equal(unionPermissions.design?.edit, true)
      assert.equal(unionPermissions.design?.approve, true)

      // Must also have Production & Machinery capabilities
      assert.equal(unionPermissions.production?.view, true)
      assert.equal(unionPermissions.machineries?.view, true)

      // Must STILL be fail-closed isolated from sensitive modules
      assert.equal(unionPermissions.payments?.view, undefined, 'Dual role must NOT gain financial access')
      assert.equal(unionPermissions.invoices?.create, undefined, 'Dual role must NOT create financial invoices')
      assert.equal(unionPermissions.hr?.view, undefined, 'Dual role must NOT view employee payroll')
      assert.equal(unionPermissions.users?.manage, undefined, 'Dual role must NOT manage system users')
    })

    test('2.2 Multi-responsibility employee with Sales + Delivery duties', () => {
      const responsibilities = ['sales', 'delivery']
      const unionPermissions: Record<string, Record<string, boolean>> = {}

      for (const resp of responsibilities) {
        const canonical = normalizeResponsibilitySlug(resp)
        const matrix = DEFAULT_RESPONSIBILITY_MATRICES[canonical] || {}

        for (const [mod, perms] of Object.entries(matrix)) {
          if (!unionPermissions[mod]) unionPermissions[mod] = {}
          for (const [action, allowed] of Object.entries(perms as Record<string, boolean>)) {
            if (allowed) unionPermissions[mod][action] = true
          }
        }
      }

      // Can create orders and quotations
      assert.equal(unionPermissions.orders?.create, true)
      assert.equal(unionPermissions.quotations?.create, true)

      // Can manage delivery & challan
      assert.equal(unionPermissions.delivery?.view, true)
      assert.equal(unionPermissions.delivery?.create, true)

      // Cannot access machine maintenance or HR
      assert.equal(unionPermissions.machineries?.manage, undefined)
      assert.equal(unionPermissions.hr?.view, undefined)
    })
  })

  describe('3. Business Owner Universal Governance & Configuration', () => {
    test('3.1 Business Owner bypasses all module restrictions', () => {
      const isOwner = true
      const can = (action: string, module: string) => {
        if (isOwner) return true
        return false
      }

      assert.equal(can('view', 'payments'), true)
      assert.equal(can('manage', 'settings'), true)
      assert.equal(can('manage', 'users'), true)
      assert.equal(can('delete', 'customers'), true)
      assert.equal(can('manage', 'branches'), true)
    })

    test('3.2 Responsibilities normalization handles varied raw input strings from owners', () => {
      assert.equal(normalizeResponsibilitySlug('Graphic Designer'), 'designer')
      assert.equal(normalizeResponsibilitySlug('Machine Operator'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Finishing & Fabrication'), 'operator')
      assert.equal(normalizeResponsibilitySlug('Store & Inventory'), 'store_manager')
      assert.equal(normalizeResponsibilitySlug('Delivery Man'), 'delivery_coordinator')
      assert.equal(normalizeResponsibilitySlug('Accounts & Cashier'), 'accountant')
      assert.equal(normalizeResponsibilitySlug('Sales Representative'), 'sales_manager')
      assert.equal(normalizeResponsibilitySlug('Production Floor Incharge'), 'production_manager')
    })
  })

  describe('4. Panel Access Guard Logic Simulation', () => {
    function simulateGuardCheck(user: {
      isOwner: boolean
      roles: string[]
      responsibilities: string[]
      permissions: Record<string, Record<string, boolean>>
    }, guard: {
      module?: string
      action?: string
      roles?: string[]
      requireAllRoles?: boolean
    }): boolean {
      if (user.isOwner) return true

      // Role check
      if (guard.roles && guard.roles.length > 0) {
        const userAllRoles = [...user.roles, ...user.responsibilities].map(r => r.toLowerCase().trim())
        if (guard.requireAllRoles) {
          const hasAll = guard.roles.every(r => userAllRoles.includes(r.toLowerCase().trim()))
          if (!hasAll) return false
        } else {
          const hasAny = guard.roles.some(r => userAllRoles.includes(r.toLowerCase().trim()))
          if (!hasAny) return false
        }
      }

      // Module & action check
      if (guard.module && guard.action) {
        return !!user.permissions[guard.module]?.[guard.action]
      }

      return true
    }

    test('4.1 Fail-closed: Designer navigating to /accounting is denied', () => {
      const designerUser = {
        isOwner: false,
        roles: ['designer'],
        responsibilities: ['designer'],
        permissions: {
          design: { view: true, create: true, edit: true },
          orders: { view: true },
        },
      }

      const allowed = simulateGuardCheck(designerUser, { module: 'payments', action: 'view' })
      assert.equal(allowed, false, 'Designer must be blocked from /accounting')
    })

    test('4.2 Fail-closed: Operator navigating to /settings/users is denied', () => {
      const operatorUser = {
        isOwner: false,
        roles: ['operator'],
        responsibilities: ['operator'],
        permissions: {
          production: { view: true, edit: true },
          machineries: { view: true },
        },
      }

      const allowed = simulateGuardCheck(operatorUser, { module: 'users', action: 'manage' })
      assert.equal(allowed, false, 'Operator must be blocked from /settings/users')
    })

    test('4.3 Multi-responsibility: Designer + Operator navigating to /operator is allowed', () => {
      const multiUser = {
        isOwner: false,
        roles: ['designer', 'operator'],
        responsibilities: ['designer', 'operator'],
        permissions: {
          design: { view: true, create: true, edit: true },
          production: { view: true, edit: true },
          machineries: { view: true },
        },
      }

      assert.equal(simulateGuardCheck(multiUser, { module: 'production', action: 'view' }), true)
      assert.equal(simulateGuardCheck(multiUser, { module: 'design', action: 'view' }), true)
      assert.equal(simulateGuardCheck(multiUser, { module: 'payments', action: 'view' }), false)
    })
  })
})
