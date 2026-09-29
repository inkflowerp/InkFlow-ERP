'use client'

import React, { useState } from 'react'
import { Plus, ChevronRight } from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { ICON_MAP } from './dashboard-quick-actions'
import type { QuickActionItem, MyWorkItem } from '@/lib/dashboard/dashboard-engine'
import type { CustomerRecord } from '@/types/crm.types'
import type { ExpenseRecord } from '@/types/accounting.types'
import type { MaterialRecord } from '@/types/inventory.types'
import type { ProductionJobRecord } from '@/types/production.types'

interface DashboardModalsProps {
  activeModal: string | null
  onCloseModal: () => void
  isMoreActionsOpen: boolean
  onCloseMoreActions: () => void
  onExecuteQuickAction: (qa: QuickActionItem) => void
  allAllowedActions: QuickActionItem[]
  companyId?: string
  currentBranchName?: string
  currentUserName?: string
  activeWorkItem: MyWorkItem | null
  onWorkOrderSuccess: (savedOrder: any, sentToManager: boolean) => void
  onCustomerAdded: (customerName: string) => void
  onExpenseAdded: (expenseTitle: string, amount: number) => void
  onMaterialAdded: (materialName: string) => void
  onProblemReported: (workItemCode: string) => void
}

export function DashboardModals({
  activeModal,
  onCloseModal,
  isMoreActionsOpen,
  onCloseMoreActions,
  onExecuteQuickAction,
  allAllowedActions,
  companyId,
  currentBranchName,
  currentUserName,
  activeWorkItem,
  onWorkOrderSuccess,
  onCustomerAdded,
  onExpenseAdded,
  onMaterialAdded,
  onProblemReported,
}: DashboardModalsProps) {
  const { tBilingual } = useI18n()

  // Form states
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerLimit, setCustomerLimit] = useState('50000')

  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('maintenance')

  const [materialName, setMaterialName] = useState('')
  const [materialQty, setMaterialQty] = useState('')

  const [problemDescription, setProblemDescription] = useState('')
  const [problemSeverity, setProblemSeverity] = useState('rework')

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) return
    const newCust: CustomerRecord = {
      id: `cust-${Date.now()}`,
      company_id: companyId || '',
      name: customerName.trim(),
      name_bn: customerName.trim(),
      mobile: customerPhone.trim(),
      email: null,
      customer_type: 'corporate',
      credit_limit: parseFloat(customerLimit) || 0,
      payment_terms: 'net_30',
      tags: ['New Client'],
      is_active: true,
      total_orders_count: 0,
      total_orders_amount: 0,
      total_due_balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, newCust)
    onCloseModal()
    const name = customerName
    setCustomerName('')
    setCustomerPhone('')
    onCustomerAdded(name)
  }

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(expenseAmount) || 0
    if (amt <= 0 || !expenseTitle.trim()) return
    const expNum = `EXP-${Date.now().toString().slice(-4)}`
    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      company_id: companyId || '',
      expense_number: expNum,
      expense_date: new Date().toISOString().split('T')[0],
      category: (expenseCategory as any) || 'maintenance',
      amount: amt,
      payment_method: 'cash',
      vendor_name: null,
      description: expenseTitle.trim(),
      branch_name: currentBranchName || 'Main Branch',
      recorded_by_name: currentUserName || 'Staff',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<ExpenseRecord>(STORAGE_KEYS.EXPENSES, newExp)
    onCloseModal()
    const title = expenseTitle
    setExpenseTitle('')
    setExpenseAmount('')
    onExpenseAdded(title, amt)
  }

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialName.trim()) return
    const newMat: MaterialRecord = {
      id: `mat-${Date.now()}`,
      company_id: companyId || '',
      sku: `MAT-${Date.now().toString().slice(-4)}`,
      name: materialName.trim(),
      name_bn: materialName.trim(),
      category: 'rigid_sheet',
      unit: 'sft',
      is_roll: false,
      current_stock: parseFloat(materialQty) || 0,
      min_stock_level: 50,
      last_purchase_price: 0,
      average_cost: 0,
      manual_cost: 0,
      valuation_method: 'average_cost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, newMat)
    onCloseModal()
    const name = materialName
    setMaterialName('')
    setMaterialQty('')
    onMaterialAdded(name)
  }

  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!problemDescription.trim()) return
    if (activeWorkItem) {
      PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, activeWorkItem.id, {
        has_rework: true,
        priority: 'very_urgent',
      })
      onProblemReported(activeWorkItem.code)
    }
    onCloseModal()
    setProblemDescription('')
  }

  return (
    <>
      {/* 1. Modal: Work Order */}
      <WorkOrderModal
        isOpen={activeModal === 'work_order'}
        onClose={onCloseModal}
        onSuccess={(savedOrder, sentToManager) => {
          onCloseModal()
          onWorkOrderSuccess(savedOrder, sentToManager)
        }}
        companyId={companyId}
      />

      {/* 2. Modal: New Customer */}
      <ModalDialog
        open={activeModal === 'customer'}
        onOpenChange={(open) => !open && onCloseModal()}
        title="Add New Customer Profile"
        description="Register a corporate client, advertising agency, or retail walk-in buyer."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="custName" required>Customer / Company Name</Label>
            <Input
              id="custName"
              placeholder="e.g. Acme Advertising Ltd."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="custPhone" required>Phone / Mobile</Label>
              <Input
                id="custPhone"
                placeholder="01711-XXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="h-10 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custLimit">Credit Limit (৳ BDT)</Label>
              <Input
                id="custLimit"
                type="number"
                value={customerLimit}
                onChange={(e) => setCustomerLimit(e.target.value)}
                className="h-10 text-xs"
              />
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseModal}
              className="w-full sm:w-auto h-11 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-9 bg-blue-600 hover:bg-blue-700 font-bold"
            >
              Save Customer
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 3. Modal: Record Payment / Money Receipt */}
      <RecordPaymentModal
        open={activeModal === 'payment'}
        onOpenChange={(open) => !open && onCloseModal()}
      />

      {/* 4. Modal: Add Expense */}
      <ModalDialog
        open={activeModal === 'expense'}
        onOpenChange={(open) => !open && onCloseModal()}
        title="Add Shop Floor Expense"
        description="Record press electricity, ink purchase, machine maintenance, or refreshments."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="expTitle" required>Expense Description</Label>
            <Input
              id="expTitle"
              placeholder="e.g. Machine Solvent Cleaner & Wipes"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expAmount" required>Amount (৳ BDT)</Label>
              <Input
                id="expAmount"
                type="number"
                placeholder="3500"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                className="h-10 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expCategory">Category</Label>
              <select
                id="expCategory"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="maintenance">Machine Maintenance</option>
                <option value="electricity">Factory Utilities / Electricity</option>
                <option value="transport">Transport / Van Fare</option>
                <option value="tea_snacks">Staff Overtime / Refreshment</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseModal}
              className="w-full sm:w-auto h-11 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Record Expense
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 5. Modal: Add Material / Media Stock */}
      <ModalDialog
        open={activeModal === 'material'}
        onOpenChange={(open) => !open && onCloseModal()}
        title="Add Material to Inventory"
        description="Log new flex rolls or media sheets received from vendor."
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="matName" required>Material Name & Spec</Label>
            <Input
              id="matName"
              placeholder="e.g. Star Flex 320gsm (10ft roll)"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="matQty" required>Quantity (Rolls / Sheets / Sft)</Label>
              <Input
                id="matQty"
                placeholder="500"
                value={materialQty}
                onChange={(e) => setMaterialQty(e.target.value)}
                className="h-10 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matSupplier">Vendor</Label>
              <select
                id="matSupplier"
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option>Bangla Plastic & Media Ltd.</option>
                <option>Dhaka Acrylic Center</option>
                <option>Karnafuli Paper Mills</option>
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseModal}
              className="w-full sm:w-auto h-11 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-9 bg-teal-600 hover:bg-teal-700 text-white font-bold"
            >
              Save Inventory
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 6. Modal: Report Problem / Scrap */}
      <ModalDialog
        open={activeModal === 'report_problem'}
        onOpenChange={(open) => !open && onCloseModal()}
        title="Report Machine Floor Problem / Rework"
        description={`Log media head strike, ink shortage, or scrap for ${activeWorkItem?.code || 'print run'}.`}
      >
        <form onSubmit={handleReportProblem} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="probType" required>Issue Type</Label>
            <select
              id="probType"
              value={problemSeverity}
              onChange={(e) => setProblemSeverity(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="rework">Media Head Strike / Reprint Needed</option>
              <option value="color_mismatch">Color Calibration / ICC Profile Mismatch</option>
              <option value="ink_out">Ink Cartridge Empty</option>
              <option value="machine_jam">Roll Feed Jam / Mechanical Fault</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="probDesc" required>Problem Description & Action Needed</Label>
            <Input
              id="probDesc"
              placeholder="e.g. Banding on Cyan head after 8ft run"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onCloseModal}
              className="w-full sm:w-auto h-11 sm:h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto h-11 sm:h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Dispatch Alert
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 7. Modal: More Quick Actions Dialog */}
      <ModalDialog
        open={isMoreActionsOpen}
        onOpenChange={(open) => !open && onCloseMoreActions()}
        title="All Authorized Quick Actions"
        description="Select any operational shortcut available for your role."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          {allAllowedActions.map((qa) => {
            const Icon = ICON_MAP[qa.icon] || Plus
            return (
              <Button
                key={qa.id}
                type="button"
                variant="outline"
                onClick={() => onExecuteQuickAction(qa)}
                className="h-12 px-3 flex items-center justify-between text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate bangla-text">{tBilingual(qa.labelEn, qa.labelBn)}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </Button>
            )
          })}
        </div>
      </ModalDialog>
    </>
  )
}
