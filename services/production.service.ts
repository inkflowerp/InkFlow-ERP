import {
  ProductionJobRecord,
  ProductionReworkRecord,
  ProductionDepartment,
  DepartmentKanbanColumn,
} from '@/types/production.types'

export function getDepartmentColumns(department: string): DepartmentKanbanColumn[] {
  switch (department) {
    case 'printing':
      return [
        { id: 'queued', title: 'Queued (অপেক্ষারত)', titleBn: 'অপেক্ষারত', statusMatch: ['queued', 'paused'] },
        { id: 'printing', title: 'Printing (প্রিন্ট চলছে)', titleBn: 'প্রিন্ট চলছে', statusMatch: ['in_progress'] },
        { id: 'completed', title: 'Completed (সম্পন্ন)', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
    case 'finishing':
      return [
        { id: 'queued', title: 'Queued (ফিনিশিং কিউ)', titleBn: 'ফিনিশিং কিউ', statusMatch: ['queued'] },
        { id: 'in_finishing', title: 'In Finishing (কাটিং/লেমিনেশন)', titleBn: 'কাটিং ও লেমিনেশন', statusMatch: ['in_progress', 'paused'] },
        { id: 'qc', title: 'Quality Check (কিউসি)', titleBn: 'কিউসি পরীক্ষা', statusMatch: ['quality_check', 'rework'] },
        { id: 'completed', title: 'Completed (ডেলিভারি রেডি)', titleBn: 'ডেলিভারি রেডি', statusMatch: ['completed'] },
      ]
    case 'fabrication':
      return [
        { id: 'queued', title: 'Queued (ওয়ার্কশপ কিউ)', titleBn: 'ওয়ার্কশপ কিউ', statusMatch: ['queued'] },
        { id: 'in_fab', title: 'In Fabrication (ওয়েল্ডিং/লেটার)', titleBn: 'ওয়েল্ডিং ও লেটার তৈরি', statusMatch: ['in_progress', 'paused'] },
        { id: 'qc', title: 'Wiring & QC (এলইডি টেস্ট)', titleBn: 'এলইডি টেস্ট', statusMatch: ['quality_check', 'rework'] },
        { id: 'completed', title: 'Completed (ফিটিং রেডি)', titleBn: 'ফিটিং রেডি', statusMatch: ['completed'] },
      ]
    case 'installation':
      return [
        { id: 'scheduled', title: 'Scheduled (শিডিউল্ড)', titleBn: 'শিডিউল্ড', statusMatch: ['queued'] },
        { id: 'en_route', title: 'En Route / On Site', titleBn: 'সাইটে টিম রওয়ানা', statusMatch: ['in_progress', 'paused'] },
        { id: 'installing', title: 'Installing (ফিটিং চলছে)', titleBn: 'ফিটিং চলছে', statusMatch: ['quality_check'] },
        { id: 'completed', title: 'Completed (হস্তান্তরিত)', titleBn: 'হস্তান্তরিত', statusMatch: ['completed'] },
      ]
    default:
      return [
        { id: 'queued', title: 'Queued', titleBn: 'কিউ', statusMatch: ['queued'] },
        { id: 'in_progress', title: 'In Progress (চলছে)', titleBn: 'চলছে', statusMatch: ['in_progress'] },
        { id: 'paused', title: 'Paused / QC (স্থগিত/কিউসি)', titleBn: 'স্থগিত/কিউসি', statusMatch: ['paused', 'quality_check', 'rework'] },
        { id: 'completed', title: 'Completed (সম্পন্ন)', titleBn: 'সম্পন্ন', statusMatch: ['completed'] },
      ]
  }
}



import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class ProductionService {
  static async getJobs(department?: string, companyId: string = 'c-01'): Promise<ProductionJobRecord[]> {
    const jobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    return jobs.filter((j) => {
      const matchCompany = !j.company_id || j.company_id === companyId
      const matchDept = !department || department === 'all' || j.department === department
      return matchCompany && matchDept
    })
  }

  static async getJobById(id: string, companyId: string = 'c-01'): Promise<ProductionJobRecord | null> {
    const jobs = await this.getJobs(undefined, companyId)
    return jobs.find((j) => j.id === id || j.production_job_number === id) || null
  }

  static async createJob(data: Partial<ProductionJobRecord>): Promise<ProductionJobRecord> {
    const id = data.id || `prd-${Date.now()}`
    const num = data.production_job_number || `PRD-${Date.now().toString().slice(-4)}`
    const newJob: ProductionJobRecord = {
      id,
      company_id: data.company_id || 'c-01',
      production_job_number: num,
      job_order_id: data.job_order_id || `job-${Date.now()}`,
      sales_order_id: data.sales_order_id || `ord-${Date.now()}`,
      customer_name: data.customer_name || 'Customer',
      product_name: data.product_name || 'Signage Item',
      department: data.department || 'printing',
      stage: data.stage || 'printing',
      status: data.status || 'queued',
      priority: data.priority || 'normal',
      deadline: data.deadline || 'Tomorrow 18:00',
      dimensions_spec: data.dimensions_spec || '10ft × 4ft',
      quantity: data.quantity || 1,
      material_spec: data.material_spec || 'Standard Media',
      production_instructions: data.production_instructions || 'Standard production.',
      assigned_workers: data.assigned_workers || ['Operator 1'],
      has_rework: false,
      rework_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_JOBS, newJob)
    return newJob
  }

  static async updateJob(id: string, data: Partial<ProductionJobRecord>): Promise<ProductionJobRecord | null> {
    return PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, id, data)
  }

  static async updateJobStatus(id: string, status: any, stage?: any): Promise<ProductionJobRecord | null> {
    const updates: Partial<ProductionJobRecord> = { status }
    if (stage) updates.stage = stage
    return PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, id, updates)
  }

  static async getReworks(): Promise<ProductionReworkRecord[]> {
    return PrintERPDataStore.get<ProductionReworkRecord[]>(STORAGE_KEYS.REWORKS) || []
  }

  static async logRework(rework: Partial<ProductionReworkRecord>): Promise<ProductionReworkRecord> {
    const id = rework.id || `rwk-${Date.now()}`
    const newRework: ProductionReworkRecord = {
      id,
      production_job_id: rework.production_job_id || '',
      rework_number: `RWK-${Date.now().toString().slice(-4)}`,
      reason: rework.reason || 'Quality re-processing',
      responsible_department: rework.responsible_department || 'printing',
      material_wastage: rework.material_wastage || 'Wasted material',
      extra_labor_hours: rework.extra_labor_hours || 1,
      additional_time_hours: rework.additional_time_hours || 1,
      estimated_wastage_cost: rework.estimated_wastage_cost || 1000,
      reported_by_name: rework.reported_by_name || 'Operator',
      status: 'in_rework',
      created_at: new Date().toLocaleString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.REWORKS, newRework)
    if (rework.production_job_id) {
      PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, rework.production_job_id, {
        has_rework: true,
        status: 'rework',
      })
    }
    return newRework
  }
}

