'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ShoppingBag,
  Plus,
  Trash2,
  Calendar,
  Building,
  DollarSign,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { createPurchaseOrderAction } from '@/actions/purchase.actions'
import { SupplierRecord } from '@/types/crm.types'
import { MaterialRecord } from '@/types/inventory.types'
import { PurchaseOrderRecord, PurchaseOrderItemRecord } from '@/types/purchase.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'

export interface NewPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPurchaseCreated?: (po: PurchaseOrderRecord) => void
}

interface PurchaseItemFormState {
  id: string
  material_id: string
  material_name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
}

export function NewPurchaseModal({
  open,
  onOpenChange,
  onPurchaseCreated,
}: NewPurchaseModalProps) {
  const { company, currentUser, currentBranch } = useTenant()
  const { locale, tBilingual } = useI18n()
  const { can } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()

  // Data sources
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('')
  const [customSupplierName, setCustomSupplierName] = useState<string>('')
  const [supplierPhone, setSupplierPhone] = useState<string>('')

  const [items, setItems] = useState<PurchaseItemFormState[]>([
    {
      id: `poi-${Date.now()}-1`,
      material_id: '',
      material_name: '',
      quantity: 10,
      unit: 'pcs',
      unit_cost: 0,
      total_cost: 0,
    },
  ])

  const [expectedDate, setExpectedDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d.toISOString().split('T')[0]
  })
  const [notes, setNotes] = useState<string>('')

  // Submission & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load suppliers and materials
  useEffect(() => {
    if (open) {
      const supList = PrintERPDataStore.getAll<SupplierRecord>(STORAGE_KEYS.SUPPLIERS) || []
      const matList = PrintERPDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS) || []
      setSuppliers(supList)
      setMaterials(matList)
      setErrorMessage(null)
      setSuccessMessage(null)
      setIsSubmitting(false)

      if (supList.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(supList[0].id)
        setSupplierPhone(supList[0].mobile || '')
      }
    }
  }, [open, selectedSupplierId])

  // Sync supplier details when dropdown changes
  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId)
    const sup = suppliers.find((s) => s.id === supId)
    if (sup) {
      setSupplierPhone(sup.mobile || '')
    }
  }

  // Handle Material Select on item row
  const handleMaterialSelect = (index: number, matId: string) => {
    const mat = materials.find((m) => m.id === matId)
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      if (mat) {
        const cost = Number(mat.last_purchase_price) || Number(mat.average_cost) || 0
        const qty = Number(current.quantity) || 1
        next[index] = {
          ...current,
          material_id: mat.id,
          material_name: mat.name,
          unit: mat.unit || 'pcs',
          unit_cost: cost,
          total_cost: Math.round(qty * cost),
        }
      } else {
        next[index] = {
          ...current,
          material_id: '',
          material_name: '',
        }
      }
      return next
    })
  }

  // Handle Item row updates
  const handleItemChange = (index: number, field: keyof PurchaseItemFormState, value: any) => {
    setItems((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }
      const qty = Number(field === 'quantity' ? value : current.quantity) || 0
      const cost = Number(field === 'unit_cost' ? value : current.unit_cost) || 0
      current.total_cost = Math.round(qty * cost)
      next[index] = current
      return next
    })
  }

  // Add Item Row
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `poi-${Date.now()}-${prev.length + 1}`,
        material_id: '',
        material_name: '',
        quantity: 1,
        unit: 'pcs',
        unit_cost: 0,
        total_cost: 0,
      },
    ])
  }

  // Remove Item Row
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Grand Total Calculation
  const grandTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.total_cost) || 0), 0)
  }, [items])

  const resetForm = () => {
    setErrorMessage(null)
    setSuccessMessage(null)
    setIsSubmitting(false)
    setNotes('')
    setItems([
      {
        id: `poi-${Date.now()}-1`,
        material_id: '',
        material_name: '',
        quantity: 10,
        unit: 'pcs',
        unit_cost: 0,
        total_cost: 0,
      },
    ])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    // Permission check
    const canCreate = can('create', 'purchases') || can('create', 'inventory') || can('manage', 'inventory')
    if (!canCreate) {
      setErrorMessage('You do not have permission to create purchase orders.')
      return
    }

    const quota = checkCanCreate('monthly_orders')
    if (!quota.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }

    const supplier = suppliers.find((s) => s.id === selectedSupplierId)
    const supName = supplier?.supplier_name || customSupplierName.trim()
    if (!supName) {
      setErrorMessage('Please select or specify a valid supplier.')
      return
    }

    if (items.length === 0) {
      setErrorMessage('Please add at least one material item.')
      return
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (!it.material_name.trim()) {
        setErrorMessage(`Item #${i + 1} material name is required.`)
        return
      }
      if (it.quantity <= 0) {
        setErrorMessage(`Item #${i + 1} quantity must be greater than 0.`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      const poNum = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
      const poItems: PurchaseOrderItemRecord[] = items.map((it) => ({
        id: it.id,
        purchase_order_id: '',
        material_id: it.material_id || `mat-${Date.now()}`,
        material_name: it.material_name,
        quantity_ordered: it.quantity,
        quantity_received: 0,
        quantity_remaining: it.quantity,
        unit: it.unit,
        unit_cost: it.unit_cost,
        total_cost: it.total_cost,
      }))

      const payload: Partial<PurchaseOrderRecord> & {
        supplier_id: string
        supplier_name: string
        supplier_phone: string
        items: PurchaseOrderItemRecord[]
      } = {
        company_id: company?.id || 'c-01',
        branch_id: currentBranch?.id || null,
        po_number: poNum,
        supplier_id: supplier?.id || `sup-${Date.now()}`,
        supplier_name: supName,
        supplier_phone: supplierPhone || supplier?.mobile || '+8801700000000',
        supplier_email: supplier?.email,
        supplier_address: supplier?.address,
        po_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: expectedDate,
        status: 'issued',
        subtotal: grandTotal,
        vat_amount: 0,
        discount_amount: 0,
        grand_total: grandTotal,
        paid_amount: 0,
        due_amount: grandTotal,
        notes: notes || 'Standard material replenishment PO issued via Quick Actions',
        created_by_name: currentUser?.profile?.full_name || 'Procurement Officer',
        items: poItems,
      }

      // 1. Try server action
      const res = await createPurchaseOrderAction(payload, company?.id)

      let savedPO: PurchaseOrderRecord
      if (res.success && res.data) {
        savedPO = res.data
      } else {
        // Fallback to client data store for offline / dev demo
        savedPO = {
          id: `po-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
        } as PurchaseOrderRecord

        PrintERPDataStore.addItem<PurchaseOrderRecord>(STORAGE_KEYS.PURCHASE_ORDERS, savedPO)
      }

      setSuccessMessage(`Purchase Order ${savedPO.po_number} issued successfully!`)
      refreshUsage()
      onPurchaseCreated?.(savedPO)

      setTimeout(() => {
        onOpenChange(false)
        resetForm()
      }, 1000)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to issue purchase order.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
      size="3xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-amber-600/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {tBilingual('Issue New Purchase Order (PO)', 'নতুন ক্রয় আদেশ (PO) জারি করুন')}
              </h2>
              <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                Procurement
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {tBilingual('Supplier purchase commitment with agreed rates and warehouse delivery schedule', 'মহাজনের রেট ও ডেলিভারি তারিখে কাঁচামাল ক্রয় আদেশ')}
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 pb-2">
        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 rounded-xl border border-emerald-300 dark:border-emerald-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 rounded-xl border border-rose-300 dark:border-rose-800 text-xs flex items-center gap-2 animate-in fade-in-0">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SECTION 1: SUPPLIER SELECTION */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {tBilingual('Supplier Details', 'সাপ্লায়ার ও সরবরাহকারী')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Select Supplier', 'সাপ্লায়ার নির্বাচন')} <span className="text-rose-500">*</span>
              </Label>
              <select
                value={selectedSupplierId}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                required
              >
                <option value="">-- Choose Material Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.supplier_name} {s.category ? `(${s.category.replace('_', ' ')})` : ''} - {s.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Expected Delivery Date', 'প্রত্যাশিত ডেলিভারি')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: PURCHASE ITEMS BUILDER */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Materials & Commitments', 'কাঁচামাল ও পরিমাণ')}
              </h3>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddItem}
              className="h-7 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 dark:text-amber-300 dark:border-amber-700"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              {tBilingual('Add Item', 'আইটেম যোগ করুন')}
            </Button>
          </div>

          <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                    Item #{idx + 1}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  {/* Material Catalog Selector */}
                  <div className="sm:col-span-5">
                    <Label className="text-[11px] text-slate-500 mb-0.5 block">
                      Inventory Material <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={item.material_id}
                      onChange={(e) => handleMaterialSelect(idx, e.target.value)}
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs font-medium"
                      required
                    >
                      <option value="">Select Material...</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.sku}) - {m.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-slate-500 mb-0.5 block">
                      Qty <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                      className="h-8 text-xs font-bold"
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div className="sm:col-span-2">
                    <Label className="text-[11px] text-slate-500 mb-0.5 block">Unit</Label>
                    <Input
                      type="text"
                      value={item.unit}
                      onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                      className="h-8 text-xs font-medium"
                      placeholder="pcs/sft"
                    />
                  </div>

                  {/* Unit Cost */}
                  <div className="sm:col-span-3">
                    <Label className="text-[11px] text-slate-500 mb-0.5 block">
                      Rate (৳) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={item.unit_cost}
                      onChange={(e) => handleItemChange(idx, 'unit_cost', Number(e.target.value))}
                      className="h-8 text-xs font-mono font-semibold"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 text-[11px] text-slate-500">
                  <span>
                    Calculation: {item.quantity} {item.unit} × ৳{formatBDT(item.unit_cost)}
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                    ৳ {formatBDT(item.total_cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total Summary Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Total Material Lines:</span>
              <div className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                {items.length} item(s) configured
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Purchase Commitment</span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
                ৳ {formatBDT(grandTotal)}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: TERMS & INSTRUCTIONS */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-2 shadow-xs">
          <Label className="text-xs font-semibold block">
            {tBilingual('Terms & Delivery Instructions (Optional)', 'শর্তাবলী ও নির্দেশনা')}
          </Label>
          <textarea
            rows={2}
            placeholder="e.g. Deliver to Warehouse Gate 2; inspect grammage before unloading..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* Action Footer */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto min-h-[40px] text-xs font-semibold cursor-pointer"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[40px] text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                <span>Issuing Purchase Order...</span>
              </>
            ) : (
              <span>{tBilingual('Issue Purchase Order', 'ক্রয় আদেশ জারি করুন')}</span>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
