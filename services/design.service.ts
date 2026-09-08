// ==============================================================================
// PrintERP / InkFlow SaaS - Graphic Design & Vector Management Service
// Authoritative PostgreSQL persistence via DesignRepository
// ==============================================================================

import {
  DesignJobRecord,
  DesignVersionRecord,
  DesignFeedbackRecord,
  DesignFormat,
} from '@/types/design.types'
import { DesignRepository } from '@/lib/repositories/design.repository'

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

export class DesignService {
  static async getJobs(companyId: string): Promise<DesignJobRecord[]> {
    if (!companyId) return []
    return await DesignRepository.getDesignJobs(companyId)
  }

  static async getJobById(id: string, companyId: string): Promise<DesignJobRecord | null> {
    if (!id || !companyId) return null
    return await DesignRepository.getDesignJobById(id, companyId)
  }

  static async createJob(data: Partial<DesignJobRecord> & {
    company_id: string
    title: string
    customer_id: string
    customer_name: string
  }): Promise<DesignJobRecord> {
    if (!data.company_id) {
      throw new Error('Company context is required to create a design job.')
    }
    return await DesignRepository.createDesignJob(data)
  }

  static async addVersion(version: {
    company_id: string
    design_job_id: string
    version_number: number
    file_name: string
    file_url: string
    file_type?: string | null
    file_size_bytes?: number | null
    preview_url?: string | null
    notes?: string | null
    created_by_name: string
  }): Promise<DesignVersionRecord> {
    return await DesignRepository.addDesignVersion(version)
  }

  static async updateVersionApproval(params: {
    company_id: string
    version_id: string
    approval_status: 'approved' | 'rejected' | 'changes_requested'
    customer_feedback?: string | null
    design_job_id: string
  }): Promise<void> {
    return await DesignRepository.updateVersionApproval(params)
  }
}
