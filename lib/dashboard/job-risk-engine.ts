// ==============================================================================
// InkFlow ERP - Authoritative Job Risk & Blocked Work Engine (V9.1)
// Classifies operational risks (Critical, At Risk, On Track) and detects actual
// workflow blockers based on real multi-factor production & business signals.
// ==============================================================================

import type { ProductionJobRecord } from '@/types/production.types'
import type { DesignJobRecord } from '@/types/design.types'
import type { DeliveryChallanRecord } from '@/types/logistics.types'
import type { InvoiceRecord } from '@/types/billing.types'
import type { MaterialRecord } from '@/types/inventory.types'
import {
  getBangladeshTodayDateString,
  calculateDaysOverdue,
  toBangladeshDateString,
} from '../utils/business-date.ts'

export type JobRiskLevel = 'critical' | 'at_risk' | 'on_track'

export type BlockedWorkReason =
  | 'waiting_approval'
  | 'waiting_payment'
  | 'waiting_material'
  | 'waiting_design'
  | 'waiting_production'
  | 'waiting_finishing'
  | 'waiting_machine'
  | 'waiting_delivery'
  | 'waiting_assignment'

export interface BlockedWorkItem {
  id: string
  recordType: 'production_job' | 'design_job' | 'delivery_challan' | 'order'
  code: string
  titleEn: string
  titleBn: string
  customerName: string
  blockedReason: BlockedWorkReason
  blockedReasonLabelEn: string
  blockedReasonLabelBn: string
  durationHours: number
  responsiblePerson?: string | null
  primaryActionLabelEn: string
  primaryActionLabelBn: string
  primaryActionTarget: string
  primaryActionType: 'route' | 'modal'
}

export interface EvaluatedJobRisk {
  jobId: string
  jobNumber: string
  productName: string
  customerName: string
  quantity: number
  unit: string
  currentStage: string
  assignedPerson?: string | null
  assignedMachine?: string | null
  deadline: string
  riskLevel: JobRiskLevel
  riskScore: number // 0 - 100
  riskReasonsEn: string[]
  riskReasonsBn: string[]
  blockedReason?: string | null
  blockedReasonBn?: string | null
  isBlocked: boolean
}

export interface NeedsAttentionItem {
  id: string
  category: 'risk' | 'approval' | 'money' | 'material' | 'delivery' | 'blocker'
  severity: 'urgent' | 'warning' | 'info'
  titleEn: string
  titleBn: string
  subtitleEn: string
  subtitleBn: string
  recordCode?: string
  status?: string
  ageOrDeadline?: string
  responsiblePerson?: string
  actionLabelEn: string
  actionLabelBn: string
  actionTarget: string
  actionType: 'route' | 'modal'
}

