import type {
  ProductionJobRecord,
  ProductionReworkRecord,
  DepartmentKanbanColumn,
  ProductionTaskRecord,
  MachineQueueGroup,
} from '../types/production.types.ts'
import { ProductionRepository } from '../lib/repositories/production.repository.ts'

export interface ProductionKpiMetrics {
  totalTasks: number
  runningNow: number
  queuedReady: number
  onHold: number
  completedToday: number
  activeMachines: number
  totalMachines: number
  urgentCount: number
}

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

export class ProductionService {
  static async getJobs(department?: string, companyId?: string): Promise<ProductionJobRecord[]> {
    if (!companyId) return []
    try {
      const jobs = await ProductionRepository.getProductionJobs(companyId)
      if (!department || department === 'all') return jobs
      return jobs.filter((j) => j.department === department)
    } catch (error) {
      console.error('Error in ProductionService.getJobs:', error)
      throw error
    }
  }

  static async getJobById(id: string, companyId: string): Promise<ProductionJobRecord | null> {
    if (!companyId || !id) return null
    try {
      return await ProductionRepository.getProductionJobById(id, companyId)
    } catch (error) {
      console.error('Error in ProductionService.getJobById:', error)
      throw error
    }
  }

  static async createJob(data: {
    company_id: string
    title: string
    customer_name: string
    quantity: number
    [key: string]: any
  }): Promise<ProductionJobRecord> {
    if (!data.company_id) throw new Error('Company ID is required to create a production job')
    if (!data.title) throw new Error('Job title is required')
    if (!data.customer_name) throw new Error('Customer name is required')
    if (!data.quantity || data.quantity <= 0) throw new Error('Quantity must be greater than 0')

    return await ProductionRepository.createProductionJob({
      ...data,
      company_id: data.company_id,
      title: data.title,
      customer_name: data.customer_name,
      quantity: data.quantity,
    })
  }

  static async updateJobStatus(
    id: string,
    status: 'queued' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled',
    companyId: string,
    extraUpdates?: Partial<ProductionJobRecord>
  ): Promise<ProductionJobRecord> {
    if (!companyId) throw new Error('Company ID is required')
    return await ProductionRepository.updateJobStatus(id, status, companyId, extraUpdates)
  }

  static async logRework(rework: {
    company_id: string
    production_job_id: string
    reason: string
    rework_quantity: number
    estimated_cost?: number
    reported_by_name: string
  }): Promise<ProductionReworkRecord> {
    if (!rework.company_id) throw new Error('Company ID is required')
    if (!rework.production_job_id) throw new Error('Production Job ID is required')
    if (!rework.reason) throw new Error('Rework reason is required')

    return await ProductionRepository.recordRework(rework)
  }

  /**
   * Calculates comprehensive operational and machine utilization KPIs for the Press Shop Floor.
   */
  static calculateProductionKpis(
    tasks: ProductionTaskRecord[] = [],
    machineQueues: MachineQueueGroup[] = []
  ): ProductionKpiMetrics {
    const todayStr = new Date().toISOString().split('T')[0]

    let runningNow = 0
    let queuedReady = 0
    let onHold = 0
    let completedToday = 0
    let urgentCount = 0

    for (const task of tasks) {
      if (task.status === 'in_progress') {
        runningNow++
      } else if (task.status === 'queued' || task.status === 'scheduled' || task.status === 'ready') {
        queuedReady++
      } else if (task.status === 'on_hold' || task.hold_reason || task.status === 'rework') {
        onHold++
      } else if (task.status === 'completed') {
        const completedDateStr = task.completed_at || task.actual_end || ''
        const completedDate = completedDateStr ? completedDateStr.split('T')[0] : ''
        if (completedDate === todayStr || !completedDate) {
          completedToday++
        }
      }

      if (task.priority === 'urgent' || task.priority === 'very_urgent') {
        urgentCount++
      }
    }

    const activeMachines = machineQueues.filter(
      (m) => m.operating_status === 'in_use' || m.now !== null
    ).length

    return {
      totalTasks: tasks.length,
      runningNow,
      queuedReady,
      onHold,
      completedToday,
      activeMachines,
      totalMachines: machineQueues.length,
      urgentCount,
    }
  }

  /**
   * Generates a respectful, culturally-attuned Bengali WhatsApp message
   * updating customers or sales reps on live factory press floor execution.
   */
  static generateBangladeshiFloorWhatsAppMessage(
    task: ProductionTaskRecord,
    companyName: string = 'InkFlow Digital & Offset Press'
  ): string {
    const customer = task.customer_name || 'সম্মানিত গ্রাহক'
    const jobNo = task.job_number || task.task_number || 'JOB-0000'
    const productName = task.task_name || 'প্রিন্টিং অর্ডার'
    const qty = `${task.quantity || 1} ${task.unit || 'pcs'}`
    const machine = task.assigned_machine_name || 'ফ্যাক্টরি ফ্লোর'
    const media = task.required_material || 'প্রেস স্ট্যান্ডার্ড মিডিয়া'
    
    let dimensions = ''
    if (task.width && task.height) {
      dimensions = `\n• সাইজ ও মাপ: ${task.width} × ${task.height} ${task.dimension_unit || task.unit || 'inch'}`
    }

    let statusBangla = 'প্রোডাকশনে অপেক্ষারত'
    if (task.status === 'in_progress') {
      statusBangla = `⚙️ মেশিনে চলমান (Machine: ${machine})`
    } else if (task.status === 'completed') {
      statusBangla = '✅ প্রোডাকশন ও কোয়ালিটি চেক সম্পন্ন (Ready for Delivery/Finishing)'
    } else if (task.status === 'on_hold') {
      statusBangla = `⚠️ সাময়িক স্থগিত (${task.hold_reason || 'কাস্টমার কনফার্মেশন/মিডিয়া অপেক্ষমান'})`
    } else if (task.status === 'scheduled' || task.status === 'ready') {
      statusBangla = `📅 শিডিউল সম্পন্ন (মেশিন: ${machine})`
    }

    const operator = task.assigned_operator_name || task.operator_name ? `\n• দায়িত্বপ্রাপ্ত অপারেটর: ${task.assigned_operator_name || task.operator_name}` : ''

    return `আসসালামু আলাইকুম, *${customer}*।
*${companyName}* এর কারখানা থেকে আপনার অর্ডারের প্রোডাকশন আপডেট:

📋 *কাজের বিবরণ:*
• জব/অর্ডার নং: *${jobNo}*
• আইটেম: *${productName}*
• পরিমাণ: ${qty}${dimensions}
• মিডিয়া/কাঁচামাল: ${media}
• বর্তমান অবস্থা: *${statusBangla}*${operator}

আমাদের টিম নিখুঁত কোয়ালিটি নিশ্চিত করে কাজটি সম্পন্ন করছে। যেকোনো তথ্যের জন্য যোগাযোগ করুন।
ধন্যবাদ,
*${companyName}*`
  }
}



