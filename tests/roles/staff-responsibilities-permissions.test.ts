import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_RESPONSIBILITY_MATRICES,
  normalizeResponsibilitySlug,
  normalizePortalRole,
  checkPermission,
  getPermissionDetail,
  extractResponsibilities,
  PRACTICAL_RESPONSIBILITIES,
} from '../../lib/auth/rbac.client.ts'
import {
  resolveUserRole,
  resolveUserResponsibilities,
  resolveUserDataScope,
} from '../../components/users/user-resolvers.ts'
import { resolveTenantRole, mapSessionToTenantRole } from '../../lib/auth/types.ts'
import { TenantRepository } from '../../lib/repositories/tenant.repository.ts'

describe('Staff Responsibilities, Roles & Permission-Based Account Engine', () => {
  describe('1. Practical Responsibilities Normalization & Resolution', () => {
    test('1.1 All practical responsibilities map to valid matrix slugs with functional permissions', () => {
      for (const practicalResp of PRACTICAL_RESPONSIBILITIES) {
        const slug = normalizeResponsibilitySlug(practicalResp)
        assert.ok(slug, `Practical responsibility "${practicalResp}" must normalize to a slug`)
        assert.ok(
          (DEFAULT_RESPONSIBILITY_MATRICES as any)[slug],
          `Slug "${slug}" (from "${practicalResp}") must exist in DEFAULT_RESPONSIBILITY_MATRICES`
        )
      }
    })

    test('1.2 Quotation responsibility grants quotation view & create permissions', () => {
      const slug = normalizeResponsibilitySlug('Quotation')
      assert.equal(slug, 'quotations')
      const matrix = (DEFAULT_RESPONSIBILITY_MATRICES as any)[slug]
      assert.equal(matrix.quotations?.view, true)
      assert.equal(matrix.quotations?.create, true)
      assert.equal(matrix.quotations?.approve, true)
    })

    test('1.3 Printing and Machine Operation responsibilities grant production & machinery access', () => {
      const printSlug = normalizeResponsibilitySlug('Printing')
      const printMatrix = (DEFAULT_RESPONSIBILITY_MATRICES as any)[printSlug]
      assert.equal(printMatrix.production?.complete, true)
      assert.equal(printMatrix.machineries?.view, true)

      const machineSlug = normalizeResponsibilitySlug('Machine Operation')
      const machineMatrix = (DEFAULT_RESPONSIBILITY_MATRICES as any)[machineSlug]
      assert.equal(machineMatrix.machineries?.edit, true)
      assert.equal(machineMatrix.production?.edit, true)
    })

    test('1.4 Customer Management responsibility grants customer CRUD without accounting or settings access', () => {
      const custSlug = normalizeResponsibilitySlug('Customer Management')
      assert.equal(custSlug, 'customers')
      const custMatrix = (DEFAULT_RESPONSIBILITY_MATRICES as any)[custSlug]
      assert.equal(custMatrix.customers?.view, true)
      assert.equal(custMatrix.customers?.create, true)
      assert.equal(custMatrix.customers?.edit, true)
      assert.equal(custMatrix.invoices?.create, undefined)
      assert.deepEqual(custMatrix.settings, {})
    })

    test('1.5 HR responsibility grants workforce management capabilities', () => {
      const hrSlug = normalizeResponsibilitySlug('HR')
      const hrMatrix = (DEFAULT_RESPONSIBILITY_MATRICES as any)[hrSlug]
      assert.equal(hrMatrix.hr?.view, true)
      assert.equal(hrMatrix.hr?.create, true)
      assert.equal(hrMatrix.hr?.edit, true)
      assert.equal(hrMatrix.hr?.approve, true)
    })
  })

  describe('2. Multi-Responsibility Union for Staff Accounts', () => {
    test('2.1 Staff with Sales + Quotation duties can generate quotes and manage clients', () => {
      const userCtx = {
        primaryRole: 'general_staff',
        responsibilities: ['sales', 'quotations'],
      }

      assert.equal(checkPermission(userCtx, 'quotations.create'), true)
      assert.equal(checkPermission(userCtx, 'quotations.view'), true)
      assert.equal(checkPermission(userCtx, 'customers.view'), true)
      assert.equal(checkPermission(userCtx, 'customers.create'), true)
      assert.equal(checkPermission(userCtx, 'orders.create'), true)

      // Strictly isolated from unauthorized areas:
      assert.equal(checkPermission(userCtx, 'machineries.delete'), false)
      assert.equal(checkPermission(userCtx, 'settings.manage'), false)
    })

    test('2.2 Machine Operator with Material Request duty can record scrap & request materials', () => {
      const userCtx = {
        primaryRole: 'operator',
        responsibilities: ['operator', 'material_request'],
      }

      assert.equal(checkPermission(userCtx, 'production.edit'), true)
      assert.equal(checkPermission(userCtx, 'production.complete'), true)
      assert.equal(checkPermission(userCtx, 'machineries.view'), true)
      assert.equal(checkPermission(userCtx, 'inventory.view'), true)
      assert.equal(checkPermission(userCtx, 'inventory.create'), true)

      // Cannot touch financial invoices or salary
      assert.equal(checkPermission(userCtx, 'invoices.create'), false)
      assert.equal(checkPermission(userCtx, 'hr.manage'), false)
    })

    test('2.3 Graphic Designer with Pre-press can download artwork and inspect orders', () => {
      const userCtx = {
        primaryRole: 'designer',
        responsibilities: ['designer'],
      }

      assert.equal(checkPermission(userCtx, 'design.view'), true)
      assert.equal(checkPermission(userCtx, 'design.download'), true)
      assert.equal(checkPermission(userCtx, 'design.approve'), true)
      assert.equal(checkPermission(userCtx, 'orders.view'), true)
      assert.equal(checkPermission(userCtx, 'orders.edit'), true)

      // Fail-closed against financial accounts
      assert.equal(checkPermission(userCtx, 'payments.delete'), false)
      assert.equal(checkPermission(userCtx, 'reports.export'), false)
    })
  })

  describe('3. Staff Self-Service Baseline Permissions', () => {
    test('3.1 Every staff role possesses tasks, notifications, and support capabilities', () => {
      const staffRoles = [
        'general_staff',
        'operator',
        'designer',
        'sales_manager',
        'store_manager',
        'delivery_coordinator',
      ]

      for (const role of staffRoles) {
        const userCtx = { primaryRole: role, responsibilities: [role] }
        assert.equal(
          checkPermission(userCtx, 'tasks.view'),
          true,
          `Role ${role} must have tasks.view`
        )
        assert.equal(
          checkPermission(userCtx, 'tasks.complete'),
          true,
          `Role ${role} must have tasks.complete`
        )
        assert.equal(
          checkPermission(userCtx, 'notifications.view'),
          true,
          `Role ${role} must have notifications.view`
        )
        assert.equal(
          checkPermission(userCtx, 'support.view'),
          true,
          `Role ${role} must have support.view`
        )
        assert.equal(
          checkPermission(userCtx, 'support.create'),
          true,
          `Role ${role} must have support.create`
        )
      }
    })
  })

  describe('4. User Resolvers & Edit Access Form Synchronization', () => {
    test('4.1 resolveUserResponsibilities expands stored role slug into practical checkboxes', () => {
      const mockOperatorUser = {
        id: 'cu-op-1',
        responsibilities: ['operator'],
      } as any

      const resps = resolveUserResponsibilities(mockOperatorUser, 'operator')
      assert.ok(resps.includes('Printing'))
      assert.ok(resps.includes('Machine Operation'))
      assert.ok(resps.includes('Material Request'))
    })

    test('4.2 resolveUserResponsibilities preserves customized practical duties', () => {
      const mockCustomUser = {
        id: 'cu-sales-1',
        responsibilities: ['Sales', 'Quotation', 'Customer Management'],
      } as any

      const resps = resolveUserResponsibilities(mockCustomUser, 'sales_manager')
      assert.deepEqual(resps, ['Sales', 'Quotation', 'Customer Management'])
    })

    test('4.3 resolveUserRole accurately resolves canonical role representation', () => {
      const designerUser = {
        id: 'cu-des-1',
        role: { name: 'Graphic Designer', slug: 'designer' },
        responsibilities: ['designer'],
      } as any

      const resolved = resolveUserRole(designerUser)
      assert.equal(resolved.slug, 'designer')
      assert.equal(resolved.name, 'Graphic Designer')
    })
  })

  describe('5. Staff Identity & Anti-Escalation Boundary', () => {
    test('5.1 Staff roles never accidentally resolve as business_owner', () => {
      assert.equal(resolveTenantRole('operator'), 'machine_operator')
      assert.equal(resolveTenantRole('designer'), 'graphic_designer')
      assert.equal(resolveTenantRole('sales_manager'), 'sales_manager')
      assert.equal(resolveTenantRole('general_staff'), 'general_staff')
      assert.equal(resolveTenantRole('accountant'), 'accountant')
      assert.equal(resolveTenantRole('branch_manager'), 'branch_manager')
    })

    test('5.2 mapSessionToTenantRole accurately routes staff to their specific portal', () => {
      assert.equal(mapSessionToTenantRole('Machine Operator'), 'operator')
      assert.equal(mapSessionToTenantRole('Graphic Designer & Prepress'), 'designer')
      assert.equal(mapSessionToTenantRole('Senior Graphic Designer & Prepress'), 'designer')
      assert.equal(mapSessionToTenantRole('Branch Manager'), 'branch_manager')
      assert.equal(resolveTenantRole('Counter Sales Executive'), 'sales_manager')
      assert.equal(mapSessionToTenantRole('Counter Sales Executive'), 'manager')
      assert.equal(mapSessionToTenantRole('Head Accountant'), 'accountant')
    })
  })
})