export class JobRiskEngine {
  /**
   * Evaluates risk level and blocked status for a single production job
   */
  static evaluateProductionJobRisk(
    job: ProductionJobRecord,
    materials?: MaterialRecord[],
    asOfDateStr?: string
  ): EvaluatedJobRisk {
    const todayStr = asOfDateStr || getBangladeshTodayDateString()
    const riskReasonsEn: string[] = []
    const riskReasonsBn: string[] = []
    let riskScore = 0 // 0 to 100
    let blockedReason: string | null = null
    let blockedReasonBn: string | null = null

    const status = String(job.status || '').toLowerCase()
    const priority = String(job.priority || '').toLowerCase()
    const deadline = job.deadline ? toBangladeshDateString(job.deadline) : null

    // 1. Deadline Signals
    if (deadline) {
      if (deadline < todayStr && status !== 'completed' && status !== 'cancelled') {
        riskScore += 50
        riskReasonsEn.push('Deadline has passed')
        riskReasonsBn.push('ডেলিভারির নির্ধারিত সময় পার হয়ে গেছে')
      } else if (deadline === todayStr && status !== 'completed') {
        riskScore += 30
        riskReasonsEn.push('Due today')
        riskReasonsBn.push('আজকেই ডেলিভারি তারিখ')
      }
    }

    // 2. Rework / Incident Signal
    if (job.has_rework || (job.reworks && job.reworks.length > 0)) {
      riskScore += 35
      riskReasonsEn.push('Rework / Quality scrap reported')
      riskReasonsBn.push('পুনঃমুদ্রণ / ত্রুটি রিপোর্ট হয়েছে')
    }

    // 3. High Urgency Priority
    if (priority === 'very_urgent') {
      riskScore += 20
    } else if (priority === 'urgent') {
      riskScore += 10
    }

    // 4. Stalled in Queue or Unassigned
    const isUnassigned = !(job as any).assigned_operator_id && !(job as any).assigned_operator_name && (!job.assigned_workers || job.assigned_workers.length === 0)
    if (status === 'queued' && isUnassigned) {
      riskScore += 15
      blockedReason = 'Waiting for Operator Assignment'
      blockedReasonBn = 'অপারেটর বরাদ্দের অপেক্ষায়'
    } else if (status === 'queued' && !(job as any).assigned_machine_id && !(job as any).assigned_machine_name) {
      riskScore += 10
      blockedReason = 'Waiting for Machine Slot'
      blockedReasonBn = 'মেশিন বরাদ্দের অপেক্ষায়'
    }

    // 5. Material Check
    if (job.material_spec && Array.isArray(materials) && materials.length > 0) {
      const mat = materials.find((m) =>
        m.name.toLowerCase().includes(job.material_spec!.toLowerCase()) ||
        (m.sku && job.material_spec!.toLowerCase().includes(m.sku.toLowerCase()))
      )
      if (mat && (mat.current_stock || 0) <= (mat.min_stock_level || 5)) {
        riskScore += 25
        riskReasonsEn.push(`Material '${mat.name}' is low stock (${mat.current_stock} remaining)`)
        riskReasonsBn.push(`কাঁচামাল '${mat.name}' স্টকে কম আছে`)
        blockedReason = 'Waiting for Material Stock'
        blockedReasonBn = 'কাঁচামাল ঘাটতির অপেক্ষায়'
      }
    }

    // Determine Classification
    let riskLevel: JobRiskLevel = 'on_track'
    if (status === 'completed' || (status as string) === 'cancelled') {
      riskLevel = 'on_track'
      riskScore = 0
    } else if (riskScore >= 45) {
      riskLevel = 'critical'
    } else if (riskScore >= 20) {
      riskLevel = 'at_risk'
    }

    const assigned = (job as any).assigned_operator_name || (job.assigned_workers && job.assigned_workers[0]) || null

    return {
      jobId: job.id,
      jobNumber: job.production_job_number || (job as any).task_number || job.id.slice(0, 8).toUpperCase(),
      productName: job.product_name || (job as any).title || (job as any).task_name || 'Print Job',
      customerName: job.customer_name || 'Customer',
      quantity: job.quantity || 1,
      unit: (job as any).unit || 'pcs',
      currentStage: job.stage || job.department || 'printing',
      assignedPerson: assigned,
      assignedMachine: (job as any).assigned_machine_name || null,
      deadline: deadline || 'N/A',
      riskLevel,
      riskScore: Math.min(100, riskScore),
      riskReasonsEn,
      riskReasonsBn,
      blockedReason,
      blockedReasonBn,
      isBlocked: Boolean(blockedReason),
    }
  }

