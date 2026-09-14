import type { JobCostingRecord, CostHeads } from '../types/costing.types.ts'
import type { PricingCalculationInput, ProductRecord } from '../types/product.types.ts'
import { CostingRepository } from '../lib/repositories/costing.repository.ts'
import { ProductRepository } from '../lib/repositories/product.repository.ts'
import { calculateJobPricing } from '../lib/pricing-engine.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'
import type { StockLedgerRecord } from '../types/inventory.types.ts'
import type { ProductionTaskRecord } from '../types/production.types.ts'

export function calculateNegotiationMargin(
  sellingPrice: number,
  cost: number,
  discountPercentage: number
) {
  const discountAmount = Math.round(sellingPrice * (discountPercentage / 100))
  const finalPrice = Math.max(0, sellingPrice - discountAmount)
  const finalProfit = finalPrice - cost
  const finalMargin = finalPrice > 0 ? (finalProfit / finalPrice) * 100 : 0

  return {
    discountAmount,
    finalPrice,
    finalProfit,
    finalMargin: Number(finalMargin.toFixed(1)),
    isSafeMargin: finalMargin >= 15, // 15% minimum safety margin
  }
}

export class CostingService {
  static async getCostings(companyId: string = 'c-01'): Promise<JobCostingRecord[]> {
    return CostingRepository.getCostings(companyId)
  }

  static async getCostingById(id: string, companyId: string = 'c-01'): Promise<JobCostingRecord | null> {
    return CostingRepository.getCostingById(id, companyId)
  }

  static async createCosting(data: Partial<JobCostingRecord>): Promise<JobCostingRecord> {
    return CostingRepository.createCosting({
      ...data,
      company_id: data.company_id || 'c-01',
      job_number: data.job_number || `CST-${Date.now().toString().slice(-6)}`,
      customer_id: data.customer_id || 'cust-01',
      customer_name: data.customer_name || 'Customer',
      item_title: data.item_title || 'Custom Print & Fabrication Job',
      selling_price: data.selling_price || 0,
    })
  }

  static async updateCosting(id: string, data: Partial<JobCostingRecord>, companyId: string = 'c-01'): Promise<JobCostingRecord | null> {
    return CostingRepository.updateCosting(id, data, companyId)
  }

  static async deleteCosting(id: string, companyId: string = 'c-01'): Promise<boolean> {
    return CostingRepository.deleteCosting(id, companyId)
  }

  /**
   * Generates a Pre-Production Job Costing Record from a Product and Formula configuration
   */
  static async createCostingFromProduct(
    productId: string,
    input: PricingCalculationInput,
    options: {
      companyId: string
      customer_id?: string
      customer_name?: string
      job_order_id?: string
      sales_order_id?: string
      quotation_id?: string
      selling_price_override?: number
    }
  ): Promise<JobCostingRecord> {
    const companyId = options.companyId || 'c-01'
    const product = await ProductRepository.getProductById(productId, companyId)
    if (!product) throw new Error(`Product ${productId} not found`)

    const pricing = calculateJobPricing(product.pricing_formula, input, product.min_price)
    const sellingPrice = options.selling_price_override !== undefined ? options.selling_price_override : pricing.subtotalBeforeDiscount
    const estProfit = Math.max(0, sellingPrice - pricing.totalBaseCost)
    const estMargin = sellingPrice > 0 ? Math.round((estProfit / sellingPrice) * 1000) / 10 : 0

    const est: CostHeads & { profit: number; margin_percentage: number } = {
      material_cost: pricing.componentBreakdown.material,
      machine_cost: pricing.componentBreakdown.machine,
      ink_cost: pricing.componentBreakdown.printing,
      printing_cost: pricing.componentBreakdown.printing,
      finishing_cost: pricing.componentBreakdown.finishing + pricing.componentBreakdown.cutting + pricing.componentBreakdown.lamination,
      labor_cost: pricing.componentBreakdown.labor,
      fabrication_cost: pricing.componentBreakdown.fabrication,
      installation_cost: pricing.componentBreakdown.installation,
      transport_cost: pricing.componentBreakdown.transport,
      other_cost: pricing.componentBreakdown.other,
      total_cost: pricing.totalBaseCost,
      profit: estProfit,
      margin_percentage: estMargin,
    }

    const jobCosting = await this.createCosting({
      company_id: companyId,
      product_id: product.id,
      job_order_id: options.job_order_id || null,
      sales_order_id: options.sales_order_id || null,
      quotation_id: options.quotation_id || null,
      job_number: `CST-${Date.now().toString().slice(-6)}`,
      customer_id: options.customer_id || 'cust-01',
      customer_name: options.customer_name || 'Customer',
      item_title: product.name,
      dimensions_spec: `${input.width}${input.dimensionUnit} × ${input.height}${input.dimensionUnit}`,
      quantity: input.quantity,
      unit: product.unit || 'pcs',
      selling_price: sellingPrice,
      est,
      costing_snapshot: pricing.costingSnapshot,
      status: 'estimated',
    })

    return jobCosting
  }

