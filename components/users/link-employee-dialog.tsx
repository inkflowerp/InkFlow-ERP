'use client'

import React, { useState, useMemo } from 'react'
import { Search, UserCheck, AlertCircle, Check, Loader2 } from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CompanyUserWithProfile } from '@/types/tenant.types'
import { linkEmployeeToUserAction } from '@/actions/company-users.actions'
import { useToast } from '@/components/shared/toast-feedback'

interface LinkEmployeeDialogProps {
 isOpen: boolean
 onClose: () => void
 user: CompanyUserWithProfile | null
 employees: any[]
 companyId: string
 tenantSlug: string
 onSuccess: () => void
}

export function LinkEmployeeDialog({
 isOpen,
 onClose,
 user,
 employees = [],
 companyId,
 tenantSlug,
 onSuccess,
}: LinkEmployeeDialogProps) {
 const { showToast } = useToast()
 const [search, setSearch] = useState('')
 const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter employees: exclude employees already linked to other users unless it is this user
 const filteredEmployees = useMemo(() => {
 return employees.filter((emp) => {
 const q = search.toLowerCase().trim()
 const matchesSearch =
        !q ||
 emp.name?.toLowerCase().includes(q) ||
 emp.name_bn?.toLowerCase().includes(q) ||
 emp.employee_id_number?.toLowerCase().includes(q) ||
 emp.mobile?.includes(q) ||
 emp.department?.toLowerCase().includes(q)

 return matchesSearch
    })
  }, [employees, search])

 const selectedEmployee = useMemo(() => {
 return employees.find((e) => e.id === selectedEmpId) || null
  }, [employees, selectedEmpId])

 const handleLink = async () => {
 if (!user || !selectedEmpId) return
 setIsSubmitting(true)
 try {
 const res = await linkEmployeeToUserAction({
 companyUserId: user.id,
 employeeId: selectedEmpId,
 companyId,
 tenantSlug,
      })

 if (res.success) {
 showToast({
 type: 'success',
 title: 'Employee Linked',
 titleBn: 'কর্মী সংযুক্ত করা হয়েছে',
 message: res.message || 'Employee linked successfully',
        })
 onSuccess()
 onClose()
      } else {
 showToast({
 type: 'error',
 title: 'Failed to Link',
 titleBn: 'সংযুক্ত করা যায়নি',
 message: res.error || 'Unable to link employee',
        })
      }
    } catch (err: any) {
 showToast({
 type: 'error',
 title: 'Error',
 titleBn: 'ত্রুটি',
 message: err.message || 'An unexpected error occurred',
      })
    } finally {
 setIsSubmitting(false)
    }
  }

 const userName = user?.profile?.full_name || user?.invited_email || 'Team User'

 return (
    <ModalDialog
 open={isOpen}
 onOpenChange={(open) => !open && onClose()}
 title="Link Employee Profile"description={`Associate an active workforce record with ${userName}.`}
 hideFooter={true}
 size="lg">
      <div className="space-y-4 pt-1">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
          <Input
 placeholder="Search by name, employee ID, mobile..."value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 text-sm"/>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-lg">
          {filteredEmployees.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
 No matching employees found in workforce directory.
            </div>
          ) : (
 filteredEmployees.map((emp) => {
 const isSelected = selectedEmpId === emp.id
 const isAlreadyLinkedOther = emp.alreadyHasLogin && emp.user_id !== user?.user_id

 return (
                <button
 key={emp.id}
 type="button"disabled={isAlreadyLinkedOther}
 onClick={() => setSelectedEmpId(emp.id)}
 className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 text-sm ${
 isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/30'
                      : isAlreadyLinkedOther
                      ? 'opacity-50 cursor-not-allowed bg-muted/50 '
                      : 'hover:bg-muted dark:hover:bg-muted/50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground flex items-center gap-2">
                      <span className="truncate">{emp.name}</span>
                      <Badge variant="outline"className="text-xs font-mono font-normal">
                        {emp.employee_id_number || 'EMP'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span>{emp.department || 'General'}</span>
                      {emp.role && <span>• {emp.role}</span>}
                      {emp.mobile && <span>• {emp.mobile}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isAlreadyLinkedOther ? (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
 Has login
                      </span>
                    ) : isSelected ? (
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="h-3.5 w-3.5"/>
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-full border border-input"/>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {selectedEmployee && (
          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs text-blue-900 dark:text-blue-300 flex items-start gap-2">
            <UserCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5"/>
            <div>
              <span>Confirm linking </span>
              <strong>{selectedEmployee.name}</strong> ({selectedEmployee.employee_id_number || 'EMP'}) to this login account.
 The employee will be able to punch attendance and view personal tasks.
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline"size="sm"onClick={onClose} disabled={isSubmitting}>
 Cancel
          </Button>
          <Button
 size="sm"onClick={handleLink}
 disabled={!selectedEmpId || isSubmitting}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5">
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin"/>}
 Confirm Link
          </Button>
        </div>
      </div>
    </ModalDialog>
  )
}