  /**
   * Aggregates all Needs Attention items across all business domains
   */
  static generateNeedsAttentionItems(params: {
    productionJobs?: ProductionJobRecord[]
    designJobs?: DesignJobRecord[]
    deliveryChallans?: DeliveryChallanRecord[]
    invoices?: InvoiceRecord[]
    materials?: MaterialRecord[]
    branchId?: string | null
  }): NeedsAttentionItem[] {
    const items: NeedsAttentionItem[] = []
    const todayStr = getBangladeshTodayDateString()

    // 1. JOBS AT RISK
    const evaluatedProd = (params.productionJobs || [])
      .filter((pj) => !params.branchId || !(pj as any).branch_id || (pj as any).branch_id === params.branchId)
      .map((pj) => this.evaluateProductionJobRisk(pj, params.materials, todayStr))
      .filter((r) => r.riskLevel === 'critical' || r.riskLevel === 'at_risk')

    if (evaluatedProd.length > 0) {
      const criticalCount = evaluatedProd.filter((r) => r.riskLevel === 'critical').length
      const topJob = evaluatedProd[0]

      items.push({
        id: 'attention-jobs-at-risk',
        category: 'risk',
        severity: criticalCount > 0 ? 'urgent' : 'warning',
        titleEn: `${evaluatedProd.length} Job(s) At Risk / Delayed on Floor`,
        titleBn: `${evaluatedProd.length}টি কাজের সময়সীমা ঝুঁকি / ফ্লোরে বিলম্বিত`,
        subtitleEn: `${topJob.jobNumber} (${topJob.customerName}): ${topJob.riskReasonsEn[0] || 'Production behind schedule'}`,
        subtitleBn: `${topJob.jobNumber} (${topJob.customerName}): ${topJob.riskReasonsBn[0] || 'উৎপাদন সময়সীমা অতিক্রম করেছে'}`,
        recordCode: topJob.jobNumber,
        status: topJob.riskLevel === 'critical' ? 'Critical' : 'At Risk',
        ageOrDeadline: topJob.deadline,
        responsiblePerson: topJob.assignedPerson || undefined,
        actionLabelEn: 'Open Production',
        actionLabelBn: 'প্রোডাকশন দেখুন',
        actionTarget: '/production',
        actionType: 'route',
      })
    }

    // 2. CUSTOMER APPROVAL PENDING (Design)
    const pendingDesigns = (params.designJobs || []).filter((dj) => {
      if (params.branchId && (dj as any).branch_id && (dj as any).branch_id !== params.branchId) return false
      return dj.status === 'customer_approval' || dj.status === 'revision'
    })

    if (pendingDesigns.length > 0) {
      const topDesign = pendingDesigns[0]
      const isRevision = topDesign.status === 'revision'

      items.push({
        id: 'attention-design-approval',
        category: 'approval',
        severity: 'warning',
        titleEn: `${pendingDesigns.length} Customer Approval(s) Pending`,
        titleBn: `${pendingDesigns.length}টি আর্টওয়ার্ক গ্রাহক অনুমোদনের অপেক্ষায়`,
        subtitleEn: `${topDesign.design_number || 'Design'}: ${topDesign.customer_name} ${isRevision ? '(Revision Requested)' : '(Proof Sent)'}`,
        subtitleBn: `${topDesign.design_number || 'ডিজাইন'}: ${topDesign.customer_name} ${isRevision ? '(সংশোধনের মন্তব্য এসেছে)' : '(প্রুফ পাঠানো হয়েছে)'}`,
        recordCode: topDesign.design_number,
        status: isRevision ? 'Revision Needed' : 'Waiting for Client',
        ageOrDeadline: topDesign.deadline || undefined,
        responsiblePerson: topDesign.designer_name || undefined,
        actionLabelEn: 'Open Studio',
        actionLabelBn: 'ডিজাইন খুলুন',
        actionTarget: '/design',
        actionType: 'route',
      })
    }

    // 3. OVERDUE INVOICES (Money to Collect)
    const overdueInvoices = (params.invoices || []).filter((inv) => {
      if (params.branchId && (inv as any).branch_id && (inv as any).branch_id !== params.branchId) return false
      const rawStatus = String(inv.status || '').toLowerCase()
      if (rawStatus === 'cancelled' || rawStatus === 'void' || rawStatus === 'written_off') return false
      const due = Math.max(0, (Number(inv.grand_total) || 0) - (Number(inv.paid_amount) || 0) - (Number(inv.write_off_amount) || 0))
      return due > 0 && inv.due_date && inv.due_date < todayStr
    })

    if (overdueInvoices.length > 0) {
      const topOverdue = overdueInvoices[0]
      const topDue = Math.max(0, (Number(topOverdue.grand_total) || 0) - (Number(topOverdue.paid_amount) || 0))
      const totalOverdueSum = overdueInvoices.reduce((s, i) => s + Math.max(0, (Number(i.grand_total) || 0) - (Number(i.paid_amount) || 0)), 0)
      const days = calculateDaysOverdue(topOverdue.due_date, todayStr)

      items.push({
        id: 'attention-overdue-money',
        category: 'money',
        severity: days > 7 ? 'urgent' : 'warning',
        titleEn: `${overdueInvoices.length} Overdue Account(s) (BDT ${totalOverdueSum.toLocaleString()} Due)`,
        titleBn: `${overdueInvoices.length}টি বকেয়া ইনভয়েস (মোট বাকি ৳ ${totalOverdueSum.toLocaleString()})`,
        subtitleEn: `${topOverdue.customer_name}: BDT ${topDue.toLocaleString()} overdue by ${days} day(s)`,
        subtitleBn: `${topOverdue.customer_name}: ৳ ${topDue.toLocaleString()} বাকি (${days} দিন অতিবাহিত)`,
        recordCode: topOverdue.invoice_number,
        status: `${days}d Overdue`,
        ageOrDeadline: `Due: ${topOverdue.due_date}`,
        actionLabelEn: 'View Receivables',
        actionLabelBn: 'বাকি তালিকা',
        actionTarget: '/billing?tab=due',
        actionType: 'route',
      })
    }

    // 4. MATERIAL SHORTAGES
    const lowStockMaterials = (params.materials || []).filter((m) => {
      if (params.branchId && (m as any).branch_id && (m as any).branch_id !== params.branchId) return false
      return (Number(m.current_stock) || 0) <= (Number(m.min_stock_level) || 10)
    })

    if (lowStockMaterials.length > 0) {
      const topMat = lowStockMaterials[0]
      items.push({
        id: 'attention-low-materials',
        category: 'material',
        severity: 'warning',
        titleEn: `${lowStockMaterials.length} Raw Material(s) Below Minimum Stock`,
        titleBn: `${lowStockMaterials.length}টি কাঁচামাল সর্বনিম্ন সীমার নিচে`,
        subtitleEn: `${topMat.name}: Only ${topMat.current_stock} ${topMat.unit} remaining (Min: ${topMat.min_stock_level})`,
        subtitleBn: `${topMat.name}: মাত্র ${topMat.current_stock} ${topMat.unit} অবশিষ্ট (সর্বনিম্ন: ${topMat.min_stock_level})`,
        recordCode: topMat.sku,
        status: 'Low Stock',
        actionLabelEn: 'Inventory Reorder',
        actionLabelBn: 'স্টক দেখুন',
        actionTarget: '/inventory',
        actionType: 'route',
      })
    }

    // 5. DELIVERY PROBLEMS / READY BUT NOT DISPATCHED
    const delayedChallans = (params.deliveryChallans || []).filter((c) => {
      if (params.branchId && (c as any).branch_id && (c as any).branch_id !== params.branchId) return false
      const isPending = c.status === 'scheduled' || c.status === 'assigned'
      return isPending && c.scheduled_date && c.scheduled_date < todayStr
    })

    if (delayedChallans.length > 0) {
      const topChallan = delayedChallans[0]
      items.push({
        id: 'attention-delayed-deliveries',
        category: 'delivery',
        severity: 'urgent',
        titleEn: `${delayedChallans.length} Delayed Delivery Dispatch(es)`,
        titleBn: `${delayedChallans.length}টি ডেলিভারি প্রেরণ বিলম্বিত`,
        subtitleEn: `${topChallan.challan_number || 'Challan'}: Scheduled for ${topChallan.customer_name} not yet delivered`,
        subtitleBn: `${topChallan.challan_number || 'চালান'}: ${topChallan.customer_name}-এর ডেলিভারি এখনও পৌঁছায়নি`,
        recordCode: topChallan.challan_number,
        status: 'Delayed',
        ageOrDeadline: topChallan.scheduled_date,
        responsiblePerson: topChallan.delivery_person_name || undefined,
        actionLabelEn: 'Open Logistics',
        actionLabelBn: 'ডেলিভারি দেখুন',
        actionTarget: '/delivery',
        actionType: 'route',
      })
    }

    return items
  }

