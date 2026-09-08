export type BusinessCategoryCode =
  | 'digital_print'
  | 'offset_print'
  | 'flex_banner'
  | 'sticker_label'
  | 'packaging_box'
  | 'garment_print'
  | 'promotional'
  | 'led_signage'
  | 'acrylic_signage'
  | 'metal_fabrication'
  | 'acp_signage'
  | 'pvc_signage'

export type UnitCategory = 'area' | 'length' | 'quantity' | 'weight' | 'volume'

export type MeasurementUnitCode =
  | 'sft'
  | 'rft'
  | 'sqinch'
  | 'sqm'
  | 'pcs'
  | 'pack'
  | 'ream'
  | 'gross'
  | 'thaan'
  | 'meter'
  | 'inch'
  | 'kg'

export interface MeasurementUnit {
  code: MeasurementUnitCode
  name_en: string
  name_bn: string
  symbol_en: string
  symbol_bn: string
  category: UnitCategory
}

export type JobOrderStatus =
  | 'draft'
  | 'quotation'
  | 'approved'
  | 'designing'
  | 'in_production'
  | 'quality_check'
  | 'ready_for_delivery'
  | 'delivered'
  | 'installed'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue'

export interface DimensionCalculation {
  width: number
  height: number
  quantity: number
  unit: MeasurementUnitCode
  totalArea: number // in square feet or running feet
  unitPrice: number
  subtotal: number
}