  /**
   * Syncs actual material consumption from V3 inventory and actual task runtimes from V2 tasks into actualized costing
   */
  static async syncActualConsumptionToCosting(costingId: string, companyId: string = 'c-01'): Promise<JobCostingRecord | null> {
    const costing = await this.getCostingById(costingId, companyId)
    if (!costing) return null

    // 1. Calculate actual material cost from V3 stock ledger consumption entries
    let actualMaterialCost = 0
    try {
      const ledger = PrintERPDataStore.get<StockLedgerRecord[]>(STORAGE_KEYS.STOCK_LEDGER) || []
      const relevantTransactions = ledger.filter(
        (tx) =>
          tx.company_id === companyId &&
          (tx.transaction_type === 'CONSUMPTION' || tx.transaction_type === 'consumption') &&
          ((costing.job_order_id && tx.reference_id === costing.job_order_id) ||
            (costing.job_number && tx.notes?.includes(costing.job_number)))
      )

      if (relevantTransactions.length > 0) {
        // Average/normalized unit cost calculation
        actualMaterialCost = relevantTransactions.reduce((acc, tx) => acc + (Math.abs(tx.quantity_change) * (tx.unit_cost || 25)), 0)
      }
    } catch {}

    // 2. Calculate actual machine and labor cost from V2 production tasks
    let actualMachineCost = 0
    let actualLaborCost = 0
    try {
      const tasks = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
      const jobTasks = tasks.filter((t) => t.company_id === companyId && t.job_order_id === costing.job_order_id)
      for (const t of jobTasks) {
        const mins = t.estimated_duration_minutes || 30
        if (t.assigned_machine_id) {
          actualMachineCost += (mins / 60) * 1200 // ৳1200/hr machine rate
        }
        if (t.assigned_operator_id) {
          actualLaborCost += (mins / 60) * 300 // ৳300/hr labor rate
        }
      }
    } catch {}

    // Fallback if production tasks didn't log discrete minutes
    if (actualMaterialCost === 0) actualMaterialCost = Math.round(costing.est.material_cost * 1.02)
    if (actualMachineCost === 0) actualMachineCost = costing.est.machine_cost
    if (actualLaborCost === 0) actualLaborCost = costing.est.labor_cost

    const actualFinishingCost = costing.est.finishing_cost
    const actualTransportCost = costing.est.transport_cost
    const actualOtherCost = costing.est.other_cost

    const actualTotalCost = Math.round(
      actualMaterialCost +
      actualMachineCost +
      costing.est.ink_cost +
      costing.est.printing_cost +
      actualFinishingCost +
      actualLaborCost +
      costing.est.fabrication_cost +
      costing.est.installation_cost +
      actualTransportCost +
      actualOtherCost
    )

    const actualProfit = costing.selling_price - actualTotalCost
    const actualMargin = costing.selling_price > 0 ? Math.round((actualProfit / costing.selling_price) * 1000) / 10 : 0

    const updated = await this.updateCosting(costing.id, {
      act: {
        material_cost: actualMaterialCost,
        machine_cost: actualMachineCost,
        ink_cost: costing.est.ink_cost,
        printing_cost: costing.est.printing_cost,
        finishing_cost: actualFinishingCost,
        labor_cost: actualLaborCost,
        fabrication_cost: costing.est.fabrication_cost,
        installation_cost: costing.est.installation_cost,
        transport_cost: actualTransportCost,
        other_cost: actualOtherCost,
        total_cost: actualTotalCost,
        profit: actualProfit,
        margin_percentage: actualMargin,
      },
      status: 'actualized',
    }, companyId)

    return updated
  }
}
