'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
 Coins,
 RefreshCw,
 Plus,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Button } from '@/components/ui/button'
import { AdvanceTable } from '@/components/workforce/advance-table'
import {
 getEmployeesAction,
 getSalaryAdvancesAction,
 disburseSalaryAdvanceAction,
} from '@/actions/workforce.actions'
import type {
 SalaryAdvanceRecord,
 EmployeeRecord,
 PaymentMethod,
} from '@/types/workforce.types'

export default function AdvancesPage() {
 const params = useParams()
 const { company } = useTenant()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

 const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([])
 const [employees, setEmployees] = useState<EmployeeRecord[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [isPending, startTransition] = useTransition()

 const loadData = useCallback(async () => {
 setIsLoading(true)
 try {
 const [advRes, empRes] = await Promise.all([
 getSalaryAdvancesAction(),
 getEmployeesAction({ status: 'active' }),
      ])

 if (advRes.success && advRes.data) {
 setAdvances(advRes.data)
      }
 if (empRes.success && empRes.data) {
 setEmployees(empRes.data)
      }
    } finally {
 setIsLoading(false)
    }
  }, [])

 useEffect(() => {
 loadData()
  }, [loadData])

 const handleCreateAdvance = async (params: {
 employeeId: string
 amount: number
 paymentMethod: PaymentMethod
 reason?: string
  }) => {
 const res = await disburseSalaryAdvanceAction(params)
 if (res.success && res.data) {
 setAdvances((prev) => [res.data!, ...prev])
 loadData()
    } else {
 throw new Error(res.error || 'Failed to disburse salary advance.')
    }
  }

 return (
    <PanelAccessGuard module="payroll"action="view"panelTitle="Advances"panelTitleBn="অগ্রিম বেতন">
      <div className="min-h-screen bg-muted pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
 Advances
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-muted-foreground">অগ্রিম বেতন ও ঋণ ব্যবস্থাপনা</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
 Track salary advances, disbursements and automated payroll recoveries
                </span>
              </div>
            </div>

            <Button
 variant="outline"size="sm"onClick={loadData}
 disabled={isLoading || isPending}
 className="h-9 px-3 text-xs font-medium text-foreground bg-card border-border hover:bg-muted self-start sm:self-auto min-h-[36px]">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Advance Table */}
          <AdvanceTable
 advances={advances}
 employees={employees}
 isLoading={isLoading}
 tenantSlug={slug}
 onCreateAdvance={handleCreateAdvance}
          />
        </div>
      </div>
    </PanelAccessGuard>
  )
}
