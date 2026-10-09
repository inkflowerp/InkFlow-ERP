'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
 Layers,
 User,
 Plus,
 Minus,
 CheckCircle2,
 AlertTriangle,
 Barcode,
 Tag,
 Package,
 ArrowRight,
 Trash2,
 Calendar,
 FileText,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
 MaterialRecord,
 InventoryLocationRecord,
 InventoryRollRecord,
 MaterialRequestRecord,
 IssueMasterRollParams,
 IssueMasterRollResult,
  FloorConsumptionRecord,
} from '@/types/inventory.types'
import { useI18n } from '@/i18n/context'
import { cn } from '@/lib/utils'
import {
 issueMasterRollsBatchAction,
 issueMultipleMaterialsBatchAction,
} from '@/actions/inventory.actions'
import { getMaterialWarehouseStockBreakdown, isUserSku } from '@/lib/units'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export interface IssueMasterRollModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 materials: MaterialRecord[]
 locations?: InventoryLocationRecord[]
 initialMaterialId?: string
 selectedMaterialId?: string
 initialWidthFt?: number
 initialLengthFt?: number
 initialMachineId?: string | null
 initialMachineName?: string | null
 request?: MaterialRequestRecord | null
 requests?: MaterialRequestRecord[]
 rolls?: InventoryRollRecord[]
 onSuccess?: (result?: IssueMasterRollResult | any) => void
 companyId?: string
}

export interface IssueItemRow {
 id: string
 materialId: string
 selectedSizeKey: string
 widthFt?: number
 lengthFt?: number
 quantity: number
 lotNumber?: string
 customRollTag?: string
 notes?: string
 showTagDetails?: boolean
}

export function formatUnitPlural(count: number, unit: string): string {
 if (!unit) return ''
 const lower = unit.trim().toLowerCase()
 if (count <= 1) {
 if (lower === 'rolls') return 'Roll'
 if (lower === 'boxes') return 'Box'
 if (lower === 'sheets') return 'Sheet'
 if (lower === 'packs' || lower === 'packets') return 'Pack'
 if (lower === 'bottles') return 'Bottle'
 if (lower === 'pieces') return 'Pcs'
 return unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()
  }
 if (lower === 'roll') return 'Rolls'
 if (lower === 'box') return 'Boxes'
 if (lower === 'sheet') return 'Sheets'
 if (lower === 'pack' || lower === 'packet') return 'Packs'
 if (lower === 'bottle') return 'Bottles'
 if (lower === 'pcs' || lower === 'piece' || lower === 'pieces') return 'Pcs'
 if (lower === 'sft' || lower === 'sqft') return 'SFT'
 if (lower === 'kg') return 'Kg'
 if (lower === 'ltr' || lower === 'liter') return 'Ltr'
 if (lower === 'ml') return 'ML'
 return `${unit}s`
}

export interface ConfiguredOptionItem {
 key: string
 label: string
 width_ft: number
 length_ft: number
 allowance_ft: number
 purchase_price: number
 gsm: number
 finishing: string
 roll_count: number
 total_sft: number
 unit_cost: number
 stock_display: string
 option_display: string
}

function getMaterialConfiguredOptions(
 material: MaterialRecord | null,
 rolls: InventoryRollRecord[]
): ConfiguredOptionItem[] {
 if (!material) return []
 const bd = getMaterialWarehouseStockBreakdown(material, rolls)
 const list: ConfiguredOptionItem[] = []

 const baseCost = Number(
 material.average_cost ||
 material.last_purchase_price ||
 material.cost_per_unit ||
    0
  )

 if (bd.is_roll) {
 if (bd.roll_items && bd.roll_items.length > 0) {
 for (const item of bd.roll_items) {
 const w = Number(item.width_ft || 0)
 const l = Number(item.length_ft || 0)
 const singleArea = Math.round(w * l * 100) / 100
 const area = Number(item.total_sft || (singleArea * (item.roll_count || 0)))
 const price = Number(item.purchase_price ?? baseCost)
 const stockDisp = `${item.roll_count} ${item.roll_count === 1 ? 'Roll' : 'Rolls'} (${area.toLocaleString()} SFT)`
 const optDisp = `${w}ft × ${l}ft (${singleArea} SFT/Roll) — Available: ${stockDisp}`
 list.push({
 key: item.key || `${w}x${l}|p:${price}|gsm:${item.gsm || 0}|f:${item.finishing || 'none'}`,
 label: `${w}ft × ${l}ft (${singleArea} SFT/Roll)`,
 width_ft: w,
 length_ft: l,
 allowance_ft: Number(item.allowance_ft ?? 0),
 purchase_price: price,
 gsm: Number(item.gsm ?? material.gsm ?? 0),
 finishing: String(item.finishing ?? material.default_finishing ?? 'none'),
 roll_count: Number(item.roll_count || 0),
 total_sft: area,
 unit_cost: price > 150 ? price : Math.round(price * singleArea * 100) / 100,
 stock_display: stockDisp,
 option_display: optDisp,
        })
      }
    } else {
 const defW = Number(material.roll_width_ft || material.width || 4)
 const defL = Number(material.standard_roll_length_ft || material.roll_length_ft || material.length || 164)
 const singleArea = Math.round(defW * defL * 100) / 100
 const stockRolls = singleArea > 0 ? Math.floor(Number(material.current_stock || 0) / singleArea) : 0
 const stockDisp = `${stockRolls} Rolls (${Number(material.current_stock || 0).toLocaleString()} SFT)`
 const optDisp = `${defW}ft × ${defL}ft (${singleArea} SFT/Roll) — Available: ${stockDisp}`
 list.push({
 key: `${defW}x${defL}`,
 label: `${defW}ft × ${defL}ft (${singleArea} SFT/Roll)`,
 width_ft: defW,
 length_ft: defL,
 allowance_ft: 0,
 purchase_price: baseCost,
 gsm: Number(material.gsm || 0),
 finishing: String(material.default_finishing || 'none'),
 roll_count: stockRolls,
 total_sft: Number(material.current_stock || 0),
 unit_cost: baseCost > 150 ? baseCost : Math.round(baseCost * singleArea * 100) / 100,
 stock_display: stockDisp,
 option_display: optDisp,
      })
    }
  } else {
 const unitName = (material.purchase_unit || material.unit || 'pcs').toUpperCase()
 const stock = Number(material.current_stock || 0)
 const stockDisp = `${stock.toLocaleString()} ${unitName}`
 const optDisp = `Standard Unit (${unitName}) — Available: ${stockDisp}`
 list.push({
 key: 'standard',
 label: `Standard ${unitName}`,
 width_ft: 0,
 length_ft: 0,
 allowance_ft: 0,
 purchase_price: baseCost,
 gsm: Number(material.gsm || 0),
 finishing: String(material.default_finishing || 'none'),
 roll_count: stock,
 total_sft: stock,
 unit_cost: baseCost,
 stock_display: stockDisp,
 option_display: optDisp,
    })
  }

 return list
}

