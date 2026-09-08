import { JobCostingRecord } from '@/types/costing.types'

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
    isSafeMargin: finalMargin >= 20, // Company threshold: 20% minimum safety margin
  }
}



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class CostingService {
  static async getCostings(companyId: string = 'c-01'): Promise<JobCostingRecord[]> {
    const costings = PrintERPDataStore.get<JobCostingRecord[]>(STORAGE_KEYS.JOB_COSTINGS) || []
    return costings.filter((c) => !c.company_id || c.company_id === companyId)
  }

  static async getCostingById(id: string, companyId: string = 'c-01'): Promise<JobCostingRecord | null> {
    const costings = await this.getCostings(companyId)
    return costings.find((c) => c.id === id || c.job_number === id) || null
  }

  static async createCosting(data: Partial<JobCostingRecord>): Promise<JobCostingRecord> {
    const id = data.id || `cst-${Date.now()}`
    const newCosting: JobCostingRecord = {
      id,
      company_id: data.company_id || 'c-01',
      job_id: data.job_id || `job-${Date.now()}`,
      job_number: data.job_number || `PRD-2024-${Math.floor(Math.random() * 900) + 100}`,
      customer_id: data.customer_id || 'cust-01',
      customer_name: data.customer_name || 'Customer',
      item_title: data.item_title || 'Custom Print & Fabrication Job',
      dimensions_spec: data.dimensions_spec || '10ft × 4ft',
      selling_price: data.selling_price || 10000,
      est: data.est || {
        material_cost: 3000,
        ink_cost: 1000,
        printing_cost: 800,
        finishing_cost: 500,
        labor_cost: 1000,
        fabrication_cost: 0,
        installation_cost: 1000,
        transport_cost: 500,
        other_cost: 200,
        total_cost: 8000,
        profit: 2000,
        margin_percentage: 20.0,
      },
      act: data.act || {
        material_cost: 0,
        ink_cost: 0,
        printing_cost: 0,
        finishing_cost: 0,
        labor_cost: 0,
        fabrication_cost: 0,
        installation_cost: 0,
        transport_cost: 0,
        other_cost: 0,
        total_cost: 0,
        profit: 0,
        margin_percentage: 0,
      },
      variances: data.variances || {
        material_variance: 0,
        labor_variance: 0,
        transport_variance: 0,
        total_variance: 0,
      },
      labor_cost_mode: data.labor_cost_mode || 'hourly',
      status: data.status || 'estimated',
      notes: data.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_COSTINGS, newCosting)
    return newCosting
  }

  static async updateCosting(id: string, data: Partial<JobCostingRecord>): Promise<JobCostingRecord | null> {
    return PrintERPDataStore.updateItem<JobCostingRecord>(STORAGE_KEYS.JOB_COSTINGS, id, data)
  }

  static async deleteCosting(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.JOB_COSTINGS, id)
  }
}

