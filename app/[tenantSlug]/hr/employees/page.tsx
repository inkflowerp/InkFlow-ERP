'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { EmployeeTable } from '@/components/workforce/employee-table'
import { EmployeeProfileDialog } from '@/components/workforce/employee-profile-dialog'
import { EmployeeFormWizard } from '@/components/workforce/employee-form-wizard'
import {
 getEmployeesAction,
 createEmployeeAction,
 updateEmployeeAction,
 sendEmployeeInvitationAction,
} from '@/actions/workforce.actions'
import { listBranchesAction } from '@/actions/branch.actions'
import type { EmployeeRecord } from '@/types/workforce.types'

export default function EmployeesPage() {
  const { tBilingual } = useI18n()
  const params = useParams()
 const searchParams = useSearchParams()
 const { company } = useTenant()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

 const [employees, setEmployees] = useState<EmployeeRecord[]>([])
 const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
 const [isLoading, setIsLoading] = useState(true)
 const [isPending, startTransition] = useTransition()

  // Modals state
 const [selectedProfileEmployee, setSelectedProfileEmployee] = useState<EmployeeRecord | null>(null)
 const [profileOpen, setProfileOpen] = useState(false)
 const [wizardOpen, setWizardOpen] = useState(false)
 const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)

 const loadData = useCallback(async () => {
 setIsLoading(true)
 try {
 const [empRes, branchRes] = await Promise.all([
 getEmployeesAction(),
 listBranchesAction().catch(() => ({ success: true, data: [] })),
      ])

 if (empRes.success && empRes.data) {
 setEmployees(empRes.data)
      }
 if (branchRes && (branchRes as any).success && Array.isArray((branchRes as any).data)) {
 setBranches((branchRes as any).data)
      }
    } finally {
 setIsLoading(false)
    }
  }, [])

 useEffect(() => {
 loadData()
  }, [loadData])

  // Open wizard if ?action=new is in URL
 useEffect(() => {
 if (searchParams?.get('action') === 'new') {
 setEditingEmployee(null)
 setWizardOpen(true)
    }
  }, [searchParams])

 const handleAddEmployee = () => {
 setEditingEmployee(null)
 setWizardOpen(true)
  }

 const handleEditEmployee = (emp: EmployeeRecord) => {
 setEditingEmployee(emp)
 setWizardOpen(true)
  }

 const handleViewEmployee = (emp: EmployeeRecord) => {
 setSelectedProfileEmployee(emp)
 setProfileOpen(true)
  }

 const handleSaveEmployee = async (formData: Partial<EmployeeRecord>) => {
 if (editingEmployee) {
 const res = await updateEmployeeAction(editingEmployee.id, formData)
 if (res.success && res.data) {
 setEmployees((prev) => prev.map((e) => (e.id === editingEmployee.id ? res.data! : e)))
 setWizardOpen(false)
 return true
      }
 throw new Error(res.error || 'Failed to update employee')
    } else {
 const res = await createEmployeeAction(formData as any)
 if (res.success && res.data) {
 setEmployees((prev) => [res.data!, ...prev])
 setWizardOpen(false)
 return true
      }
 throw new Error(res.error || 'Failed to create employee')
    }
  }

 const handleToggleStatus = async (emp: EmployeeRecord) => {
 const nextStatus = emp.status === 'active' ? 'terminated' : 'active'
 startTransition(async () => {
 const res = await updateEmployeeAction(emp.id, { status: nextStatus })
 if (res.success && res.data) {
 setEmployees((prev) => prev.map((e) => (e.id === emp.id ? res.data! : e)))
      }
    })
  }

 const handleSendInvitation = async (employeeId: string) => {
 await sendEmployeeInvitationAction(employeeId)
  }

 return (
    <PanelAccessGuard module="hr"action="view"panelTitle="Employees"panelTitleBn="কর্মী তালিকা">
      <div className="min-h-screen bg-muted pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {tBilingual('Employees', 'কর্মী তালিকা')}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {tBilingual(
                  'Directory of shop-floor, design, sales & management staff',
                  'কারখানা, ডিজাইন, বিক্রয় ও ব্যবস্থাপনা কর্মীদের তালিকা'
                )}
              </p>
            </div>
          </div>

          {/* Main Table */}
          <EmployeeTable
 employees={employees}
 isLoading={isLoading}
 tenantSlug={slug}
 branches={branches}
 onAddEmployee={handleAddEmployee}
 onViewEmployee={handleViewEmployee}
 onEditEmployee={handleEditEmployee}
 onToggleStatus={handleToggleStatus}
          />

          {/* 360 Profile Dialog */}
          <EmployeeProfileDialog
 employee={selectedProfileEmployee}
 open={profileOpen}
 onOpenChange={setProfileOpen}
 tenantSlug={slug}
 onEdit={handleEditEmployee}
 onSendInvitation={handleSendInvitation}
          />

          {/* Progressive 7-Step Creation Wizard */}
          {wizardOpen && (
            <EmployeeFormWizard
 open={wizardOpen}
 onOpenChange={setWizardOpen}
 initialData={editingEmployee}
 branches={branches}
 onSave={handleSaveEmployee}
            />
          )}
        </div>
      </div>
    </PanelAccessGuard>
  )
}
