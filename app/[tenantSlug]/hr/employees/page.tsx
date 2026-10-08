'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { EmployeeTable } from '@/components/workforce/employee-table'
import { EmployeeProfileDialog } from '@/components/workforce/employee-profile-dialog'
import { EmployeeFormWizard } from '@/components/workforce/employee-form-wizard'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { useToast } from '@/components/shared/toast-feedback'
import {
  getEmployeesAction,
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  sendEmployeeInvitationAction,
} from '@/actions/workforce.actions'
import { listBranchesAction } from '@/actions/branch.actions'
import type { EmployeeRecord } from '@/types/workforce.types'

export default function EmployeesPage() {
  const { tBilingual } = useI18n()
  const { showToast } = useToast()
  const params = useParams()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [, startTransition] = useTransition()

  // Modals state
  const [selectedProfileEmployee, setSelectedProfileEmployee] = useState<EmployeeRecord | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    type: 'toggle_status' | 'delete'
    employee: EmployeeRecord | null
    isLoading: boolean
  }>({
    open: false,
    type: 'toggle_status',
    employee: null,
    isLoading: false,
  })

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
        const updated = res.data
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === editingEmployee.id ||
            e.id === updated.id ||
            (e.employee_id_number && e.employee_id_number === editingEmployee.employee_id_number)
              ? updated
              : e
          )
        )
        if (
          selectedProfileEmployee?.id === editingEmployee.id ||
          selectedProfileEmployee?.id === updated.id ||
          (selectedProfileEmployee?.employee_id_number &&
            selectedProfileEmployee.employee_id_number === editingEmployee.employee_id_number)
        ) {
          setSelectedProfileEmployee(updated)
        }
        setWizardOpen(false)
        showToast({
          type: 'success',
          title: 'Employee Updated',
          titleBn: 'কর্মী তথ্য হালনাগাদ হয়েছে',
          message: `${updated.name}'s profile was successfully updated.`,
        })
        return true
      }
      throw new Error(res.error || 'Failed to update employee')
    } else {
      const res = await createEmployeeAction(formData as any)
      if (res.success && res.data) {
        setEmployees((prev) => [res.data!, ...prev])
        setWizardOpen(false)
        showToast({
          type: 'success',
          title: 'Employee Created',
          titleBn: 'নতুন কর্মী তৈরি হয়েছে',
          message: `${res.data.name} was successfully created.`,
        })
        return true
      }
      throw new Error(res.error || 'Failed to create employee')
    }
  }

  const handleToggleStatusClick = (emp: EmployeeRecord) => {
    setConfirmDialog({
      open: true,
      type: 'toggle_status',
      employee: emp,
      isLoading: false,
    })
  }

  const handleDeleteEmployeeClick = (emp: EmployeeRecord) => {
    setConfirmDialog({
      open: true,
      type: 'delete',
      employee: emp,
      isLoading: false,
    })
  }

  const handleConfirmAction = async () => {
    const emp = confirmDialog.employee
    if (!emp) return

    setConfirmDialog((prev) => ({ ...prev, isLoading: true }))
    try {
      if (confirmDialog.type === 'toggle_status') {
        const nextStatus = emp.status === 'active' ? 'terminated' : 'active'
        const res = await updateEmployeeAction(emp.id, { status: nextStatus })
        if (res.success && res.data) {
          const updated = res.data
          setEmployees((prev) => prev.map((e) => (e.id === emp.id || e.id === updated.id ? updated : e)))
          if (selectedProfileEmployee?.id === emp.id) {
            setSelectedProfileEmployee(updated)
          }
          showToast({
            type: 'success',
            title: nextStatus === 'terminated' ? 'Employee Deactivated' : 'Employee Activated',
            titleBn: nextStatus === 'terminated' ? 'কর্মী নিষ্ক্রিয় করা হয়েছে' : 'কর্মী সক্রিয় করা হয়েছে',
            message: `${emp.name} is now ${nextStatus === 'terminated' ? 'deactivated' : 'active'}.`,
            messageBn: `${emp.name}-এর স্থিতি এখন ${nextStatus === 'terminated' ? 'নিষ্ক্রিয়' : 'সক্রিয়'}।`,
          })
          setConfirmDialog({ open: false, type: 'toggle_status', employee: null, isLoading: false })
        } else {
          showToast({
            type: 'error',
            title: 'Action Failed',
            titleBn: 'ব্যর্থ হয়েছে',
            message: res.error || 'Failed to update employee status',
          })
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }))
        }
      } else if (confirmDialog.type === 'delete') {
        const res = await deleteEmployeeAction(emp.id)
        if (res.success) {
          setEmployees((prev) =>
            prev.filter((e) => e.id !== emp.id && e.employee_id_number !== emp.employee_id_number)
          )
          if (selectedProfileEmployee?.id === emp.id) {
            setSelectedProfileEmployee(null)
            setProfileOpen(false)
          }
          showToast({
            type: 'success',
            title: 'Employee Deleted',
            titleBn: 'কর্মী মুছে ফেলা হয়েছে',
            message: `${emp.name} has been permanently deleted.`,
            messageBn: `${emp.name}-কে স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
          })
          setConfirmDialog({ open: false, type: 'delete', employee: null, isLoading: false })
        } else {
          showToast({
            type: 'error',
            title: 'Delete Failed',
            titleBn: 'মুছে ফেলতে ব্যর্থ',
            message: res.error || 'Failed to delete employee',
          })
          setConfirmDialog((prev) => ({ ...prev, isLoading: false }))
        }
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        titleBn: 'ত্রুটি',
        message: err.message || 'An unexpected error occurred.',
      })
      setConfirmDialog((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleSendInvitation = async (employeeId: string) => {
    await sendEmployeeInvitationAction(employeeId)
  }

  return (
    <PanelAccessGuard module="hr" action="view" panelTitle="Employees" panelTitleBn="কর্মী তালিকা">
      <div className="min-h-screen bg-muted pb-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
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
            onToggleStatus={handleToggleStatusClick}
            onDeleteEmployee={handleDeleteEmployeeClick}
          />

          {/* 360 Profile Dialog */}
          <EmployeeProfileDialog
            employee={selectedProfileEmployee}
            open={profileOpen}
            onOpenChange={setProfileOpen}
            tenantSlug={slug}
            onEdit={handleEditEmployee}
            onSendInvitation={handleSendInvitation}
            onPhotoUpdated={(updated) => {
              setSelectedProfileEmployee(updated)
              setEmployees((prev) =>
                prev.map((e) =>
                  e.id === updated.id ||
                  (e.employee_id_number && e.employee_id_number === updated.employee_id_number)
                    ? updated
                    : e
                )
              )
            }}
          />

          {/* Progressive Creation Wizard */}
          {wizardOpen && (
            <EmployeeFormWizard
              open={wizardOpen}
              onOpenChange={setWizardOpen}
              initialData={editingEmployee}
              branches={branches}
              onSave={handleSaveEmployee}
            />
          )}

          {/* Confirmation Dialog for Deactivate / Delete */}
          <ConfirmDialog
            open={confirmDialog.open}
            onOpenChange={(open) => !confirmDialog.isLoading && setConfirmDialog((prev) => ({ ...prev, open }))}
            isLoading={confirmDialog.isLoading}
            isDestructive={confirmDialog.type === 'delete' || confirmDialog.employee?.status === 'active'}
            title={
              confirmDialog.type === 'delete'
                ? 'Permanently Delete Employee'
                : confirmDialog.employee?.status === 'active'
                ? 'Deactivate Employee'
                : 'Activate Employee'
            }
            titleBn={
              confirmDialog.type === 'delete'
                ? 'কর্মী স্থায়ীভাবে মুছে ফেলুন'
                : confirmDialog.employee?.status === 'active'
                ? 'কর্মী নিষ্ক্রিয় করুন'
                : 'কর্মী সক্রিয় করুন'
            }
            message={
              confirmDialog.type === 'delete'
                ? `Are you sure you want to permanently delete ${confirmDialog.employee?.name || 'this employee'} (${confirmDialog.employee?.employee_id_number || ''})? This will revoke login access and remove employee records.`
                : confirmDialog.employee?.status === 'active'
                ? `Are you sure you want to deactivate ${confirmDialog.employee?.name || 'this employee'}? Their portal login and shift punches will be suspended.`
                : `Are you sure you want to activate ${confirmDialog.employee?.name || 'this employee'}? Their portal access will be restored.`
            }
            messageBn={
              confirmDialog.type === 'delete'
                ? `আপনি কি নিশ্চিতভাবে ${confirmDialog.employee?.name || 'এই কর্মী'}-কে স্থায়ীভাবে মুছে ফেলতে চান? এটি তাদের লগইন অ্যাক্সেস এবং কর্মীর তথ্য মুছে ফেলবে।`
                : confirmDialog.employee?.status === 'active'
                ? `আপনি কি নিশ্চিতভাবে ${confirmDialog.employee?.name || 'এই কর্মী'}-কে নিষ্ক্রিয় করতে চান? তাদের পোর্টাল লগইন ও হাজিরা স্থগিত করা হবে।`
                : `আপনি কি নিশ্চিতভাবে ${confirmDialog.employee?.name || 'এই কর্মী'}-কে সক্রিয় করতে চান? তাদের পোর্টাল অ্যাক্সেস পুনরুদ্ধার হবে।`
            }
            confirmText={
              confirmDialog.type === 'delete'
                ? 'Delete Employee'
                : confirmDialog.employee?.status === 'active'
                ? 'Deactivate'
                : 'Activate'
            }
            confirmTextBn={
              confirmDialog.type === 'delete'
                ? 'মুছে ফেলুন'
                : confirmDialog.employee?.status === 'active'
                ? 'নিষ্ক্রিয় করুন'
                : 'সক্রিয় করুন'
            }
            onConfirm={handleConfirmAction}
          />
        </div>
      </div>
    </PanelAccessGuard>
  )
}
