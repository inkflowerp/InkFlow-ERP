import { createClient } from '../supabase/server.ts'
import type { JobCostingRecord, CostHeads } from '../../types/costing.types.ts'
import { measureAsync } from '../performance/logger.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class CostingRepository {
  static async getCostings(companyId: string): Promise<JobCostingRecord[]> {
    return measureAsync(`CostingRepository.getCostings(${companyId})`, async () => {
      try {
        const supabase = await createClient()
        const { data, error } = await (supabase as any)
          .from('job_costings')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          return data.map(this.mapFromDb)
        }
      } catch {}

      const costings = PrintERPDataStore.get<JobCostingRecord[]>(STORAGE_KEYS.JOB_COSTINGS) || []
      return costings.filter((c) => !c.company_id || c.company_id === companyId)
    })
  }

  static async getCostingById(id: string, companyId: string): Promise<JobCostingRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('job_costings')
        .select('*')
        .or(`id.eq.${id},job_number.eq.${id}`)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return this.mapFromDb(data)
      }
    } catch {}

    const costings = await this.getCostings(companyId)
    return costings.find((c) => c.id === id || c.job_number === id || c.job_id === id || c.job_order_id === id) || null
  }

  static async getJobCostingByJobId(jobId: string, companyId: string): Promise<JobCostingRecord | null> {
    return this.getCostingById(jobId, companyId)
  }

  static async createCosting(costing: Partial<JobCostingRecord> & {
    company_id: string
    job_number: string
    customer_id: string
    customer_name: string
    item_title: string
    selling_price: number
  }): Promise<JobCostingRecord> {
    const id = costing.id || `cst-${Date.now()}`
    const record: JobCostingRecord = {
      id,
      company_id: costing.company_id,
      branch_id: costing.branch_id || null,
      job_id: costing.job_id || null,
      job_order_id: costing.job_order_id || null,
      sales_order_id: costing.sales_order_id || null,
      quotation_id: costing.quotation_id || null,
      product_id: costing.product_id || null,
      job_number: costing.job_number,
      customer_id: costing.customer_id,
      customer_name: costing.customer_name,
      item_title: costing.item_title,
      dimensions_spec: costing.dimensions_spec || '10ft × 4ft',
      quantity: Number(costing.quantity) || 1,
      unit: costing.unit || 'pcs',
      selling_price: Number(costing.selling_price) || 0,
      est: costing.est || {
        material_cost: 0,
        machine_cost: 0,
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
      act: costing.act || {
        material_cost: 0,
        machine_cost: 0,
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
      variances: costing.variances || {
        material_variance: 0,
        machine_variance: 0,
        labor_variance: 0,
        finishing_variance: 0,
        transport_variance: 0,
        total_variance: 0,
      },
      costing_snapshot: costing.costing_snapshot || {},
      labor_cost_mode: costing.labor_cost_mode || 'hourly',
      status: costing.status || 'estimated',
      notes: costing.notes || null,
      created_by: costing.created_by || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const dbPayload = this.mapToDb(record)
      const { data: inserted, error } = await (supabase as any)
        .from('job_costings')
        .insert(dbPayload)
        .select()
        .single()

      if (!error && inserted) {
        const mapped = this.mapFromDb(inserted)
        PrintERPDataStore.addItem(STORAGE_KEYS.JOB_COSTINGS, mapped)
        return mapped
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.JOB_COSTINGS, record)
    return record
  }

  static async updateCosting(id: string, updates: Partial<JobCostingRecord>, companyId: string): Promise<JobCostingRecord> {
    const existing = await this.getCostingById(id, companyId)
    if (!existing) throw new Error(`Costing record ${id} not found`)

    const updated: JobCostingRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    }

    // Recalculate variances
    const estTotal = updated.est?.total_cost || 0
    const actTotal = updated.act?.total_cost || 0
    updated.variances = {
      material_variance: (updated.act?.material_cost || 0) - (updated.est?.material_cost || 0),
      machine_variance: (updated.act?.machine_cost || 0) - (updated.est?.machine_cost || 0),
      labor_variance: (updated.act?.labor_cost || 0) - (updated.est?.labor_cost || 0),
      finishing_variance: (updated.act?.finishing_cost || 0) - (updated.est?.finishing_cost || 0),
      transport_variance: (updated.act?.transport_cost || 0) - (updated.est?.transport_cost || 0),
      total_variance: actTotal - estTotal,
    }

    try {
      const supabase = await createClient()
      const dbPayload = this.mapToDb(updated)
      delete dbPayload.id
      delete dbPayload.company_id

      const { data, error } = await (supabase as any)
        .from('job_costings')
        .update(dbPayload)
        .eq('id', id)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        const mapped = this.mapFromDb(data)
        PrintERPDataStore.updateItem<JobCostingRecord>(STORAGE_KEYS.JOB_COSTINGS, id, mapped)
        return mapped
      }
    } catch {}

    PrintERPDataStore.updateItem<JobCostingRecord>(STORAGE_KEYS.JOB_COSTINGS, id, updated)
    return updated
  }

  static async createJobCosting(costing: any): Promise<JobCostingRecord> {
    return this.createCosting(costing)
  }

  static async updateJobCosting(id: string, companyId: string, updates: Partial<JobCostingRecord>): Promise<JobCostingRecord> {
    return this.updateCosting(id, updates, companyId)
  }

  static async deleteCosting(id: string, companyId: string): Promise<boolean> {
    try {
      const supabase = await createClient()
      await (supabase as any)
        .from('job_costings')
        .delete()
        .eq('id', id)
        .eq('company_id', companyId)
    } catch {}

    return PrintERPDataStore.removeItem(STORAGE_KEYS.JOB_COSTINGS, id)
  }

  private static mapToDb(record: JobCostingRecord): any {
    return {
      id: record.id,
      company_id: record.company_id,
      branch_id: record.branch_id,
      job_id: record.job_id,
      job_order_id: record.job_order_id,
      sales_order_id: record.sales_order_id,
      quotation_id: record.quotation_id,
      product_id: record.product_id,
      job_number: record.job_number,
      customer_id: record.customer_id,
      customer_name: record.customer_name,
      item_title: record.item_title,
      dimensions_spec: record.dimensions_spec,
      quantity: record.quantity,
      unit: record.unit,
      selling_price: record.selling_price,

      est_material_cost: record.est?.material_cost || 0,
      est_machine_cost: record.est?.machine_cost || 0,
      est_ink_cost: record.est?.ink_cost || 0,
      est_printing_cost: record.est?.printing_cost || 0,
      est_finishing_cost: record.est?.finishing_cost || 0,
      est_labor_cost: record.est?.labor_cost || 0,
      est_fabrication_cost: record.est?.fabrication_cost || 0,
      est_installation_cost: record.est?.installation_cost || 0,
      est_transport_cost: record.est?.transport_cost || 0,
      est_other_cost: record.est?.other_cost || 0,
      est_total_cost: record.est?.total_cost || 0,
      est_profit: record.est?.profit || 0,
      est_margin_percentage: record.est?.margin_percentage || 0,

      act_material_cost: record.act?.material_cost || 0,
      act_machine_cost: record.act?.machine_cost || 0,
      act_ink_cost: record.act?.ink_cost || 0,
      act_printing_cost: record.act?.printing_cost || 0,
      act_finishing_cost: record.act?.finishing_cost || 0,
      act_labor_cost: record.act?.labor_cost || 0,
      act_fabrication_cost: record.act?.fabrication_cost || 0,
      act_installation_cost: record.act?.installation_cost || 0,
      act_transport_cost: record.act?.transport_cost || 0,
      act_other_cost: record.act?.other_cost || 0,
      act_total_cost: record.act?.total_cost || 0,
      act_profit: record.act?.profit || 0,
      act_margin_percentage: record.act?.margin_percentage || 0,

      material_variance: record.variances?.material_variance || 0,
      labor_variance: record.variances?.labor_variance || 0,
      transport_variance: record.variances?.transport_variance || 0,
      total_variance: record.variances?.total_variance || 0,

      costing_snapshot: record.costing_snapshot || {},
      labor_cost_mode: record.labor_cost_mode || 'hourly',
      status: record.status || 'estimated',
      notes: record.notes,
      created_by: record.created_by,
      created_at: record.created_at,
      updated_at: record.updated_at,
    }
  }

  private static mapFromDb(db: any): JobCostingRecord {
    return {
      id: db.id,
      company_id: db.company_id,
      branch_id: db.branch_id,
      job_id: db.job_id,
      job_order_id: db.job_order_id,
      sales_order_id: db.sales_order_id,
      quotation_id: db.quotation_id,
      product_id: db.product_id,
      job_number: db.job_number,
      customer_id: db.customer_id,
      customer_name: db.customer_name,
      item_title: db.item_title || 'Print Job',
      dimensions_spec: db.dimensions_spec,
      quantity: Number(db.quantity) || 1,
      unit: db.unit || 'pcs',
      selling_price: Number(db.selling_price) || 0,
      est: {
        material_cost: Number(db.est_material_cost) || 0,
        machine_cost: Number(db.est_machine_cost) || 0,
        ink_cost: Number(db.est_ink_cost) || 0,
        printing_cost: Number(db.est_printing_cost) || 0,
        finishing_cost: Number(db.est_finishing_cost) || 0,
        labor_cost: Number(db.est_labor_cost) || 0,
        fabrication_cost: Number(db.est_fabrication_cost) || 0,
        installation_cost: Number(db.est_installation_cost) || 0,
        transport_cost: Number(db.est_transport_cost) || 0,
        other_cost: Number(db.est_other_cost) || 0,
        total_cost: Number(db.est_total_cost) || 0,
        profit: Number(db.est_profit) || 0,
        margin_percentage: Number(db.est_margin_percentage) || 0,
      },
      act: {
        material_cost: Number(db.act_material_cost) || 0,
        machine_cost: Number(db.act_machine_cost) || 0,
        ink_cost: Number(db.act_ink_cost) || 0,
        printing_cost: Number(db.act_printing_cost) || 0,
        finishing_cost: Number(db.act_finishing_cost) || 0,
        labor_cost: Number(db.act_labor_cost) || 0,
        fabrication_cost: Number(db.act_fabrication_cost) || 0,
        installation_cost: Number(db.act_installation_cost) || 0,
        transport_cost: Number(db.act_transport_cost) || 0,
        other_cost: Number(db.act_other_cost) || 0,
        total_cost: Number(db.act_total_cost) || 0,
        profit: Number(db.act_profit) || 0,
        margin_percentage: Number(db.act_margin_percentage) || 0,
      },
      variances: {
        material_variance: Number(db.material_variance) || 0,
        machine_variance: (Number(db.act_machine_cost) || 0) - (Number(db.est_machine_cost) || 0),
        labor_variance: Number(db.labor_variance) || 0,
        finishing_variance: (Number(db.act_finishing_cost) || 0) - (Number(db.est_finishing_cost) || 0),
        transport_variance: Number(db.transport_variance) || 0,
        total_variance: Number(db.total_variance) || 0,
      },
      costing_snapshot: db.costing_snapshot || {},
      labor_cost_mode: db.labor_cost_mode || 'hourly',
      status: db.status || 'estimated',
      notes: db.notes,
      created_by: db.created_by,
      created_at: db.created_at,
      updated_at: db.updated_at,
    }
  }
}
