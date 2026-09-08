import {
  DesignJobRecord,
  DesignVersionRecord,
  DesignFeedbackRecord,
  DesignFormat,
} from '@/types/design.types'

export function isRenderableFormat(format: DesignFormat): boolean {
  return ['jpg', 'png', 'svg', 'pdf'].includes(format.toLowerCase())
}

export function getFormatBadgeColor(format: DesignFormat): string {
  switch (format.toLowerCase()) {
    case 'ai':
      return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300'
    case 'psd':
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
    case 'cdr':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
    case 'pdf':
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
    case 'svg':
      return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
    case 'zip':
      return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
    default:
      return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950 dark:text-cyan-300'
  }
}

import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export class DesignService {
  static async getJobs(companyId: string = 'c-01'): Promise<DesignJobRecord[]> {
    const jobs = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    return jobs.filter((j) => !j.company_id || j.company_id === companyId)
  }

  static async getJobById(id: string, companyId: string = 'c-01'): Promise<DesignJobRecord | null> {
    const jobs = await this.getJobs(companyId)
    return jobs.find((j) => j.id === id || j.design_number === id) || null
  }

  static async createJob(data: Partial<DesignJobRecord>): Promise<DesignJobRecord> {
    const id = data.id || `dsn-${Date.now()}`
    const num = data.design_number || `DSN-2024-00${Math.floor(Math.random() * 900) + 100}`
    const newJob: DesignJobRecord = {
      id,
      company_id: data.company_id || 'c-01',
      design_number: num,
      customer_id: data.customer_id || 'cust-01',
      customer_name: data.customer_name || 'Customer',
      title: data.title || 'Graphic Design & Vector Prep',
      designer_id: data.designer_id || 'u-des-01',
      designer_name: data.designer_name || 'Lead Designer',
      priority: data.priority || 'normal',
      status: data.status || 'designing',
      deadline: data.deadline || 'Tomorrow 18:00',
      instructions: data.instructions || 'Prepare print-ready vectors.',
      dimensions_spec: data.dimensions_spec || '10ft × 4ft',
      current_version: 1,
      revision_count: 0,
      is_locked: false,
      versions: data.versions || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, newJob)
    return newJob
  }

  static async updateJob(id: string, data: Partial<DesignJobRecord>): Promise<DesignJobRecord | null> {
    return PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, id, data)
  }

  static async updateJobStatus(id: string, status: any): Promise<DesignJobRecord | null> {
    return PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, id, { status })
  }

  static async deleteJob(id: string): Promise<boolean> {
    return PrintERPDataStore.removeItem(STORAGE_KEYS.DESIGN_JOBS, id)
  }
}

