'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { FileSpreadsheet, RefreshCw } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Button } from '@/components/ui/button'
import { WorkforceReport } from '@/components/workforce/workforce-report'
import {
 getEmployeesAction,
 getPayrollPeriodsAction,
 getSalaryAdvancesAction,
 getOvertimeRecordsAction,
} from '@/actions/workforce.actions'
import type {
 EmployeeRecord,
 PayrollPeriodRecord,
 SalaryAdvanceRecord,
 OvertimeRecord,
} from '@/types/workforce.types'

export default function ReportsPage() {
 const params = useParams()
 const { company } = useTenant()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

 const [employees, setEmployees] = useState<EmployeeRecord[]>([])
 const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRecord[]>([])
 const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([])
 const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
 const [isLoading, setIsLoading] = useState(true)

 const loadData = useCallback(async () => {
 setIsLoading(true)
 try {
 const [empRes, payRes, advRes, otRes] = await Promise.all([
 getEmployeesAction(),
 getPayrollPeriodsAction(),
 getSalaryAdvancesAction(),
 getOvertimeRecordsAction(),
      ])

 if (empRes.success && empRes.data) setEmployees(empRes.data)
 if (payRes.success && payRes.data) setPayrollPeriods(payRes.data)
 if (advRes.success && advRes.data) setAdvances(advRes.data)
 if (otRes.success && otRes.data) setOvertimeRecords(otRes.data)
    } finally {
 setIsLoading(false)
    }
  }, [])

 useEffect(() => {
 loadData()
  }, [loadData])

 return (
    <PanelAccessGuard module="hr"action="view"panelTitle="Workforce Reports"panelTitleBn="কর্মী ও বেতন রিপোর্ট">
      <div className="min-h-screen bg-muted pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
 Workforce Reports
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-muted-foreground">কর্মী ও বেতন রিপোর্ট</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
 Analytical reporting across attendance, compensation, overtime, advances and total labor cost
                </span>
              </div>
            </div>

            <Button
 variant="outline"size="sm"onClick={loadData}
 disabled={isLoading}
 className="h-9 px-3 text-xs font-medium text-foreground bg-card border-border hover:bg-muted self-start sm:self-auto min-h-[36px]">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Analytical Report Component */}
          <WorkforceReport
 employees={employees}
 payrollPeriods={payrollPeriods}
 advances={advances}
 overtimeRecords={overtimeRecords}
 isLoading={isLoading}
 tenantSlug={slug}
          />
        </div>
      </div>
    </PanelAccessGuard>
  )
}