  /**
   * Identifies all currently blocked work items across workflow stages
   */
  static getBlockedWorkItems(params: {
    productionJobs?: ProductionJobRecord[]
    designJobs?: DesignJobRecord[]
    materials?: MaterialRecord[]
    branchId?: string | null
  }): BlockedWorkItem[] {
    const list: BlockedWorkItem[] = []

    // 1. Production jobs blocked
    for (const pj of params.productionJobs || []) {
      if (params.branchId && (pj as any).branch_id && (pj as any).branch_id !== params.branchId) continue
      if (pj.status === 'completed' || (pj.status as string) === 'cancelled') continue

      const evalRisk = this.evaluateProductionJobRisk(pj, params.materials)
      if (evalRisk.isBlocked && evalRisk.blockedReason) {
        list.push({
          id: pj.id,
          recordType: 'production_job',
          code: evalRisk.jobNumber,
          titleEn: evalRisk.productName,
          titleBn: evalRisk.productName,
          customerName: evalRisk.customerName,
          blockedReason: evalRisk.blockedReason.includes('Material')
            ? 'waiting_material'
            : evalRisk.blockedReason.includes('Machine')
            ? 'waiting_machine'
            : 'waiting_assignment',
          blockedReasonLabelEn: evalRisk.blockedReason,
          blockedReasonLabelBn: evalRisk.blockedReasonBn || evalRisk.blockedReason,
          durationHours: 12,
          responsiblePerson: evalRisk.assignedPerson,
          primaryActionLabelEn: 'Resolve Blocker',
          primaryActionLabelBn: 'সমাধান করুন',
          primaryActionTarget: `/production`,
          primaryActionType: 'route',
        })
      }
    }

    // 2. Design jobs blocked awaiting client
    for (const dj of params.designJobs || []) {
      if (params.branchId && (dj as any).branch_id && (dj as any).branch_id !== params.branchId) continue
      if (dj.status === 'customer_approval' || dj.status === 'revision') {
        list.push({
          id: dj.id,
          recordType: 'design_job',
          code: dj.design_number || dj.id.slice(0, 8).toUpperCase(),
          titleEn: dj.title || 'Artwork Proof',
          titleBn: dj.title || 'আর্টওয়ার্ক প্রুফ',
          customerName: dj.customer_name || 'Customer',
          blockedReason: 'waiting_approval',
          blockedReasonLabelEn: 'Waiting for Customer Approval',
          blockedReasonLabelBn: 'গ্রাহক অনুমোদনের অপেক্ষায়',
          durationHours: 24,
          responsiblePerson: dj.designer_name,
          primaryActionLabelEn: 'Open Proof',
          primaryActionLabelBn: 'প্রুফ দেখুন',
          primaryActionTarget: `/design`,
          primaryActionType: 'route',
        })
      }
    }

    return list
  }
}
