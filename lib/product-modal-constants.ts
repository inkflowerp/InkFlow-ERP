import type { CommercialProductType, PricingMethod, ProductType, UnitOfMeasure } from '@/types/product.types'

export interface ProductTypeCard {
  key: CommercialProductType
  type: CommercialProductType
  label: string
  label_bn: string
  description: string
  desc: string
  iconName: string
}

export const PRODUCT_TYPE_CARDS = [
  {
    key: 'production_product' as CommercialProductType,
    type: 'production_product' as CommercialProductType,
    label: 'Product',
    label_bn: 'পণ্য',
    description: 'Physical item that you sell or produce',
    desc: 'Physical item that you sell or produce',
    iconName: 'Package',
  },
  {
    key: 'service' as CommercialProductType,
    type: 'service' as CommercialProductType,
    label: 'Service',
    label_bn: 'সেবা',
    description: 'A service such as design, installation, delivery, etc.',
    desc: 'A service such as design, installation, delivery, etc.',
    iconName: 'Sparkles',
  },
  {
    key: 'material' as CommercialProductType,
    type: 'material' as CommercialProductType,
    label: 'Material',
    label_bn: 'কাঁচামাল',
    description: 'Raw material or substrate stock item',
    desc: 'Raw material or substrate stock item',
    iconName: 'Layers',
  },
  {
    key: 'finishing' as CommercialProductType,
    type: 'finishing' as CommercialProductType,
    label: 'Finishing',
    label_bn: 'ফিনিশিং',
    description: 'Lamination, eyelet, binding, cutting, etc.',
    desc: 'Lamination, eyelet, binding, cutting, etc.',
    iconName: 'Scissors',
  },
  {
    key: 'fabrication' as CommercialProductType,
    type: 'fabrication' as CommercialProductType,
    label: 'Fabrication',
    label_bn: 'ফেব্রিকেশন',
    description: 'Fabrication work such as acrylic, metal, ACP',
    desc: 'Fabrication work such as acrylic, metal, ACP',
    iconName: 'Wrench',
  },
  {
    key: 'installation' as CommercialProductType,
    type: 'installation' as CommercialProductType,
    label: 'Installation',
    label_bn: 'ইনস্টলেশন',
    description: 'Installation or fitting service',
    desc: 'Installation or fitting service',
    iconName: 'Building2',
  },
  {
    key: 'delivery' as CommercialProductType,
    type: 'delivery' as CommercialProductType,
    label: 'Delivery',
    label_bn: 'ডেলিভারি',
    description: 'Delivery / transport service',
    desc: 'Delivery / transport service',
    iconName: 'Truck',
  },
  {
    key: 'package' as CommercialProductType,
    type: 'package' as CommercialProductType,
    label: 'Package',
    label_bn: 'প্যাকেজ',
    description: 'Combination of products/services',
    desc: 'Combination of products/services',
    iconName: 'Boxes',
  },
]

export interface PricingPill {
  key: PricingMethod
  id: PricingMethod
  label: string
  label_bn: string
  unit: string
  symbol: string
  unit_label: string
}

export const PRICING_PILLS: PricingPill[] = [
  { key: 'fixed', id: 'fixed', label: 'Fixed Price', label_bn: 'নির্দিষ্ট মূল্য', unit: 'pcs', symbol: 'Fixed ৳', unit_label: '' },
  { key: 'per_piece', id: 'per_piece', label: 'Per Piece', label_bn: 'প্রতি পিস', unit: 'pcs', symbol: '৳ / piece', unit_label: '/ piece' },
  { key: 'per_area', id: 'per_area', label: 'Per Sqft', label_bn: 'প্রতি স্কয়ারফিট', unit: 'sft', symbol: '৳ / sqft', unit_label: '/ sqft' },
  { key: 'per_length', id: 'per_length', label: 'Per Ft', label_bn: 'প্রতি ফিট', unit: 'ft', symbol: '৳ / ft', unit_label: '/ ft' },
  { key: 'per_weight', id: 'per_weight', label: 'Per Kg', label_bn: 'প্রতি কেজি', unit: 'kg', symbol: '৳ / kg', unit_label: '/ kg' },
  { key: 'per_job', id: 'per_job', label: 'Per Job', label_bn: 'প্রতি কাজ', unit: 'job', symbol: '৳ / job', unit_label: '/ job' },
  { key: 'per_hour', id: 'per_hour', label: 'Per Hour', label_bn: 'প্রতি ঘণ্টা', unit: 'hr', symbol: '৳ / hour', unit_label: '/ hour' },
  { key: 'formula', id: 'formula', label: 'Formula', label_bn: 'ফর্মুলা', unit: 'sft', symbol: 'Formula ৳', unit_label: '/ formula unit' },
]

export const PRODUCT_TYPE_DEFAULT_MAP: Record<
  CommercialProductType,
  {
    pricing_method: PricingMethod
    selling_unit: string
    requires_production: boolean
    product_type: ProductType
  }
> = {
  production_product: {
    pricing_method: 'per_area',
    selling_unit: 'sft',
    requires_production: true,
    product_type: 'print_service',
  },
  ready_product: {
    pricing_method: 'per_piece',
    selling_unit: 'piece',
    requires_production: false,
    product_type: 'ready_product',
  },
  service: {
    pricing_method: 'per_job',
    selling_unit: 'job',
    requires_production: false,
    product_type: 'service',
  },
  finishing: {
    pricing_method: 'per_area',
    selling_unit: 'sft',
    requires_production: false,
    product_type: 'service',
  },
  fabrication: {
    pricing_method: 'per_area',
    selling_unit: 'sft',
    requires_production: true,
    product_type: 'fabrication',
  },
  installation: {
    pricing_method: 'per_job',
    selling_unit: 'job',
    requires_production: false,
    product_type: 'installation',
  },
  delivery: {
    pricing_method: 'fixed',
    selling_unit: 'job',
    requires_production: false,
    product_type: 'delivery',
  },
  package: {
    pricing_method: 'fixed',
    selling_unit: 'job',
    requires_production: false,
    product_type: 'ready_product',
  },
  package_bundle: {
    pricing_method: 'fixed',
    selling_unit: 'job',
    requires_production: false,
    product_type: 'ready_product',
  },
  material: {
    pricing_method: 'per_piece',
    selling_unit: 'piece',
    requires_production: false,
    product_type: 'material',
  },
  additional: {
    pricing_method: 'per_piece',
    selling_unit: 'piece',
    requires_production: false,
    product_type: 'ready_product',
  },
}

export const PRICING_METHOD_DEFAULT_MAP: Record<string, { selling_unit: string; unit_label: string }> = {
  per_area: { selling_unit: 'sqft', unit_label: '/ sqft' },
  per_piece: { selling_unit: 'piece', unit_label: '/ piece' },
  per_job: { selling_unit: 'job', unit_label: '/ job' },
  per_hour: { selling_unit: 'hour', unit_label: '/ hour' },
  per_length: { selling_unit: 'ft', unit_label: '/ ft' },
  per_weight: { selling_unit: 'kg', unit_label: '/ kg' },
  fixed: { selling_unit: 'job', unit_label: '' },
  formula: { selling_unit: 'sqft', unit_label: '/ sqft' },
  per_volume: { selling_unit: 'liter', unit_label: '/ liter' },
}