function computeItemRowMetrics(
 item: IssueItemRow,
 material: MaterialRecord | null,
 effectiveRolls: InventoryRollRecord[]
) {
 if (!material) {
 return {
 material: null,
 breakdown: null,
 options: [],
 activeOption: null,
 widthFt: 3,
 lengthFt: 164,
 purchaseUnitName: 'Pcs',
 consumptionUnitName: 'pcs',
 singleUnitQuantity: 1,
 unitMeasureDisplay: '1 PCS',
 totalBatchQuantity: item.quantity,
 currentStoreStock: 0,
 availablePurchaseUnits: 0,
 isStoreShortage: true,
 projectedStoreBalance: 0,
 projectedRemainingUnits: 0,
 isRollMedia: false,
 generatedRollCode: 'TAG-PENDING',
    }
  }

 const breakdown = getMaterialWarehouseStockBreakdown(material, effectiveRolls)
 const isRollMedia = Boolean(breakdown.is_roll)
 const rawPurchaseUnit = (
 breakdown.purchase_unit ||
 material.purchase_unit ||
    (material.material_config as any)?.purchase_unit ||
    'pcs'
  ).toLowerCase()
 const purchaseUnitName = formatUnitPlural(1, rawPurchaseUnit)
 const consumptionUnitName = (
 breakdown.consumption_unit ||
 material.unit ||
    (material as any)?.selling_unit ||
    'pcs'
  ).toLowerCase()

 const options = getMaterialConfiguredOptions(material, effectiveRolls)
 const activeOption = options.find((o) => o.key === item.selectedSizeKey) || options[0] || null

 const widthFt = Number(
 item.widthFt !== undefined && item.widthFt > 0
      ? item.widthFt
      : activeOption?.width_ft || material.roll_width_ft || material.width || 3
  )
 const lengthFt = Number(
 item.lengthFt !== undefined && item.lengthFt > 0
      ? item.lengthFt
      : activeOption?.length_ft || material.standard_roll_length_ft || material.roll_length_ft || material.length || 164
  )

 let singleUnitQuantity = 1
 let unitMeasureDisplay = `1 ${consumptionUnitName.toUpperCase()}`

 if (isRollMedia) {
 const area = Math.round(widthFt * lengthFt * 100) / 100
 singleUnitQuantity = area
 unitMeasureDisplay = `${widthFt}ft × ${lengthFt}ft (${area.toLocaleString()} SFT)`
  } else if (['sheet', 'rigid_sheet'].includes(rawPurchaseUnit)) {
 const sheetW = Number((material as any)?.sheet_width_ft || material.width || 4)
 const sheetL = Number((material as any)?.sheet_length_ft || material.length || 8)
 const sheetArea = sheetW * sheetL > 0 ? sheetW * sheetL : 32
 const isSft = ['sft', 'sqft'].includes(consumptionUnitName)
 singleUnitQuantity = isSft ? sheetArea : 1
 unitMeasureDisplay = isSft ? `${sheetW}ft × ${sheetL}ft (${sheetArea} SFT)` : `1 Sheet`
  } else if (['box', 'pack', 'carton', 'set'].includes(rawPurchaseUnit)) {
 const packQty = Number(
      (material as any)?.pack_quantity ||
      (material.material_config as any)?.pack_quantity ||
      (material as any)?.conversion_factor ||
      1
    )
 singleUnitQuantity = packQty > 1 ? packQty : 1
 unitMeasureDisplay = `${singleUnitQuantity.toLocaleString()} ${consumptionUnitName.toUpperCase()}`
  } else if (['bottle', 'can', 'liter', 'ltr'].includes(rawPurchaseUnit)) {
 const isMl = consumptionUnitName === 'ml'
 const vol = Number(
      (material as any)?.liquid_volume_capacity
        ? String((material as any).liquid_volume_capacity).replace(/[^0-9.]/g, '')
        : (material.material_config as any)?.liquid_volume_ml || 1000
    )
 singleUnitQuantity = isMl ? (vol > 0 ? vol : 1000) : 1
 unitMeasureDisplay = isMl ? `${singleUnitQuantity.toLocaleString()} ML` : `1 LTR`
  }

 const totalBatchQuantity = Math.round(singleUnitQuantity * item.quantity * 100) / 100
 const currentStoreStock = Number(material.current_stock ?? (material as any)?.stock ?? 0)

 let availablePurchaseUnits = 0
 if (activeOption && activeOption.roll_count > 0) {
 availablePurchaseUnits = activeOption.roll_count
  } else if (breakdown.total_rolls > 0) {
 availablePurchaseUnits = breakdown.total_rolls
  } else if (singleUnitQuantity > 0) {
 availablePurchaseUnits = Math.floor(currentStoreStock / singleUnitQuantity)
  }

 const isStoreShortage = currentStoreStock < totalBatchQuantity || availablePurchaseUnits < item.quantity
 const projectedStoreBalance = currentStoreStock - totalBatchQuantity
 const projectedRemainingUnits = Math.max(0, availablePurchaseUnits - item.quantity)

  // Identifier tag
 let generatedRollCode = ''
 if (item.customRollTag?.trim()) {
 generatedRollCode = item.quantity > 1 ? `${item.customRollTag.trim()}-01` : item.customRollTag.trim()
  } else {
 const cleanSku = (material.sku || 'MAT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
 const lot = item.lotNumber?.trim() || new Date().toISOString().slice(2, 10).replace(/-/g, '')
 const tagPrefix = isRollMedia ? `ROL-${cleanSku}-${widthFt}FT` : `MAT-${cleanSku}`
 const tag = `${tagPrefix}-${lot}`
 generatedRollCode = item.quantity > 1 ? `${tag}-01` : tag
  }

 return {
 material,
 breakdown,
 options,
 activeOption,
 widthFt,
 lengthFt,
 purchaseUnitName,
 consumptionUnitName,
 singleUnitQuantity,
 unitMeasureDisplay,
 totalBatchQuantity,
 currentStoreStock,
 availablePurchaseUnits,
 isStoreShortage,
 projectedStoreBalance,
 projectedRemainingUnits,
 isRollMedia,
 generatedRollCode,
  }
}

export function IssueMasterRollModal({
 open,
 onOpenChange,
 materials = [],
 locations = [],
 initialMaterialId,
 selectedMaterialId,
 initialWidthFt = 3,
 initialLengthFt = 164,
 request,
 rolls,
 onSuccess,
 companyId,
}: IssueMasterRollModalProps) {
 const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'

  // 1. Available materials fallback discovery
 const availableMaterials = useMemo(() => {
 let all: MaterialRecord[] = []

 if (Array.isArray(materials) && materials.length > 0) {
 all = [...materials]
    }

 if (all.length === 0 && companyId) {
 try {
 const stored = PrintFlowDataStore.getAll<MaterialRecord>(STORAGE_KEYS.MATERIALS, companyId) || []
 if (stored.length > 0) all = stored
      } catch {}
    }
 if (all.length === 0) {
 try {
 const storedGlobal = PrintFlowDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
 if (storedGlobal.length > 0) all = storedGlobal
      } catch {}
    }

    // Include registered stocked inventory products
 try {
 const allProds = companyId
        ? PrintFlowDataStore.getAll<any>(STORAGE_KEYS.PRODUCTS, companyId) || []
        : PrintFlowDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
 for (const p of allProds) {
 if (!all.some((m) => m.id === p.id || (p.sku && m.sku && m.sku.toLowerCase() === p.sku.toLowerCase()))) {
 all.push({
 id: p.id,
 company_id: p.company_id || companyId || '',
 sku: p.sku || '',
 name: p.name,
 name_bn: p.name_bn || null,
 category: p.category || 'raw_material',
 unit: p.unit || p.selling_unit || 'pcs',
              current_stock: Number(
                p.current_stock ??
                p.stock ??
                (p.pricing_formula as any)?.current_stock ??
                (p.pricing_formula as any)?.stock ??
                (p.pricing_formula as any)?.opening_stock ??
                p.opening_stock ??
                0
              ),
 average_cost: Number(p.cost_per_unit ?? p.base_cost ?? p.purchase_price ?? 0),
 last_purchase_price: Number(p.purchase_price ?? p.cost_per_unit ?? p.base_cost ?? 0),
 is_roll: Boolean(
 p.is_roll ||
              ['roll', 'flex', 'vinyl', 'banner', 'canvas', 'mesh', 'pvc', 'sticker'].some((c) =>
 String(p.category || '').toLowerCase().includes(c)
              )
            ),
 roll_width_ft: p.roll_width_ft || p.width || null,
 standard_roll_length_ft: p.standard_roll_length_ft || p.length || 164,
 is_active: p.is_active !== false,
 created_at: p.created_at || new Date().toISOString(),
 updated_at: p.updated_at || new Date().toISOString(),
          } as MaterialRecord)
        }
      }
    } catch {}

 return all.filter((m) => m && m.is_active !== false && !(m as any).is_deleted)
  }, [materials, companyId])

  // 2. Rolls discovery fallback
 const effectiveRolls = useMemo(() => {
 if (Array.isArray(rolls) && rolls.length > 0) return rolls
 if (companyId) {
 try {
 const stored = PrintFlowDataStore.getAll<InventoryRollRecord>(STORAGE_KEYS.MOUNTED_ROLLS, companyId) || []
 if (stored.length > 0) return stored
      } catch {}
    }
 try {
 const storedGlobal = PrintFlowDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
 if (storedGlobal.length > 0) return storedGlobal
    } catch {}
 return []
  }, [rolls, companyId])

  // 3. Locations fallback
 const effectiveLocations = useMemo(() => {
 let list = Array.isArray(locations) && locations.length > 0 ? [...locations] : []
 if (list.length === 0 && companyId) {
 try {
 const stored = PrintFlowDataStore.getAll<InventoryLocationRecord>(STORAGE_KEYS.LOCATIONS, companyId) || []
 if (stored.length > 0) list = stored
      } catch {}
    }
 if (list.length === 0) {
 try {
 const storedGlobal = PrintFlowDataStore.get<InventoryLocationRecord[]>(STORAGE_KEYS.LOCATIONS) || []
 if (storedGlobal.length > 0) list = storedGlobal
      } catch {}
    }
 if (list.length === 0) {
 list = [
        {
 id: 'loc-main-warehouse',
 company_id: companyId || '',
 location_code: 'WH-MAIN',
 location_name: 'Main Material Warehouse',
 location_type: 'raw_material_store',
 is_active: true,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
        },
      ]
    }
 return list
  }, [locations, companyId])

  // Common Header State
 const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0])
 const [sourceLocationId, setSourceLocationId] = useState<string>(() => {
 const pref = locations.find(
      (l) =>
 l.location_type === 'raw_material_store' ||
 l.location_type === 'main_store' ||
        (l as any).is_default ||
 l.location_code?.toUpperCase().includes('RAW') ||
 l.location_code?.toUpperCase().includes('MAIN')
    )
 return pref ? pref.id : locations[0]?.id || ''
  })
 const [operatorName, setOperatorName] = useState<string>('Floor Operator')
 const [notes, setNotes] = useState<string>('')

  // Multi-Item State
 const [issueItems, setIssueItems] = useState<IssueItemRow[]>([])

  // UI Feedback States
 const [loading, setLoading] = useState<boolean>(false)
 const [error, setError] = useState<string | null>(null)
 const [success, setSuccess] = useState<string | null>(null)
 const [showPrintLabel, setShowPrintLabel] = useState<boolean>(false)

  // Initialize or Reset Modal
 const initModalState = useCallback(() => {
 const targetMatId =
 initialMaterialId ||
 selectedMaterialId ||
 request?.items?.[0]?.material_id ||
      (request as any)?.material_id ||
 availableMaterials[0]?.id ||
      ''

 const targetMat = availableMaterials.find((m) => m.id === targetMatId) || availableMaterials[0] || null
 const options = getMaterialConfiguredOptions(targetMat, effectiveRolls)
 const matchedOpt = options.find((o) =>
 initialWidthFt && initialLengthFt ? o.width_ft === initialWidthFt && o.length_ft === initialLengthFt : false
    ) || options[0]

 const reqQty = Number(request?.items?.[0]?.requested_quantity || (request as any)?.requested_quantity || 1)

 setIssueItems([
      {
 id: `issue-row-${Date.now()}`,
 materialId: targetMat?.id || '',
 selectedSizeKey: matchedOpt?.key || '',
 widthFt: matchedOpt?.width_ft || initialWidthFt,
 lengthFt: matchedOpt?.length_ft || initialLengthFt,
 quantity: reqQty > 0 ? reqQty : 1,
 lotNumber: '',
 customRollTag: '',
 notes: '',
 showTagDetails: false,
      },
    ])

 if (request?.notes) {
 setNotes(request.notes)
    } else if (request?.request_number) {
 setNotes(`Requisition #${request.request_number}`)
    } else {
 setNotes('')
    }

    // Auto-select source location
 const prefLoc = effectiveLocations.find(
      (l) =>
 l.location_type === 'raw_material_store' ||
 l.location_type === 'main_store' ||
        (l as any).is_default ||
 l.location_code?.toUpperCase().includes('RAW') ||
 l.location_code?.toUpperCase().includes('MAIN')
    )
 setSourceLocationId(prefLoc ? prefLoc.id : effectiveLocations[0]?.id || '')
 setIssueDate(new Date().toISOString().split('T')[0])
 setError(null)
 setSuccess(null)
 setLoading(false)
  }, [
 initialMaterialId,
 selectedMaterialId,
 initialWidthFt,
 initialLengthFt,
 request,
 availableMaterials,
 effectiveRolls,
 effectiveLocations,
  ])

 useEffect(() => {
 if (open) {
 initModalState()
    }
  }, [open, initModalState])

  // Row Management Handlers
 const handleAddItem = () => {
 const nextMat = availableMaterials[0]
 if (!nextMat) return
 const options = getMaterialConfiguredOptions(nextMat, effectiveRolls)
 const firstOpt = options[0]
 setIssueItems((prev) => [
      ...prev,
      {
 id: `issue-row-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
 materialId: nextMat.id,
 selectedSizeKey: firstOpt?.key || '',
 widthFt: firstOpt?.width_ft,
 lengthFt: firstOpt?.length_ft,
 quantity: 1,
 lotNumber: '',
 customRollTag: '',
 notes: '',
 showTagDetails: false,
      },
    ])
  }

 const handleRemoveItem = (index: number) => {
 if (issueItems.length <= 1) return
 setIssueItems((prev) => prev.filter((_, i) => i !== index))
  }

 const handleUpdateItem = (index: number, patch: Partial<IssueItemRow>) => {
 setIssueItems((prev) => {
 const updated = [...prev]
 updated[index] = { ...updated[index], ...patch }
 return updated
    })
  }

 const handleMaterialChange = (index: number, newMatId: string) => {
 const newMat = availableMaterials.find((m) => m.id === newMatId) || null
 const options = getMaterialConfiguredOptions(newMat, effectiveRolls)
 const firstOpt = options[0]
 handleUpdateItem(index, {
 materialId: newMatId,
 selectedSizeKey: firstOpt?.key || '',
 widthFt: firstOpt?.width_ft,
 lengthFt: firstOpt?.length_ft,
    })
  }

 const handleSizeChange = (index: number, sizeKey: string) => {
 const row = issueItems[index]
 const mat = availableMaterials.find((m) => m.id === row.materialId) || null
 const options = getMaterialConfiguredOptions(mat, effectiveRolls)
 const opt = options.find((o) => o.key === sizeKey)
 handleUpdateItem(index, {
 selectedSizeKey: sizeKey,
 widthFt: opt?.width_ft,
 lengthFt: opt?.length_ft,
    })
  }

  // Pre-calculated metrics for all rows
 const computedRows = useMemo(() => {
 return issueItems.map((item) => {
 const mat = availableMaterials.find((m) => m.id === item.materialId) || null
 return computeItemRowMetrics(item, mat, effectiveRolls)
    })
  }, [issueItems, availableMaterials, effectiveRolls])

  // Global validation: does any row have shortage or invalid qty?
 const hasShortage = computedRows.some((r) => r.isStoreShortage)
 const hasInvalidQty = issueItems.some((item) => !item.quantity || item.quantity <= 0)
 const hasEmptyMaterial = issueItems.some((item) => !item.materialId)

  // Overall totals
 const totalUnitsCount = useMemo(() => {
 return issueItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0)
  }, [issueItems])

 const totalAreaSft = useMemo(() => {
 return computedRows.reduce((acc, r) => acc + (r.isRollMedia ? r.totalBatchQuantity : 0), 0)
  }, [computedRows])

  // Submit Handler
 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()

 if (issueItems.length === 0 || hasEmptyMaterial) {
 setError('Please ensure each row has a valid material selected.')
 return
    }

 if (hasInvalidQty) {
 setError('Issue quantity must be at least 1 for all items.')
 return
    }

    // Identify first shortage row if any
 const shortageIdx = computedRows.findIndex((r) => r.isStoreShortage)
 if (shortageIdx !== -1) {
 const deficient = computedRows[shortageIdx]
 setError(
        `Insufficient Warehouse Stock for"${deficient.material?.name || 'Item'}": Available is ${deficient.availablePurchaseUnits} ${formatUnitPlural(deficient.availablePurchaseUnits, deficient.purchaseUnitName)} (${deficient.currentStoreStock.toLocaleString()} ${deficient.consumptionUnitName.toUpperCase()}). Please adjust quantity.`
      )
 return
    }

 setLoading(true)
 setError(null)
 setSuccess(null)

 try {
 const payloads: IssueMasterRollParams[] = issueItems.map((item, idx) => {
 const metrics = computedRows[idx]
 return {
 material_id: item.materialId,
 width_ft: Number(metrics.widthFt),
 length_ft: Number(metrics.lengthFt),
 quantity_rolls: Number(item.quantity),
 location_id: sourceLocationId || null,
 destination: 'floor_staging',
 machine_id: null,
 machine_name: null,
 lot_number: item.lotNumber?.trim() || undefined,
 roll_code_custom: item.customRollTag?.trim() || undefined,
 operator_name: operatorName.trim() || 'Floor Operator',
 request_id: request?.id || null,
 production_task_id: request?.production_task_id || null,
 group_key: metrics.activeOption?.key || item.selectedSizeKey || undefined,
 size_label: metrics.activeOption?.label || undefined,
 variant_id: (metrics.activeOption as any)?.variant_id || undefined,
 variant_name: (metrics.activeOption as any)?.variant_name || undefined,
 notes:
 item.notes?.trim() ||
 notes.trim() ||
            (request?.request_number
              ? `Issued against Requisition ${request.request_number} to Print Floor`
              : `Issued ${item.quantity} ${formatUnitPlural(item.quantity, metrics.purchaseUnitName)} to Print Floor`),
 unit_cost: 0,
        }
      })

 const res = await issueMultipleMaterialsBatchAction(payloads, companyId)

 if (!res.success || !res.data) {
 setError(res.error || 'Failed to issue materials to floor.')
 return
      }

      // Write directly to local PrintFlowDataStore cache to guarantee immediate visibility
      try {
        if (res.data.results && Array.isArray(res.data.results)) {
          for (const rResult of res.data.results) {
            const rollsToSave = rResult.rolls?.length
              ? rResult.rolls
              : rResult.roll
              ? [rResult.roll]
              : []

            for (const roll of rollsToSave) {
              if (!roll) continue
              PrintFlowDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, roll, companyId)
              PrintFlowDataStore.addItem(STORAGE_KEYS.MOUNTED_ROLLS, roll)

              const initialArea = Number(roll.initial_area_sft || (roll.width_ft * roll.initial_length_ft) || 1)
              const remainingArea = Number(roll.remaining_area_sft || roll.initial_area_sft || initialArea)

              const floorRecord: FloorConsumptionRecord = {
                id: `fc-${roll.id}`,
                company_id: roll.company_id || companyId || 'default',
                branch_id: roll.branch_id || null,
                issue_id: roll.id,
                issue_number: roll.roll_code,
                material_id: roll.material_id,
                material_name: roll.material?.name || 'Roll Substrate',
                sku: roll.material?.sku || roll.roll_code,
                unit: 'sft',
                roll_id: roll.id,
                roll_code: roll.roll_code,
                operator_name: roll.mounted_by_name || 'Floor Operator',
                machine_id: roll.mounted_machine_id || null,
                machine_name: (roll as any).mounted_press_name || roll.mounted_machine_name || null,
                job_reference: roll.notes || null,
                issued_quantity: initialArea,
                consumed_quantity: 0,
                remaining_floor_balance: remainingArea,
                unit_cost: roll.unit_cost || 0,
                total_cost: roll.total_cost || 0,
                wastage_quantity: 0,
                wastage_reason: null,
                wastage_cost: 0,
                returned_quantity: 0,
                return_location_id: null,
                return_location_name: null,
                remnants_count: 0,
                remnants_area_sft: 0,
                status: 'on_floor',
                notes: roll.notes || null,
                created_at: roll.created_at || new Date().toISOString(),
                updated_at: roll.updated_at || new Date().toISOString(),
                material: roll.material,
              }
              PrintFlowDataStore.addItem(STORAGE_KEYS.FLOOR_CONSUMPTIONS, floorRecord, companyId)
              PrintFlowDataStore.addItem(STORAGE_KEYS.FLOOR_CONSUMPTIONS, floorRecord)
            }
          }
        }
      } catch (storeErr) {
        console.error('[IssueMasterRollModal] Error writing to PrintFlowDataStore:', storeErr)
      }

      // Dispatch real-time sync broadcast events
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('printflow_table_synced:materials'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:stock_ledger'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:mounted_rolls'))
 window.dispatchEvent(new CustomEvent('printflow_table_synced:floor_consumption'))
      }

 setSuccess(
        `Successfully issued ${payloads.length} ${payloads.length === 1 ? 'material item' : 'material items'} (${totalUnitsCount} total units) to Print Floor!`
      )

 if (onSuccess) {
 onSuccess(res.data.results?.[0] || res.data)
      }

 setTimeout(() => {
 onOpenChange(false)
      }, 700)
    } catch (err: any) {
 setError(err.message || 'Error occurred while issuing materials.')
    } finally {
 setLoading(false)
    }
  }

 const sourceLocationName = useMemo(() => {
 return effectiveLocations.find((l) => l.id === sourceLocationId)?.location_name || 'Warehouse Store'
  }, [effectiveLocations, sourceLocationId])

 return (
    <ModalDialog
 open={open}
 onOpenChange={onOpenChange}
 size="3xl"title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs shrink-0">
            <Package className="h-5 w-5"/>
          </div>
          <div>
            <div className="text-base font-bold text-foreground leading-tight">
              {tBilingual(
                'Direct Material Issue & Print Floor Requisition',
                'সরাসরি ফ্লোরে কাঁচামাল প্রদান ও চাহিদা পূরণ'
              )}
            </div>
            <div className="text-xs font-medium text-muted-foreground">
              {tBilingual(
                'Issue single or multiple materials, rolls, sheets, or supplies directly from warehouse inventory.',
                'গুদাম স্টক থেকে সরাসরি ফ্লোরে এক বা একাধিক কাঁচামাল বা মাস্টার রোল বরাদ্দ করুন।'
              )}
            </div>
          </div>
        </div>
      }
 onSubmit={handleSubmit}
 className="p-0 overflow-hidden shadow-lg border border-border"bodyClassName="p-4 sm:p-5 space-y-4 text-xs"footer={
        <div className="w-full flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary"className="tabular-nums text-xs font-bold py-1 px-2.5">
              {issueItems.length} {tBilingual(issueItems.length === 1 ? 'Material' : 'Materials', 'টি উপাদান')} ({totalUnitsCount} {tBilingual('Units', 'ইউনিট')})
            </Badge>
            {totalAreaSft > 0 && (
              <Badge variant="outline"className="tabular-nums text-xs font-semibold py-1 px-2">
 {tBilingual('Total Area', 'মোট পরিমাপ')}: {totalAreaSft.toLocaleString()} SFT
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
 type="button"variant="outline"onClick={() => onOpenChange(false)}
 disabled={loading}
 className="h-9 px-4 text-xs font-semibold cursor-pointer">
 Cancel
            </Button>
            <Button
 type="submit"disabled={loading || issueItems.length === 0 || hasEmptyMaterial || hasShortage || hasInvalidQty}
 className="h-9 px-5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs cursor-pointer gap-2">
              {loading ? (
                <span>{tBilingual('Issuing Materials...', 'কাঁচামাল প্রদান করা হচ্ছে...')}</span>
              ) : (
                <>
                  <Package className="h-4 w-4"/>
                  <span>
                    {tBilingual(
                      `Confirm Issue (${issueItems.length} ${issueItems.length === 1 ? 'Item' : 'Items'})`,
                      `ইস্যু নিশ্চিত করুন (${issueItems.length} টি আইটেম)`
                    )}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5"/>
                </>
              )}
            </Button>
          </div>
        </div>
      }
 footerClassName="px-5 py-3.5 bg-muted border-t border-border">
      <div className="space-y-4 text-xs">
        {/* Success Alert */}
        {success && (
          <div className="p-3.5 bg-success-surface bg-success-surface text-success text-success rounded-xl border border-success-border border-success-border flex items-center gap-3 animate-in fade-in shadow-xs">
            <CheckCircle2 className="h-5 w-5 text-success text-success shrink-0"/>
            <span className="font-semibold text-xs">{success}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-danger-surface bg-danger-surface text-destructive text-destructive rounded-xl border border-danger-border border-danger-border flex items-center gap-3 animate-in fade-in shadow-xs">
            <AlertTriangle className="h-5 w-5 text-destructive text-destructive shrink-0"/>
            <span className="font-semibold text-xs">{error}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* COMMON REQUISITION HEADER: DATE, OPERATOR & PURPOSE */}
        {/* ========================================================= */}
        <div className="p-3.5 bg-muted rounded-xl border border-border shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs uppercase text-foreground tracking-wider flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary text-primary"/>
              {tBilingual('Requisition Header', 'ইস্যু তথ্য')}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
 {tBilingual('Destination:', 'গন্তব্য:')} <strong className="text-foreground">{tBilingual('Print Floor Staging', 'প্রিন্ট ফ্লোর স্টেজ')}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
            {/* Issue Date */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1 h-5 whitespace-nowrap">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground"/>
                <span>{tBilingual('Issue Date', 'ইস্যুর তারিখ')}</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
 type="date"value={issueDate}
 onChange={(e) => setIssueDate(e.target.value)}
 className="h-9.5 text-xs bg-card"required
              />
            </div>

            {/* Request by / Operator */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1 h-5 whitespace-nowrap">
                <User className="h-3.5 w-3.5 text-muted-foreground"/>
                <span>{tBilingual('Request by / Operator', 'অনুরোধকারী')}</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
 value={operatorName}
 onChange={(e) => setOperatorName(e.target.value)}
 placeholder={tBilingual('e.g. Kamal Hossain / Floor Operator', 'যেমন: কামাল হোসেন / ফ্লোর অপারেটর')}className="h-9.5 text-xs font-medium bg-card"required
              />
            </div>

            {/* Remarks / Purpose */}
            <div>
              <Label className="text-xs font-semibold mb-1.5 flex items-center gap-1 h-5 whitespace-nowrap">
                <FileText className="h-3.5 w-3.5 text-muted-foreground"/>
                <span>{tBilingual('Purpose / Job Ref', 'কাজের রেফারেন্স')}</span>
              </Label>
              <Input
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder={tBilingual('e.g. Job #1042 / Urgent Run', 'যেমন: জব #১০৪২ / জরুরি কাজ')}className="h-9.5 text-xs font-medium bg-card"/>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MULTIPLE ITEMS ISSUE SECTION */}
        {/* ========================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase text-foreground tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary text-primary"/>
                {tBilingual('Items to Issue', 'ইস্যু করার কাঁচামাল তালিকা')}
              </span>
              <Badge variant="secondary"className="tabular-nums font-bold text-xs px-2 py-0.5">
                {issueItems.length} {tBilingual(issueItems.length === 1 ? 'Item' : 'Items', 'টি আইটেম')}
              </Badge>
            </div>

            <Button
 type="button"variant="outline"size="sm"onClick={handleAddItem}
 className="h-8 text-xs font-bold gap-1.5 border-border text-foreground hover:bg-muted hover:bg-primary/10 dark:hover:bg-primary/10 cursor-pointer shadow-2xs">
              <Plus className="h-3.5 w-3.5"/>
              <span>{tBilingual('+ Add Another Item', '+ আরেকটি আইটেম যোগ করুন')}</span>
            </Button>
          </div>

          {/* List of Issue Items */}
          <div className="space-y-3">
            {issueItems.map((item, idx) => {
 const metrics = computedRows[idx]
 const hasOptions = metrics.options.length > 0

 return (
                <div
 key={item.id}
 className={cn(
                    'p-3.5 rounded-xl border transition-all shadow-2xs space-y-3 bg-card ',
 metrics.isStoreShortage
                      ? 'border-danger-border border-danger-border/80 bg-danger-surface/20'
                      : 'border-border '
                  )}
                >
                  {/* Item Row Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-primary/10 bg-primary/10 text-primary text-primary font-black text-xs flex items-center justify-center tabular-nums">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs text-foreground">
                        {metrics.material ? metrics.material.name : tBilingual('Choose Material', 'কাঁচামাল নির্বাচন করুন')}
                      </span>
                      {metrics.material && (
                        <Badge
 variant="outline"className={cn(
                            'text-xs tabular-nums font-semibold px-2 py-0.5',
 metrics.isStoreShortage
                              ? 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-destructive'
                              : 'bg-success-surface text-success border-success-border bg-success-surface text-success'
                          )}
                        >
 {tBilingual('Stock:', 'স্টক:')} {metrics.breakdown?.purchase_unit_display || `${metrics.currentStoreStock} ${metrics.consumptionUnitName.toUpperCase()}`}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
 type="button"variant="ghost"size="sm"onClick={() =>
 handleUpdateItem(idx, { showTagDetails: !item.showTagDetails })
                        }
 className="h-7 text-xs font-medium text-muted-foreground hover:text-foreground dark:hover:text-foreground px-2 cursor-pointer">
                        <Tag className="h-3 w-3 mr-1"/>
                        {item.showTagDetails ? tBilingual('Hide Lot', 'লট লুকান') : tBilingual('Tag / Lot', 'ট্যাগ / লট')}
                      </Button>

                      {issueItems.length > 1 && (
                        <Button
 type="button"variant="ghost"size="sm"onClick={() => handleRemoveItem(idx)}
 className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-danger-surface dark:hover:bg-danger-surface cursor-pointer rounded-lg"title={tBilingual('Remove item', 'আইটেম বাদ দিন')}>
                          <Trash2 className="h-3.5 w-3.5"/>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Item Inputs Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    {/* Material Selector (5 cols) */}
                    <div className={cn(hasOptions ? 'sm:col-span-5' : 'sm:col-span-8')}>
                      <Label className="text-xs font-semibold mb-1 block text-muted-foreground">
                        {tBilingual('Material Name', 'কাঁচামাল')} <span className="text-destructive">*</span>
                      </Label>
                      <select
 value={item.materialId}
 onChange={(e) => handleMaterialChange(idx, e.target.value)}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring shadow-2xs"required
                      >
                        <option value="">{tBilingual('-- Choose Material --', '-- কাঁচামাল নির্বাচন করুন --')}</option>
                        {availableMaterials.map((m) => {
 const bd = getMaterialWarehouseStockBreakdown(m, effectiveRolls)
 return (
                            <option key={m.id} value={m.id}>
                              {m.name}{isUserSku(m.sku) ? ` (${m.sku})` : ''} • {tBilingual('Stock:', 'স্টক:')} {bd.purchase_unit_display}
                            </option>
                          )
                        })}
                      </select>
                    </div>

                    {/* Size / Option Selector (4 cols if present) */}
                    {hasOptions && (
                      <div className="sm:col-span-4">
                        <Label className="text-xs font-semibold mb-1 block text-muted-foreground">
                          {tBilingual('Available Option / Size', 'উপলব্ধ সাইজ ও অপশন')} <span className="text-destructive">*</span>
                        </Label>
                        <select
 value={item.selectedSizeKey || metrics.activeOption?.key || ''}
 onChange={(e) => handleSizeChange(idx, e.target.value)}
 className="w-full h-9 rounded-lg border border-primary/20 border-border bg-primary/10/40 bg-primary/10 px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring shadow-2xs tabular-nums">
                          {metrics.options.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              {opt.option_display}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Quantity Selector (3 cols) */}
                    <div className={cn(hasOptions ? 'sm:col-span-3' : 'sm:col-span-4')}>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          {tBilingual(`Qty (${metrics.purchaseUnitName})`, `পরিমাণ (${metrics.purchaseUnitName})`)}{' '}
                          <span className="text-destructive">*</span>
                        </Label>
                        <span className="text-xs text-primary text-primary font-bold tabular-nums">
                          = {metrics.totalBatchQuantity.toLocaleString()} {metrics.consumptionUnitName.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
 type="button"size="sm"variant="outline"onClick={() => handleUpdateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}
 className="h-9 w-8 p-0 cursor-pointer shrink-0">
                          <Minus className="h-3.5 w-3.5"/>
                        </Button>
                        <Input
 type="number"min="1"max="1000"value={item.quantity}
 onChange={(e) =>
 handleUpdateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })
                          }
 className="h-9 text-center tabular-nums font-black text-xs"/>
                        <Button
 type="button"size="sm"variant="outline"onClick={() => handleUpdateItem(idx, { quantity: item.quantity + 1 })}
 className="h-9 w-8 p-0 cursor-pointer shrink-0">
                          <Plus className="h-3.5 w-3.5"/>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Stock Shortage Warning for this item */}
                  {metrics.isStoreShortage && (
                    <div className="p-2.5 bg-danger-surface bg-danger-surface/60 border border-danger-border border-danger-border rounded-lg text-destructive text-destructive text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0"/>
                        <span>
 {tBilingual('Insufficient Warehouse Stock! Available:', 'গুদামে পর্যাপ্ত স্টক নেই! মজুদ:')} {metrics.availablePurchaseUnits}{' '} {formatUnitPlural(metrics.availablePurchaseUnits, metrics.purchaseUnitName)} ({metrics.currentStoreStock.toLocaleString()} {metrics.consumptionUnitName.toUpperCase()}).
                        </span>
                      </div>
                      <span className="font-bold tabular-nums shrink-0">
 {tBilingual('Deficit:', 'ঘাটতি:')} {Math.abs(metrics.projectedStoreBalance).toLocaleString()} {metrics.consumptionUnitName.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Expandable Lot / Tag Overrides */}
                  {item.showTagDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2.5 border-t border-border">
                      <div>
                        <Label className="text-xs font-semibold mb-1 block text-muted-foreground">
 {tBilingual('Batch / Lot Number (Optional)', 'ব্যাচ / লট নম্বর (ঐচ্ছিক)')}
                        </Label>
                        <Input
 placeholder={tBilingual('e.g. LOT-2026-B8', 'যেমন: LOT-2026-B8')}value={item.lotNumber || ''}
 onChange={(e) => handleUpdateItem(idx, { lotNumber: e.target.value })}
 className="h-8 text-xs tabular-nums"/>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold mb-1 block text-muted-foreground">
 {tBilingual('Custom Roll / Item Tag (Optional)', 'কাস্টম রোল / আইটেম ট্যাগ (ঐচ্ছিক)')}
                        </Label>
                        <Input
 placeholder={tBilingual('e.g. TAG-CUSTOM-001', 'যেমন: TAG-CUSTOM-001')}value={item.customRollTag || ''}
 onChange={(e) => handleUpdateItem(idx, { customRollTag: e.target.value })}
 className="h-8 text-xs tabular-nums"/>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add Another Item Button */}
          <div className="flex justify-center pt-1">
            <Button
 type="button"variant="outline"size="sm"onClick={handleAddItem}
 className="text-xs font-bold gap-1.5 border-dashed border-input text-muted-foreground hover:text-primary hover:border-border dark:hover:border-border cursor-pointer h-9 px-4">
              <Plus className="h-4 w-4"/>
              <span>{tBilingual('+ Add Another Material / Roll to Issue', '+ আরেকটি কাঁচামাল / রোল যোগ করুন')}</span>
            </Button>
          </div>
        </div>

        {/* Printable Ticket Preview Accordion */}
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
          <div className="p-3 bg-muted flex items-center justify-between">
            <span className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Barcode className="h-4 w-4 text-muted-foreground"/>
              {tBilingual('Printable Ticket Preview', 'প্রিন্টযোগ্য ট্যাগ প্রিভিউ')}
            </span>
            <Button
 type="button"variant="outline"size="sm"onClick={() => setShowPrintLabel(!showPrintLabel)}
 className="h-7 text-xs font-bold px-2.5 cursor-pointer">
              {showPrintLabel ? tBilingual('Hide Label', 'ট্যাগ লুকান') : tBilingual('Show Ticket', 'টিকেট দেখুন')}
            </Button>
          </div>

          {showPrintLabel && (
            <div className="p-4 bg-muted flex flex-col items-center animate-in fade-in space-y-3">
              {computedRows.map((r, i) => (
                <div
 key={i}
 className="w-full max-w-sm p-4 bg-card border-2 border-border rounded-xl shadow-xs space-y-2 text-foreground">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <div className="font-black text-xs tracking-wider">{tBilingual(`PRINTFLOW MATERIAL TICKET #${i + 1}`, `প্রিন্টফ্লো মেটেরিয়াল টিকেট #${i + 1}`)}</div>
                    <Badge variant="outline"className="tabular-nums text-xs font-bold uppercase">
                      {r.purchaseUnitName}
                    </Badge>
                  </div>

                  <div className="text-center py-1">
                    <div className="tabular-nums font-black text-sm tracking-wider">{r.generatedRollCode}</div>
                    <div className="text-xs font-bold text-foreground">
                      {r.material?.name || 'Raw Material Item'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs tabular-nums border-t border-b py-1.5">
                    <div>
                      <span className="text-muted-foreground block">{tBilingual('MEASURE:', 'পরিমাপ:')}</span>
                      <strong>{r.unitMeasureDisplay}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{tBilingual('QUANTITY:', 'পরিমাণ:')}</span>
                      <strong>
                        {issueItems[i]?.quantity} {formatUnitPlural(issueItems[i]?.quantity, r.purchaseUnitName).toUpperCase()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{tBilingual('TOTAL VOLUME:', 'মোট ভলিউম:')}</span>
                      <strong>
                        {r.totalBatchQuantity.toLocaleString()} {r.consumptionUnitName.toUpperCase()}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">{tBilingual('DESTINATION:', 'গন্তব্য:')}</span><strong>{tBilingual('Floor Staging', 'ফ্লোর স্টেজ')}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                    <span>{tBilingual('DATE:', 'তারিখ:')} {issueDate}</span>
                    <span>{tBilingual('OPERATOR:', 'অপারেটর:')} {operatorName}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  )
}

export const MaterialIssueModal = IssueMasterRollModal
export type MaterialIssueModalProps = IssueMasterRollModalProps
export const FloorIssueModal = IssueMasterRollModal
export type FloorIssueModalProps = IssueMasterRollModalProps
