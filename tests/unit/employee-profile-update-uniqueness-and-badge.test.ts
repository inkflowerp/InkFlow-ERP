import { test, describe } from 'node:test'
import assert from 'node:assert'
import { WorkforceService } from '../../services/workforce.service.ts'
import { AuthService } from '../../services/auth.service.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { EmployeeRecord } from '../../types/workforce.types.ts'

describe('Employee Profile Update Uniqueness & ID Badge Formatting', () => {
  const companyId = 'comp-test-unique-emp'

  test('1. Updating employee profile with existing mobile and disabled login does not trigger duplicate username collision', async () => {
    // Setup test employee
    const initialEmployee: EmployeeRecord = {
      id: 'emp-2026-8701',
      company_id: companyId,
      branch_id: null,
      user_id: null,
      employee_id_number: 'EMP-2026-8701',
      name: 'Shahidur Rahman',
      mobile: '01762474444',
      email: 'shahidur@test.bd',
      role: 'Printing Master',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      base_salary: 25000,
      daily_rate: 961,
      hourly_rate: 120,
      overtime_hourly_rate: 180,
      current_advance_balance: 0,
      status: 'active',
      joining_date: '2026-10-07',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      portal_credentials: {
        create_login: false,
        username: '01762474444',
      },
    }

    // Seed into mock store
    PrintFlowDataStore.set(STORAGE_KEYS.EMPLOYEES, [initialEmployee])

    // Update with same phone number and disabled portal login
    const updateResult = await WorkforceService.updateEmployee(
      initialEmployee.id,
      companyId,
      {
        name: 'Shahidur Rahman',
        mobile: '01762474444',
        base_salary: 26000,
        portal_credentials: {
          create_login: false,
          username: '01762474444',
        },
      }
    )

    assert.ok(updateResult, 'Employee must update successfully')
    assert.strictEqual(updateResult.base_salary, 26000)
    assert.strictEqual(updateResult.mobile, '01762474444')
  })

  test('2. AuthService.validateIdentifierUniqueness skips username conflict if profile matches employee phone or excludeUserId', async () => {
    // Test that when phone matches the user profile phone, it is identified as the same user
    const result = await AuthService.validateIdentifierUniqueness({
      phone: '01762474444',
      username: '01762474444',
      excludeEmployeeId: 'emp-2026-8701',
      companyId,
    })

    // If username equals the employee phone, it must not falsely conflict with the same employee
    assert.strictEqual(result.available, true, 'Identifier check must be available for own credentials')
  })

  test('3. Employee role title helper prevents single-letter role degradation', () => {
    const formatRoleTitle = (role?: string | null, designation?: string | null, department?: string | null) => {
      const cleanDesignation = designation?.trim()
      if (cleanDesignation && cleanDesignation.length > 1) return cleanDesignation

      const cleanRole = role?.trim()
      if (cleanRole && cleanRole.length > 1) {
        return cleanRole
          .replace(/[_-]+/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      }

      if (department?.trim()) {
        return `${department.trim().replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} Staff`
      }

      return 'Official Staff'
    }

    // Role is "s" (single letter)
    assert.strictEqual(formatRoleTitle('s', undefined, 'printing'), 'Printing Staff')
    assert.strictEqual(formatRoleTitle('S', undefined, 'fabrication'), 'Fabrication Staff')
    assert.strictEqual(formatRoleTitle('s', 'Senior Press Master', 'printing'), 'Senior Press Master')

    // Valid slugs
    assert.strictEqual(formatRoleTitle('operator', undefined, 'printing'), 'Operator')
    assert.strictEqual(formatRoleTitle('production_manager', undefined, 'management'), 'Production Manager')
    assert.strictEqual(formatRoleTitle(null, null, null), 'Official Staff')
  })

  test('4. Updating employee photo persists on profile_picture_url and avatar_url for non-UUID employee ID', async () => {
    const empId = 'emp-2026-8701'
    const photoDataUrl = 'data:image/jpeg;base64,mockjpegphotosample'

    const updated = await WorkforceService.updateEmployee(
      empId,
      companyId,
      {
        profile_picture_url: photoDataUrl,
      }
    )

    assert.ok(updated, 'Update result must not be null')
    assert.strictEqual(updated.profile_picture_url, photoDataUrl, 'profile_picture_url must be updated')
    assert.strictEqual((updated as any).avatar_url, photoDataUrl, 'avatar_url must be synced with profile_picture_url')

    // Verify getEmployeeById retrieves updated photo
    const fetched = await WorkforceService.getEmployeeById(empId, companyId)
    assert.ok(fetched, 'Employee must be retrievable by ID')
    assert.strictEqual(fetched.profile_picture_url, photoDataUrl)
    assert.strictEqual((fetched as any).avatar_url, photoDataUrl)

    // Verify getEmployees list contains updated photo
    const list = await WorkforceService.getEmployees(companyId)
    const empInList = list.find((e) => e.id === empId || e.employee_id_number === 'EMP-2026-8701')
    assert.ok(empInList, 'Employee must be present in employees list')
    assert.strictEqual(empInList.profile_picture_url, photoDataUrl)
  })

  test('5. Removing employee photo sets profile_picture_url and avatar_url to null', async () => {
    const empId = 'emp-2026-8701'

    const updated = await WorkforceService.updateEmployee(
      empId,
      companyId,
      {
        profile_picture_url: null,
      }
    )

    assert.ok(updated)
    assert.strictEqual(updated.profile_picture_url, null)
    assert.strictEqual((updated as any).avatar_url, null)

    const fetched = await WorkforceService.getEmployeeById(empId, companyId)
    assert.ok(fetched)
    assert.strictEqual(fetched.profile_picture_url, null)
  })
})
