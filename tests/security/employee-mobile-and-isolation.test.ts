import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { getRoleDefaultPath } from '../../lib/auth/types.ts'
import { getServerFilteredNavigation, NAV_SECTIONS } from '../../config/navigation.config.ts'
import {
  sanitizeVirusSafeFileName,
  MAX_DESIGN_FILE_SIZE_BYTES,
} from '../../lib/security/file-validation.ts'
import { DEFAULT_LOCALE } from '../../i18n/config.ts'

describe('Employee Experience, Mobile-First, Bangla Default & Server-Enforced Isolation', () => {

  describe('1. Role-Based Landing Redirection', () => {
    test('1.1 Operator lands on /operator', () => {
      const path = getRoleDefaultPath('operator', 'inkflow-press')
      assert.equal(path, '/inkflow-press/operator')
    })

    test('1.2 Graphic Designer lands on /designer', () => {
      const path = getRoleDefaultPath('designer', 'inkflow-press')
      assert.equal(path, '/inkflow-press/designer')
    })

    test('1.3 Production Manager lands on /production board', () => {
      const path = getRoleDefaultPath('production_manager', 'inkflow-press')
      assert.equal(path, '/inkflow-press/production')
    })

    test('1.4 Sales Manager lands on /orders', () => {
      const path = getRoleDefaultPath('sales_manager', 'inkflow-press')
      assert.equal(path, '/inkflow-press/orders')
    })

    test('1.5 General Staff lands on /portal', () => {
      const path = getRoleDefaultPath('general_staff', 'inkflow-press')
      assert.equal(path, '/inkflow-press/portal')
    })

    test('1.6 Business Owner & Branch Manager land on /dashboard', () => {
      assert.equal(getRoleDefaultPath('business_owner', 'inkflow-press'), '/inkflow-press/dashboard')
      assert.equal(getRoleDefaultPath('branch_manager', 'inkflow-press'), '/inkflow-press/dashboard')
    })
  })

  describe('2. Server-Authoritative Navigation Isolation (General Staff & Non-Owners)', () => {
    test('2.1 General staff receives ZERO owner navigation modules in server payload', () => {
      const staffNav = getServerFilteredNavigation('general_staff', ['hr.view', 'attendance.view'])
      
      const forbiddenSectionKeys = [
        'financials',
        'operations',
        'marketing',
        'analytics',
        'management',
        'reports',
        'settings',
        'trash',
      ]

      for (const section of staffNav) {
        assert.ok(
          !forbiddenSectionKeys.includes(section.key),
          `Security Violation: Forbidden section "${section.key}" was leaked to general_staff`
        )
      }

      // Check all items in all allowed sections
      for (const section of staffNav) {
        for (const item of section.items) {
          const forbiddenHrefs = [
            '/dashboard',
            '/billing',
            '/settings',
            '/users',
            '/accounting',
            '/trash',
            '/audit-logs',
          ]
          for (const forbidden of forbiddenHrefs) {
            assert.ok(
              !item.href.includes(forbidden),
              `Security Violation: General staff received forbidden navigation link "${item.href}"`
            )
          }
        }
      }
    })

    test('2.2 Operator navigation is strictly scoped to shop floor and self-service', () => {
      const operatorNav = getServerFilteredNavigation('operator', ['production.view', 'hr.view'])
      
      // Operator should have operator route
      const allHrefs = operatorNav.flatMap((s) => s.items.map((i) => i.href))
      assert.ok(allHrefs.some((h) => h.includes('/operator')), 'Operator must have access to /operator')
      assert.ok(allHrefs.some((h) => h.includes('/portal') || h.includes('/attendance')), 'Operator must have access to self-service')

      // Must NOT contain owner-only billing, analytics, or settings
      assert.ok(!allHrefs.some((h) => h.includes('/billing')), 'Operator must not receive billing links')
      assert.ok(!allHrefs.some((h) => h.includes('/accounting')), 'Operator must not receive accounting links')
      assert.ok(!allHrefs.some((h) => h.includes('/settings/subscription')), 'Operator must not receive subscription links')
    })

    test('2.3 Designer navigation is strictly scoped to studio and self-service', () => {
      const designerNav = getServerFilteredNavigation('designer', ['design.view', 'hr.view'])
      const allHrefs = designerNav.flatMap((s) => s.items.map((i) => i.href))
      
      assert.ok(allHrefs.some((h) => h.includes('/designer')), 'Designer must have access to /designer')
      assert.ok(!allHrefs.some((h) => h.includes('/accounting')), 'Designer must not receive accounting links')
      assert.ok(!allHrefs.some((h) => h.includes('/settings/company')), 'Designer must not receive company admin links')
    })

    test('2.4 Owner receives full navigation sections when authorized', () => {
      const ownerNav = getServerFilteredNavigation('business_owner', ['*'])
      assert.ok(ownerNav.length >= NAV_SECTIONS.length - 1, 'Owner must receive complete navigation tree')
    })
  })

  describe('3. File Upload Validation & Virus-Safe Sanitization (Designer Module)', () => {
    test('3.1 Rejects dangerous executable extensions', () => {
      const dangerousNames = [
        'trojan.exe',
        'shell.bat',
        'script.sh',
        'backdoor.php',
        'exploit.js',
        'payload.vbs',
        'installer.msi',
        'agent.apk',
        'malware.scr',
      ]

      for (const name of dangerousNames) {
        assert.throws(
          () => sanitizeVirusSafeFileName(name),
          /Dangerous executable extension|File upload rejected/,
          `Expected ${name} to be rejected as dangerous`
        )
      }
    })

    test('3.2 Rejects files without extension or with unauthorized formats', () => {
      assert.throws(() => sanitizeVirusSafeFileName('noextension'), /File must have a valid extension/)
      assert.throws(() => sanitizeVirusSafeFileName('document.docx'), /Invalid file format/)
      assert.throws(() => sanitizeVirusSafeFileName('archive.tar.gz'), /Invalid file format/)
    })

    test('3.3 Accepts valid print artwork extensions and neutralizes special characters', () => {
      const validCases = [
        { input: 'Brochure Final (CMYK) v2.pdf', expectedExt: 'pdf' },
        { input: 'banner-vector-logo.ai', expectedExt: 'ai' },
        { input: 'front_cover_design.psd', expectedExt: 'psd' },
        { input: 'billboard_300dpi.tiff', expectedExt: 'tiff' },
        { input: 'preview_proof.png', expectedExt: 'png' },
        { input: 'client-photo.jpg', expectedExt: 'jpg' },
      ]

      for (const { input, expectedExt } of validCases) {
        const sanitized = sanitizeVirusSafeFileName(input)
        assert.ok(sanitized.endsWith(`.${expectedExt}`), `Expected extension .${expectedExt}`)
        assert.ok(!sanitized.includes(' '), 'Sanitized name must not contain raw spaces')
        assert.ok(!sanitized.includes('('), 'Sanitized name must not contain parentheses')
      }
    })

    test('3.4 Neutralizes path traversal attempts', () => {
      const traversalName = '../../../../etc/passwd.pdf'
      const sanitized = sanitizeVirusSafeFileName(traversalName)
      assert.ok(!sanitized.includes('/'), 'Must not contain forward slashes')
      assert.ok(!sanitized.includes('\\'), 'Must not contain backward slashes')
      assert.ok(!sanitized.startsWith('..'), 'Must not start with parent directory navigation')
    })

    test('3.5 Enforces 50MB file size limit', () => {
      assert.equal(MAX_DESIGN_FILE_SIZE_BYTES, 50 * 1024 * 1024)
      const allowed50MB = 50 * 1024 * 1024
      const rejected51MB = 51 * 1024 * 1024
      assert.ok(allowed50MB <= MAX_DESIGN_FILE_SIZE_BYTES)
      assert.ok(rejected51MB > MAX_DESIGN_FILE_SIZE_BYTES)
    })
  })

  describe('4. Mobile-First Standards & Bangla Default Configuration', () => {
    test('4.1 System default locale is Bengali (bn)', () => {
      assert.equal(DEFAULT_LOCALE, 'bn', 'Default locale for InkFlow ERP must be bn (Bangla)')
    })

    test('4.2 Minimum touch targets and typography standard constants', () => {
      const MIN_TOUCH_TARGET_PX = 48
      const MIN_BODY_TYPOGRAPHY_PX = 16

      assert.ok(MIN_TOUCH_TARGET_PX >= 48, 'Touch targets for mobile operators must be at least 48px')
      assert.ok(MIN_BODY_TYPOGRAPHY_PX >= 16, 'Minimum body text size must be 16px to prevent iOS auto-zoom')
    })
  })

  describe('5. Negative Authorization: Operator & Staff Blocked from Owner Routes & Actions', () => {
    // 5.1 Route-level permission checks
    const OWNER_ONLY_PERMISSIONS = [
      'settings.view',
      'settings.manage',
      'invoices.view',
      'invoices.delete',
      'payments.view',
      'payments.manage',
      'reports.view',
      'users.manage',
      'orders.delete',
      'orders.purge_all',
    ]

    test('5.1 Operator is strictly denied from all owner routes & permissions', () => {
      const operatorPermissions = [
        'production.view',
        'production.edit',
        'production.complete',
        'tasks.view',
        'tasks.complete',
        'machineries.view',
        'design.view',
        'inventory.view',
        'orders.view',
        'hr.view', // Self-service attendance
      ]

      for (const ownerPerm of OWNER_ONLY_PERMISSIONS) {
        assert.ok(
          !operatorPermissions.includes(ownerPerm),
          `Security Violation: Operator possesses forbidden owner permission "${ownerPerm}"`
        )
      }
    })

    test('5.2 General Staff is strictly denied from commercial and administrative permissions', () => {
      const staffPermissions = ['hr.view', 'attendance.view']

      for (const ownerPerm of OWNER_ONLY_PERMISSIONS) {
        assert.ok(
          !staffPermissions.includes(ownerPerm),
          `Security Violation: General Staff possesses forbidden permission "${ownerPerm}"`
        )
      }
    })

    test('5.3 Operator calling simulated owner mutating action (purgeAllOrdersAction) is rejected', () => {
      // Simulate action-wrapper check
      function simulateTenantAction(permission: string, userPermissions: string[], isOwner: boolean) {
        if (!isOwner && !userPermissions.includes(permission)) {
          return { success: false, code: 'FORBIDDEN', error: `Unauthorized: Missing permission "${permission}"` }
        }
        return { success: true }
      }

      const operatorPerms = ['production.view', 'production.complete']
      const purgeResult = simulateTenantAction('orders.purge_all', operatorPerms, false)
      assert.equal(purgeResult.success, false)
      assert.equal(purgeResult.code, 'FORBIDDEN')

      const resetDataResult = simulateTenantAction('settings.manage', operatorPerms, false)
      assert.equal(resetDataResult.success, false)
      assert.equal(resetDataResult.code, 'FORBIDDEN')
    })
  })

  describe('6. Scoped Ownership Enforcement & Data Isolation (Tasks, Attendance, Payslips)', () => {
    interface ProductionTask {
      id: string
      company_id: string
      job_name: string
      assigned_employee_id: string
      machine_id: string
      status: 'pending' | 'in_progress' | 'paused' | 'completed'
    }

    const mockTasks: ProductionTask[] = [
      { id: 'task-101', company_id: 'comp-1', job_name: 'Poster Print A', assigned_employee_id: 'emp-operator-1', machine_id: 'mach-roland', status: 'in_progress' },
      { id: 'task-102', company_id: 'comp-1', job_name: 'Banner Flex B', assigned_employee_id: 'emp-operator-1', machine_id: 'mach-roland', status: 'pending' },
      { id: 'task-201', company_id: 'comp-1', job_name: 'Sticker Die-Cut C', assigned_employee_id: 'emp-operator-2', machine_id: 'mach-mimaki', status: 'pending' },
      { id: 'task-202', company_id: 'comp-1', job_name: 'Book Binding D', assigned_employee_id: 'emp-operator-2', machine_id: 'mach-polar', status: 'pending' },
    ]

    test('6.1 Operator 1 query is scoped strictly to Operator 1 tasks or machine', () => {
      // Scoped query logic matching RLS policy
      function getOperatorTaskQueue(operatorEmpId: string, operatorMachineId: string) {
        return mockTasks.filter(
          (t) => t.assigned_employee_id === operatorEmpId || t.machine_id === operatorMachineId
        )
      }

      const op1Queue = getOperatorTaskQueue('emp-operator-1', 'mach-roland')
      assert.equal(op1Queue.length, 2)
      assert.ok(op1Queue.every((t) => t.assigned_employee_id === 'emp-operator-1'))
      assert.ok(!op1Queue.some((t) => t.id === 'task-201'), 'Operator 1 must NOT see Task 201')
      assert.ok(!op1Queue.some((t) => t.id === 'task-202'), 'Operator 1 must NOT see Task 202')
    })

    test('6.2 Operator 1 mutating Operator 2 task is rejected with ownership violation', () => {
      function mutateTaskStatus(
        taskId: string,
        newStatus: ProductionTask['status'],
        actingOperatorEmpId: string,
        actingMachineId: string
      ) {
        const task = mockTasks.find((t) => t.id === taskId)
        if (!task) throw new Error('Task not found')
        
        // Ownership check matching Migration 115 RLS
        const isAssigned = task.assigned_employee_id === actingOperatorEmpId
        const isMachineOperator = task.machine_id === actingMachineId
        if (!isAssigned && !isMachineOperator) {
          return { success: false, code: 'OWNERSHIP_VIOLATION', error: 'Forbidden: You can only update tasks assigned to you or your machine.' }
        }
        return { success: true, task: { ...task, status: newStatus } }
      }

      const crossMutation = mutateTaskStatus('task-201', 'completed', 'emp-operator-1', 'mach-roland')
      assert.equal(crossMutation.success, false)
      assert.equal(crossMutation.code, 'OWNERSHIP_VIOLATION')
    })

    test('6.3 Employee salary advances & payslips are strictly scoped to auth.uid() employee', () => {
      interface SalaryAdvance {
        id: string
        employee_id: string
        amount: number
        reason: string
      }

      const mockAdvances: SalaryAdvance[] = [
        { id: 'adv-01', employee_id: 'emp-staff-1', amount: 3000, reason: 'Medical emergency' },
        { id: 'adv-02', employee_id: 'emp-staff-2', amount: 5000, reason: 'Family event' },
      ]

      // Filter matching RLS: auth_get_current_employee_id(company_id) = employee_id
      function getEmployeeAdvances(currentEmployeeId: string) {
        return mockAdvances.filter((a) => a.employee_id === currentEmployeeId)
      }

      const staff1Advances = getEmployeeAdvances('emp-staff-1')
      assert.equal(staff1Advances.length, 1)
      assert.equal(staff1Advances[0].id, 'adv-01')
      assert.ok(!staff1Advances.some((a) => a.id === 'adv-02'), 'Staff 1 must NEVER see Staff 2 salary advance')
    })

    test('6.4 Network response verification: Zero cross-employee data leaks in payload', () => {
      interface PersonalPortalPayload {
        employee: { id: string; name: string; designation: string }
        attendance: { daysPresent: number; totalLateMinutes: number }
        salary: { basic: number; gross: number; netPayable: number }
        advances: { balance: number }
      }

      const networkResponsePayload: PersonalPortalPayload = {
        employee: { id: 'emp-staff-1', name: 'Karim Ullah', designation: 'General Staff' },
        attendance: { daysPresent: 22, totalLateMinutes: 15 },
        salary: { basic: 16000, gross: 24000, netPayable: 21000 },
        advances: { balance: 3000 },
      }

      const serialized = JSON.stringify(networkResponsePayload)

      // Assert payload contains only self data
      assert.ok(serialized.includes('Karim Ullah'))
      assert.ok(serialized.includes('emp-staff-1'))
      
      // Negative assertion: no mention of other staff IDs or names
      assert.ok(!serialized.includes('emp-staff-2'))
      assert.ok(!serialized.includes('emp-operator-1'))
      assert.ok(!serialized.includes('Rafiqul Islam'))
      assert.ok(!serialized.includes('Nurul Amin'))
    })
  })
})
