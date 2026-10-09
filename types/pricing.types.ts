import type { CustomerCategory, CustomerType } from './crm.types'
import type { PricingMethod, UnitOfMeasure, PricingFormulaConfig } from './product.types'
export type { PricingMethod, UnitOfMeasure, PricingFormulaConfig }


export type PricingCustomerType =
  | 'wholesale'
  | 'dealer'
  | 'corporate'
  | 'retail'
  | 'custom'
  | 'reseller'
  | 'agency'
  | 'government'
  | 'regular'

export interface CustomerTypeMeta {
  type: PricingCustomerType
  label: string
  labelBn: string
  description: string
  descriptionBn: string
  defaultStrategy: string
  badgeClass: string
}

export const CUSTOMER_TYPES_META: Record<PricingCustomerType, CustomerTypeMeta> = {
  wholesale: {
    type: 'wholesale',
    label: 'Wholesale',
    labelBn: 'পাইকারি',
    description: 'Bulk print buyers, large-volume traders & recurring contract orders.',
    descriptionBn: 'বাল্ক প্রিন্ট ক্রেতা এবং বড় ভলিউম পাইকারি অর্ডার।',
    defaultStrategy: 'Wholesale discount / volume rate',
    badgeClass: 'bg-primary/10 text-primary border-primary/20',
  },
  dealer: {
    type: 'dealer',
    label: 'Dealer',
    labelBn: 'ডিলার / রিসেলার',
    description: 'Authorized dealers, trade partners & print brokers.',
    descriptionBn: 'অনুমোদিত ডিলার, ট্রেড পার্টনার ও সাবকন্ট্রাক্টর।',
    defaultStrategy: 'Dealer rate / reseller margin',
    badgeClass: 'bg-accent text-accent-foreground border-border',
  },
  corporate: {
    type: 'corporate',
    label: 'Corporate',
    labelBn: 'কর্পোরেট একাউন্ট',
    description: 'Institutional accounts with negotiated contract rates and credit terms.',
    descriptionBn: 'কর্পোরেট ও প্রাতিষ্ঠানিক একাউন্ট। চুক্তিভিত্তিক নির্ধারিত রেট।',
    defaultStrategy: 'Contracted rate / periodic validity',
    badgeClass: 'bg-secondary text-secondary-foreground border-border',
  },
  retail: {
    type: 'retail',
    label: 'Retail',
    labelBn: 'ওয়াক-ইন / খুচরা',
    description: 'Walk-in & retail customers. Standard catalog margins apply.',
    descriptionBn: 'সাধারণ খুচরা খদ্দের। স্ট্যান্ডার্ড ক্যাটালগ রেট প্রযোজ্য।',
    defaultStrategy: 'Standard price / high margin',
    badgeClass: 'bg-success-surface text-success border-success-border',
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    labelBn: 'কাস্টম রেট',
    description: 'Custom negotiated rate, VIP discount or special contract pricing.',
    descriptionBn: 'বিশেষ সমঝোতামূলক দর বা ক্লায়েন্ট নির্ধারিত কাস্টম রেট।',
    defaultStrategy: 'Custom negotiated / contract override',
    badgeClass: 'bg-warning-surface text-warning border-warning-border',
  },
  reseller: {
    type: 'reseller',
    label: 'Reseller',
    labelBn: 'রিসেলার / ডিলার',
    description: 'Subcontractors, printers & resellers with volume expectations.',
    descriptionBn: 'রিসেলার ও প্রিন্টিং সাবকন্ট্রাক্টর। পাইকারি ভলিউম রেট।',
    defaultStrategy: 'Wholesale discount / volume rate',
    badgeClass: 'bg-accent text-accent-foreground border-border',
  },
  agency: {
    type: 'agency',
    label: 'Agency',
    labelBn: 'বিজ্ঞাপন সংস্থা / ডিজাইন',
    description: 'Ad agencies & design firms with recurring creative production projects.',
    descriptionBn: 'বিজ্ঞাপন সংস্থা ও ডিজাইন হাউস। নিয়মিত প্রোডাকশন রেট।',
    defaultStrategy: 'Partner rate / project margin',
    badgeClass: 'bg-muted text-foreground border-border',
  },
  government: {
    type: 'government',
    label: 'Government',
    labelBn: 'সরকারি / দরপত্র',
    description: 'Government ministries, tenders & public sector contract procurement.',
    descriptionBn: 'সরকারি ও দরপত্র প্রকল্প। টেন্ডার ও স্পেসিফিকেশন রেট।',
    defaultStrategy: 'Tender rate / contract specific',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  regular: {
    type: 'regular',
    label: 'Regular',
    labelBn: 'নিয়মিত গ্রাহক',
    description: 'Frequent returning clients with relationship loyalty pricing.',
    descriptionBn: 'নিয়মিত ও বিশ্বস্ত খদ্দের। লয়ালটি বিশেষ রেট।',
    defaultStrategy: 'Loyalty discount / standard override',
    badgeClass: 'bg-card text-foreground border-border',
  },
}

export type PricingRuleType =
  | 'fixed_price'
  | 'unit_rate'
  | 'percentage_adjustment'
  | 'fixed_adjustment'
  | 'tiered'
  | 'formula'

export type MarginBasis = 'margin' | 'markup'

export type RoundingRule =
  | 'none'
  | 'round_1'
  | 'round_5'
  | 'round_10'
  | 'ceil_5'
  | 'floor_5'
  | 'round_2_decimals'

export type PricingRuleStatus =
  | 'draft'
  | 'active'
  | 'scheduled'
  | 'expired'
  | 'inactive'
  | 'pending_approval'

export interface PricingTierRange {
  min_qty: number
  max_qty?: number | null
  unit_price: number
  notes?: string
}

export interface PricingRuleRecord {
  id: string
  company_id: string
  product_id?: string | null
  product_name?: string | null
  product_sku?: string | null
  category?: string | null
  customer_type: PricingCustomerType
  customer_id?: string | null
  pricing_rule_type: PricingRuleType
  pricing_method: PricingMethod
  base_price: number
  adjustment_type?: 'percentage' | 'fixed' | 'none'
  adjustment_value?: number // e.g. -16 (for -16%) or -4 (for -৳4)
  fixed_price?: number | null
  calculated_price: number
  currency: string
  target_margin?: number | null
  margin_basis: MarginBasis
  rounding_rule: RoundingRule
  minimum_billable_quantity?: number | null
  minimum_charge?: number | null
  tier_ranges?: PricingTierRange[] | null
  formula_config?: PricingFormulaConfig | null
  effective_from?: string | null
  effective_until?: string | null
  status: PricingRuleStatus
  notes?: string | null
  requires_approval: boolean
  approved_by?: string | null
  approved_at?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface PricingRuleInput {
  product_id?: string | null
  category?: string | null
  customer_type: PricingCustomerType
  customer_id?: string | null
  pricing_rule_type: PricingRuleType
  pricing_method?: PricingMethod
  base_price?: number
  adjustment_type?: 'percentage' | 'fixed' | 'none'
  adjustment_value?: number
  fixed_price?: number | null
  calculated_price?: number
  currency?: string
  target_margin?: number | null
  margin_basis?: MarginBasis
  rounding_rule?: RoundingRule
  minimum_billable_quantity?: number | null
  minimum_charge?: number | null
  tier_ranges?: PricingTierRange[] | null
  formula_config?: PricingFormulaConfig | null
  effective_from?: string | null
  effective_until?: string | null
  status?: PricingRuleStatus
  notes?: string | null
}

export interface BulkPricingPayload {
  customer_type: PricingCustomerType
  product_ids: string[]
  adjustment_type: 'percentage' | 'fixed' | 'fixed_price'
  adjustment_value: number
  pricing_rule_type?: PricingRuleType
  rounding_rule?: RoundingRule
  effective_from?: string | null
  effective_until?: string | null
  notes?: string | null
  override_existing?: boolean
}

export interface CopyPricingPayload {
  source_customer_type: PricingCustomerType
  target_customer_type: PricingCustomerType
  adjustment_percent?: number // e.g. -5 to reduce by 5%, +5 to increase by 5%
  product_ids?: string[] // optional filter, otherwise all
  override_existing?: boolean
  notes?: string | null
}

export interface ResolvePriceParams {
  productId: string
  customerType?: PricingCustomerType | string
  customerId?: string
  quantity?: number
  width?: number
  height?: number
  dimensionUnit?: 'ft' | 'inch' | 'm'
  options?: {
    allowFloorOverride?: boolean
    overrideReason?: string
    authorizedBy?: string
  }
}

export interface ResolvedPriceResult {
  productId: string
  productName: string
  sku: string
  unit: string
  customerType: PricingCustomerType
  customerId?: string
  basePrice: number
  effectiveUnitPrice: number
  pricingRuleId?: string
  pricingRuleType: PricingRuleType
  pricingMethod: PricingMethod
  source: 'customer_specific' | 'customer_type' | 'product_default' | 'fallback'
  sourceLabel: string
  sourceDetails: string
  minimumBillableQuantity: number
  minimumCharge: number
  appliedAdjustment?: {
    type: 'percentage' | 'fixed'
    value: number
  }
  appliedTier?: PricingTierRange
  roundedFrom?: number
  effectiveFrom?: string | null
  effectiveUntil?: string | null
  timestamp: string
}

export interface PriceSnapshotRecord {
  product_id: string
  product_name: string
  sku: string
  customer_type: PricingCustomerType
  customer_id?: string | null
  pricing_rule_id?: string | null
  pricing_method: string
  base_price: number
  adjustment_type?: string | null
  adjustment_value?: number | null
  resolved_unit_price: number
  quantity: number
  billing_unit: string
  minimum_billable_quantity: number
  minimum_charge: number
  minimum_charge_applied: boolean
  discount_percent: number
  discount_amount: number
  final_line_price: number
  pricing_timestamp: string
  override_info?: {
    is_overridden: boolean
    original_price: number
    override_price: number
    override_by?: string
    override_time?: string
    override_reason?: string
  }
}

export interface PricingSummaryStats {
  totalRulesCount: number
  productsWithCustomPricingCount: number
  servicesWithCustomPricingCount: number
  configuredCustomerTypesCount: number
  productsUsingDefaultCount: number
  activeRulesCount: number
  scheduledRulesCount: number
  expiredRulesCount: number
}

export interface PricingMatrixRow {
  productId: string
  productName: string
  productSku: string
  category: string
  productType: string
  unit: string
  baseCost: number
  defaultSellingPrice: number
  prices: Record<
    PricingCustomerType,
    {
      price: number
      ruleId?: string
      ruleType: PricingRuleType
      hasCustomRule: boolean
      adjustmentText?: string
      status?: PricingRuleStatus
    }
  >
}
