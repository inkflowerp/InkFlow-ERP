/**
 * PrintFlow SaaS - Canonical Order-to-Delivery Workflow Engine
 *
 * Centralized, deterministic workflow resolver that evaluates an order and its child jobs,
 * routing specifications, design approvals, production tasks, and delivery challans
 * to compute authoritative stage progression, blockers, and next actions.
 */

import type { SalesOrderRecord, JobOrderRecord } from '../../types/order.types.ts'
import type { ProductionTaskRecord } from '../../types/production.types.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'
import type { DeliveryChallanRecord } from '../../types/logistics.types.ts'
import { isReadyProduct } from '../units.ts'

export type CanonicalWorkflowStageId =
  | 'quotation'
  | 'sales_order'
  | 'design'
  | 'approval'
  | 'production'
  | 'finishing'
  | 'delivery'
  | 'completed'

export interface WorkflowStageItem {
  id: CanonicalWorkflowStageId
  labelEn: string
  labelBn: string
  status: 'completed' | 'in_progress' | 'blocked' | 'pending' | 'skipped'
  descriptionEn?: string
  descriptionBn?: string
}

export interface ChildJobWorkflowState {
  jobId: string
  jobNumber: string
  productName: string
  department: string
  routing: string
  stage: CanonicalWorkflowStageId
  stageLabelEn: string
  stageLabelBn: string
  status: string
  isBlocked: boolean
  blockedReasonEn: string | null
  blockedReasonBn: string | null
  blockerActionLabelEn?: string | null
  blockerActionHref?: string | null
  nextActionEn: string
  nextActionBn: string
  nextActionHref: string
  tasksCount: number
  completedTasksCount: number
  isReadyForDelivery: boolean
  isDelivered: boolean
  humanStage: string
  humanStageBn: string
  assignedMachine: string | null
  assignedOperator: string | null
  dimensions: string | null
  quantity: number
  dueDate: string | null
}

export interface OrderWorkflowResolution {
  orderId: string
  orderNumber: string
  customerName: string
  overallStage: CanonicalWorkflowStageId
  overallStageLabelEn: string
  overallStageLabelBn: string
  orderStatus: string
  derivedOrderStatus:
    | 'Draft'
    | 'Confirmed'
    | 'In Progress'
    | 'Partially Ready'
    | 'Ready'
    | 'Partially Delivered'
    | 'Delivered'
    | 'Cancelled'
  progressPercentage: number
  isBlocked: boolean
  blockedReasonEn: string | null
  blockedReasonBn: string | null
  blockerActionLabelEn?: string | null
  blockerActionHref?: string | null
  nextActionEn: string
  nextActionBn: string
  nextActionHref: string
  isPartiallyDelivered: boolean
  isFullyDelivered: boolean
  isFullyPaid: boolean
  hasPendingDue: boolean
  stepperStages: WorkflowStageItem[]
  childJobs: ChildJobWorkflowState[]
  jobsSummary: {
    total: number
    completed: number
    inProgress: number
    ready: number
    delivered: number
    miniList: Array<{
      jobNumber: string
      title: string
      statusIcon: '✓' | '●' | '○' | '—'
      statusType: 'completed' | 'current' | 'pending' | 'not_required'
      stageLabel: string
    }>
  }
  materialsSummary: {
    totalItems: number
    hasDesign: boolean
    hasPrint: boolean
    hasFinishing: boolean
    hasFabrication: boolean
    hasInstallation: boolean
  }
}

/**
 * Resolves the canonical workflow state for an individual Job Order
 */
export function resolveChildJobWorkflow(
  job: JobOrderRecord,
  tasks: ProductionTaskRecord[] = [],
  designJob: DesignJobRecord | null = null,
  challans: DeliveryChallanRecord[] = [],
  tenantSlug: string = 'default'
): ChildJobWorkflowState {
  const jobTasks = tasks.filter(
    (t) =>
      t.job_order_id === job.id ||
      t.job_number === job.job_number ||
      t.task_number?.startsWith(`TSK-${job.job_number.replace('JO-', '').replace('JOB-', '')}`)
  )

  const printTasks = jobTasks.filter((t) => t.task_type === 'printing' || t.department === 'printing')
  const finishingTasks = jobTasks.filter(
    (t) =>
      t.task_type === 'finishing' ||
      t.task_type === 'lamination' ||
      t.task_type === 'cutting' ||
      t.task_type === 'fabrication' ||
      t.task_type === 'mounting' ||
      t.department === 'finishing' ||
      t.department === 'fabrication'
  )

  const isPrintComplete = printTasks.length > 0 && printTasks.every((t) => t.status === 'completed')
  const isFinishingComplete =
    finishingTasks.length === 0 || finishingTasks.every((t) => t.status === 'completed')
  const allTasksComplete = jobTasks.length > 0 && jobTasks.every((t) => t.status === 'completed')

  // Check delivery challan items
  let isDelivered = false
  for (const ch of challans) {
    if (ch.status === 'delivered') {
      const match = ch.items?.some(
        (it) =>
          it.product_description?.includes(job.title || job.product_name) ||
          it.remarks?.includes(job.job_number)
      )
      if (match) {
        isDelivered = true
        break
      }
    }
  }

  const routing = job.workflow_routing || 'ready_production'
  const isDesignRequired = routing === 'design_required'
  const isDesignApproved =
    job.artwork_status === 'approved' ||
    designJob?.status === 'approved' ||
    designJob?.is_locked ||
    routing === 'design_ok' ||
    routing === 'ready_production'

  // Default state initialization
  let stage: CanonicalWorkflowStageId = 'production'
  let stageLabelEn = 'In Production'
  let stageLabelBn = 'প্রোডাকশন চলছে'
  let humanStage = 'In Production'
  let humanStageBn = 'প্রোডাকশন চলছে'
  let isBlocked = false
  let blockedReasonEn: string | null = null
  let blockedReasonBn: string | null = null
  let blockerActionLabelEn: string | null = null
  let blockerActionHref: string | null = null
  let nextActionEn = 'Start Production'
  let nextActionBn = 'প্রোডাকশন শুরু করুন'
  let nextActionHref = `/${tenantSlug}/production?job=${job.job_number}`

  // 1. Evaluate Delivered
  if (isDelivered || (job.status === 'completed' && allTasksComplete)) {
    stage = isDelivered ? 'completed' : 'delivery'
    stageLabelEn = isDelivered ? 'Delivered' : 'Ready for Delivery'
    stageLabelBn = isDelivered ? 'ডেলিভারি সম্পন্ন' : 'ডেলিভারির জন্য প্রস্তুত'
    humanStage = isDelivered ? 'Delivered' : 'Ready for Delivery'
    humanStageBn = isDelivered ? 'ডেলিভারি সম্পন্ন' : 'ডেলিভারির জন্য প্রস্তুত'
    nextActionEn = isDelivered ? 'View Delivery Proof' : 'Create Delivery Challan'
    nextActionBn = isDelivered ? 'ডেলিভারি প্রমাণ দেখুন' : 'ডেলিভারি চালান তৈরি করুন'
    nextActionHref = `/${tenantSlug}/delivery?job=${job.job_number}`
  }
  // 2. Evaluate Ready for Delivery
  else if (allTasksComplete || (isPrintComplete && isFinishingComplete)) {
    stage = 'delivery'
    stageLabelEn = 'Ready for Delivery'
    stageLabelBn = 'ডেলিভারির জন্য প্রস্তুত'
    humanStage = 'Ready for Delivery'
    humanStageBn = 'ডেলিভারির জন্য প্রস্তুত'
    nextActionEn = 'Create Delivery Challan'
    nextActionBn = 'ডেলিভারি চালান তৈরি করুন'
    nextActionHref = `/${tenantSlug}/delivery?job=${job.job_number}`
  }
  // 3. Evaluate Finishing / Post-Press Stage
  else if (isPrintComplete && finishingTasks.length > 0 && !isFinishingComplete) {
    const isFabrication =
      job.assigned_department === 'fabrication' ||
      finishingTasks.some((t) => t.task_type === 'fabrication' || t.department === 'fabrication')
    const isInstallation =
      job.assigned_department === 'installation' ||
      finishingTasks.some((t) => t.task_type === 'installation' || t.department === 'installation')

    stage = 'finishing'
    if (isFabrication) {
      stageLabelEn = 'Fabrication'
      stageLabelBn = 'ফ্যাব্রিকেশন'
      humanStage = 'Fabrication'
      humanStageBn = 'ফ্যাব্রিকেশন চলছে'
      nextActionEn = 'Complete Fabrication'
      nextActionBn = 'ফ্যাব্রিকেশন সম্পন্ন করুন'
      nextActionHref = `/${tenantSlug}/finishing?job=${job.job_number}`
    } else if (isInstallation) {
      stageLabelEn = 'Installation'
      stageLabelBn = 'ইনস্টলেশন'
      humanStage = 'Installation'
      humanStageBn = 'ইনস্টলেশন চলছে'
      nextActionEn = 'Assign Installation'
      nextActionBn = 'ইনস্টলেশন বরাদ্দ করুন'
      nextActionHref = `/${tenantSlug}/delivery?job=${job.job_number}`
    } else {
      stageLabelEn = 'Finishing & Fabrication'
      stageLabelBn = 'ফিনিশিং ও তৈরি'
      humanStage = 'Finishing'
      humanStageBn = 'ফিনিশিং চলছে'
      const activeFinishing = finishingTasks.find((t) => t.status === 'in_progress')
      if (activeFinishing) {
        nextActionEn = 'Complete Finishing'
        nextActionBn = 'ফিনিশিং সম্পন্ন করুন'
      } else {
        nextActionEn = 'Start Finishing'
        nextActionBn = 'ফিনিশিং শুরু করুন'
      }
      nextActionHref = `/${tenantSlug}/finishing?job=${job.job_number}`
    }
  }
  // 4. Evaluate Printing / Machine Production Stage
  else if (isDesignApproved) {
    stage = 'production'
    stageLabelEn = 'Production Queue'
    stageLabelBn = 'প্রোডাকশন কিউ'
    humanStage = 'Ready for Production'
    humanStageBn = 'প্রোডাকশনের জন্য প্রস্তুত'

    const activeTask = jobTasks.find((t) => t.status === 'in_progress')
    const onHoldTask = jobTasks.find((t) => t.status === 'on_hold')

    if (onHoldTask) {
      isBlocked = true
      blockedReasonEn = onHoldTask.hold_notes || 'Task paused or on hold'
      blockedReasonBn = 'কাজ স্থগিত বা সাময়িক বিরতিতে আছে'
      humanStage = 'In Production'
      humanStageBn = 'প্রোডাকশনে স্থগিত'
      if (
        onHoldTask.hold_notes?.toLowerCase().includes('material') ||
        onHoldTask.hold_notes?.toLowerCase().includes('insufficient') ||
        onHoldTask.hold_notes?.toLowerCase().includes('stock')
      ) {
        blockerActionLabelEn = 'View Materials'
        blockerActionHref = `/${tenantSlug}/inventory/materials?job=${job.job_number}`
      } else {
        blockerActionLabelEn = 'Open Production'
        blockerActionHref = `/${tenantSlug}/production?job=${job.job_number}`
      }
      nextActionEn = 'Resume Production'
      nextActionBn = 'প্রোডাকশন পুনরায় চালু করুন'
    } else if (activeTask) {
      stageLabelEn = 'Printing / Manufacturing'
      stageLabelBn = 'প্রিন্টিং / প্রস্তুতকরণ'
      humanStage = 'Printing'
      humanStageBn = 'প্রিন্টিং চলছে'
      nextActionEn = 'Complete Printing'
      nextActionBn = 'প্রিন্ট সম্পন্ন করুন'
    } else {
      const unassigned = jobTasks.find((t) => !t.assigned_machine_name && !t.assigned_machine_id)
      if (unassigned) {
        nextActionEn = 'Assign Machine & Operator'
        nextActionBn = 'মেশিন ও অপারেটর বরাদ্দ করুন'
      } else {
        nextActionEn = 'Start Production'
        nextActionBn = 'প্রোডাকশন শুরু করুন'
      }
    }
    nextActionHref = `/${tenantSlug}/production?job=${job.job_number}`
  }
  // 5. Evaluate Design & Approval Gate
  else if (isDesignRequired && !isDesignApproved) {
    if (designJob?.status === 'customer_approval' || job.artwork_status === 'pending') {
      stage = 'approval'
      stageLabelEn = 'Waiting Proof Approval'
      stageLabelBn = 'প্রুফ অনুমোদন অপেক্ষমাণ'
      humanStage = 'Waiting for Approval'
      humanStageBn = 'অনুমোদনের অপেক্ষায়'
      isBlocked = true
      blockedReasonEn = 'Production blocked: Customer design proof approval required'
      blockedReasonBn = 'প্রোডাকশন স্থগিত: কাস্টমার আর্টওয়ার্ক অনুমোদন প্রয়োজন'
      blockerActionLabelEn = 'Open Approval'
      blockerActionHref = `/${tenantSlug}/design?job=${job.job_number}`
      nextActionEn = 'Approve Design Proof'
      nextActionBn = 'ডিজাইন প্রুফ অনুমোদন করুন'
      nextActionHref = `/${tenantSlug}/design?job=${job.job_number}`
    } else {
      stage = 'design'
      stageLabelEn = 'Artwork Design'
      stageLabelBn = 'ডিজাইন তৈরি'
      humanStage = 'Waiting for Design'
      humanStageBn = 'ডিজাইন অপেক্ষমাণ'
      isBlocked = true
      blockedReasonEn = 'Artwork not finished: Designer is preparing files'
      blockedReasonBn = 'আর্টওয়ার্ক অসম্পূর্ণ: ডিজাইনার ফাইল প্রস্তুত করছেন'
      blockerActionLabelEn = 'Open Design'
      blockerActionHref = `/${tenantSlug}/design?job=${job.job_number}`
      nextActionEn = 'Review Design'
      nextActionBn = 'ডিজাইন দেখুন'
      nextActionHref = `/${tenantSlug}/design?job=${job.job_number}`
    }
  }

  const completedCount = jobTasks.filter((t) => t.status === 'completed').length

  const activeTaskObj = jobTasks.find((t) => t.status === 'in_progress') || jobTasks[0]
  const assignedMachine = activeTaskObj?.assigned_machine_name || (job as any).assigned_machine_name || null
  const assignedOperator = activeTaskObj?.assigned_operator_name || (job as any).assigned_operator_name || null
  const dimensions =
    (job as any).dimensions_spec ||
    ((job as any).width && (job as any).height
      ? `${(job as any).width} × ${(job as any).height} ${(job as any).dimension_unit || 'ft'}`
      : null)
  const quantity = Number(job.quantity || 1)
  const dueDate = job.deadline || (job as any).due_date || (job as any).delivery_date || null

  return {
    jobId: job.id,
    jobNumber: job.job_number,
    productName: job.product_name || job.title || 'Custom Print Job',
    department: job.assigned_department || 'printing',
    routing,
    stage,
    stageLabelEn,
    stageLabelBn,
    status: job.status || 'queued',
    isBlocked,
    blockedReasonEn,
    blockedReasonBn,
    blockerActionLabelEn,
    blockerActionHref,
    nextActionEn,
    nextActionBn,
    nextActionHref,
    tasksCount: jobTasks.length,
    completedTasksCount: completedCount,
    isReadyForDelivery: allTasksComplete && !isDelivered,
    isDelivered,
    humanStage,
    humanStageBn,
    assignedMachine,
    assignedOperator,
    dimensions,
    quantity,
    dueDate,
  }
}

/**
 * Resolves the master workflow state for an entire Sales Order across all its child jobs
 */
export function resolveOrderJobWorkflow(
  order: SalesOrderRecord,
  jobs: JobOrderRecord[] = [],
  tasks: ProductionTaskRecord[] = [],
  designJobs: DesignJobRecord[] = [],
  challans: DeliveryChallanRecord[] = [],
  tenantSlug: string = 'default'
): OrderWorkflowResolution {
  const childJobs = jobs.map((j) => {
    const dj = designJobs.find(
      (d) =>
        d.job_order_id === j.id ||
        (d.order_number && (d.order_number === order.order_number || d.order_number === order.id)) ||
        d.title === j.title
    )
    return resolveChildJobWorkflow(j, tasks, dj || null, challans, tenantSlug)
  })

  // Detect capability requirements from line items
  const items = order.items || []
  let hasDesign = items.some((it: any) => it.design_required || it.workflow_routing === 'design_required')
  let hasPrint = true
  let hasFinishing = items.some((it: any) => it.finishing || it.selected_finishing?.length)
  let hasFabrication = items.some((it: any) => it.item_name?.toLowerCase().includes('sign') || it.item_name?.toLowerCase().includes('acp') || it.item_name?.toLowerCase().includes('acrylic'))
  let hasInstallation = items.some((it: any) => it.item_name?.toLowerCase().includes('install') || (it as any).delivery_type === 'installation')

  if (order.workflow_routing === 'ready_product' || items.every((it) => isReadyProduct(it))) {
    hasDesign = false
    hasPrint = false
    hasFinishing = false
  }

  // Financial reconciliation status
  const due = Number(order.due_amount || 0)
  const isFullyPaid = due <= 0 || order.status === 'completed'
  const hasPendingDue = due > 0

  // Delivery status evaluation
  const relevantChallans = challans.filter(
    (c) =>
      c.sales_order_id === order.id ||
      c.order_number === order.order_number ||
      c.invoice_id === order.invoice_id ||
      c.invoice_number === order.invoice_number
  )
  const isPartiallyDelivered =
    relevantChallans.some((c) => c.status === 'partially_delivered') ||
    (childJobs.length > 1 && childJobs.some((j) => j.isDelivered) && childJobs.some((j) => !j.isDelivered))
  const isFullyDelivered =
    (childJobs.length > 0 && childJobs.every((j) => j.isDelivered)) ||
    (childJobs.length === 0 &&
      relevantChallans.length > 0 &&
      relevantChallans.every((c) => c.status === 'delivered'))

  // Determine overall workflow stage
  let overallStage: CanonicalWorkflowStageId = 'sales_order'
  let overallStageLabelEn = 'Order Booked'
  let overallStageLabelBn = 'অর্ডার বুকিং'
  let isBlocked = false
  let blockedReasonEn: string | null = null
  let blockedReasonBn: string | null = null
  let blockerActionLabelEn: string | null = null
  let blockerActionHref: string | null = null
  let nextActionEn = 'Open Job Flow'
  let nextActionBn = 'কাজের ফ্লো দেখুন'
  let nextActionHref = `/${tenantSlug}/orders/${order.id}`

  if (isFullyDelivered) {
    overallStage = 'completed'
    overallStageLabelEn = isFullyPaid ? 'Completed & Settled' : 'Delivered (Payment Due)'
    overallStageLabelBn = isFullyPaid ? 'সম্পন্ন ও সমাপ্ত' : 'ডেলিভারি সম্পন্ন (বকেয়া বিদ্যমান)'
    nextActionEn = isFullyPaid ? 'View Invoice Receipt' : 'Collect Due Payment'
    nextActionBn = isFullyPaid ? 'রশিদ ও চালান দেখুন' : 'বকেয়া বিল গ্রহণ করুন'
    nextActionHref = `/${tenantSlug}/billing?invoice=${order.invoice_number || ''}`
  } else if (isPartiallyDelivered) {
    overallStage = 'delivery'
    overallStageLabelEn = 'Partially Delivered'
    overallStageLabelBn = 'আংশিক ডেলিভারি সম্পন্ন'
    nextActionEn = 'Dispatch Remaining Jobs'
    nextActionBn = 'অবশিষ্ট কাজ ডেলিভারি দিন'
    nextActionHref = `/${tenantSlug}/delivery`
  } else if (childJobs.length > 0 && childJobs.every((j) => j.isReadyForDelivery)) {
    overallStage = 'delivery'
    overallStageLabelEn = 'Ready for Delivery'
    overallStageLabelBn = 'ডেলিভারির জন্য প্রস্তুত'
    nextActionEn = 'Generate Delivery Challan'
    nextActionBn = 'ডেলিভারি চালান তৈরি করুন'
    nextActionHref = `/${tenantSlug}/delivery`
  } else if (childJobs.some((j) => j.stage === 'approval')) {
    overallStage = 'approval'
    overallStageLabelEn = 'Waiting Proof Approval'
    overallStageLabelBn = 'প্রুফ অনুমোদন অপেক্ষমাণ'
    isBlocked = true
    blockedReasonEn = 'Customer design proof approval required'
    blockedReasonBn = 'কাস্টমারের আর্টওয়ার্ক অনুমোদন প্রয়োজন'
    blockerActionLabelEn = 'Open Approval'
    blockerActionHref = `/${tenantSlug}/design`
    nextActionEn = 'Approve Design Proof'
    nextActionBn = 'ডিজাইন প্রুফ অনুমোদন করুন'
    nextActionHref = `/${tenantSlug}/design`
  } else if (childJobs.some((j) => j.stage === 'finishing')) {
    overallStage = 'finishing'
    overallStageLabelEn = 'Finishing & Fabrication'
    overallStageLabelBn = 'ফিনিশিং ও তৈরি'
    nextActionEn = 'Review Finishing Floor'
    nextActionBn = 'ফিনিশিং ফ্লোর দেখুন'
    nextActionHref = `/${tenantSlug}/finishing`
  } else if (childJobs.some((j) => j.stage === 'production')) {
    overallStage = 'production'
    overallStageLabelEn = 'In Production'
    overallStageLabelBn = 'প্রোডাকশন চলছে'
    const blockedJob = childJobs.find((j) => j.isBlocked)
    if (blockedJob) {
      isBlocked = true
      blockedReasonEn = blockedJob.blockedReasonEn
      blockedReasonBn = blockedJob.blockedReasonBn
      blockerActionLabelEn = blockedJob.blockerActionLabelEn || null
      blockerActionHref = blockedJob.blockerActionHref || null
    }
    nextActionEn = 'View Production Floor'
    nextActionBn = 'প্রোডাকশন ফ্লোর দেখুন'
    nextActionHref = `/${tenantSlug}/production`
  } else if (childJobs.some((j) => j.stage === 'design') || hasDesign) {
    overallStage = 'design'
    overallStageLabelEn = 'Artwork in Design'
    overallStageLabelBn = 'ডিজাইন প্রস্তুতকরণ'
    nextActionEn = 'Open Design'
    nextActionBn = 'ডিজাইন দেখুন'
    nextActionHref = `/${tenantSlug}/design`
  }

  // Derive Canonical Order Status (Section 18)
  let derivedOrderStatus:
    | 'Draft'
    | 'Confirmed'
    | 'In Progress'
    | 'Partially Ready'
    | 'Ready'
    | 'Partially Delivered'
    | 'Delivered'
    | 'Cancelled' = 'Confirmed'

  if (order.status === 'cancelled') {
    derivedOrderStatus = 'Cancelled'
  } else if (order.status === 'draft') {
    derivedOrderStatus = 'Draft'
  } else if (isFullyDelivered) {
    derivedOrderStatus = 'Delivered'
  } else if (isPartiallyDelivered) {
    derivedOrderStatus = 'Partially Delivered'
  } else if (childJobs.length > 0 && childJobs.every((j) => j.isReadyForDelivery)) {
    derivedOrderStatus = 'Ready'
  } else if (childJobs.length > 0 && childJobs.some((j) => j.isReadyForDelivery || j.isDelivered)) {
    derivedOrderStatus = 'Partially Ready'
  } else if (
    childJobs.length > 0 &&
    childJobs.some((j) => ['production', 'finishing', 'design', 'approval'].includes(j.stage))
  ) {
    derivedOrderStatus = 'In Progress'
  } else {
    derivedOrderStatus = 'Confirmed'
  }

  // Jobs Summary for lightweight Order Card (Section 9)
  const totalJobs = childJobs.length
  const deliveredJobs = childJobs.filter((j) => j.isDelivered).length
  const readyJobs = childJobs.filter((j) => j.isReadyForDelivery).length
  const inProgressJobs = childJobs.filter(
    (j) => !j.isDelivered && !j.isReadyForDelivery && (j.stage === 'production' || j.stage === 'finishing')
  ).length
  const completedJobs = deliveredJobs + readyJobs

  const miniList = childJobs.map((j) => {
    let statusIcon: '✓' | '●' | '○' | '—' = '○'
    let statusType: 'completed' | 'current' | 'pending' | 'not_required' = 'pending'
    if (j.isDelivered || j.isReadyForDelivery) {
      statusIcon = '✓'
      statusType = 'completed'
    } else if (
      j.stage === overallStage ||
      j.stage === 'production' ||
      j.stage === 'finishing' ||
      j.isBlocked
    ) {
      statusIcon = '●'
      statusType = 'current'
    }
    return {
      jobNumber: j.jobNumber,
      title: j.productName,
      statusIcon,
      statusType,
      stageLabel: j.humanStage || j.stageLabelEn,
    }
  })

  // Calculate overall progress percentage
  let progressPercentage = 15
  if (overallStage === 'design') progressPercentage = 30
  if (overallStage === 'approval') progressPercentage = 45
  if (overallStage === 'production') progressPercentage = 65
  if (overallStage === 'finishing') progressPercentage = 80
  if (overallStage === 'delivery') progressPercentage = 90
  if (overallStage === 'completed') progressPercentage = 100

  // Build visual stepper stages
  const stepperStages: WorkflowStageItem[] = [
    {
      id: 'quotation',
      labelEn: 'Quotation',
      labelBn: 'কোটেশন',
      status: 'completed',
    },
    {
      id: 'sales_order',
      labelEn: 'Order Booked',
      labelBn: 'অর্ডার নিশ্চিত',
      status: 'completed',
    },
    {
      id: 'design',
      labelEn: 'Design',
      labelBn: 'ডিজাইন',
      status:
        !hasDesign
          ? 'skipped'
          : overallStage === 'design'
          ? 'in_progress'
          : ['approval', 'production', 'finishing', 'delivery', 'completed'].includes(overallStage)
          ? 'completed'
          : 'pending',
    },
    {
      id: 'approval',
      labelEn: 'Proof Approval',
      labelBn: 'প্রুফ অনুমোদন',
      status:
        !hasDesign
          ? 'skipped'
          : overallStage === 'approval'
          ? isBlocked
            ? 'blocked'
            : 'in_progress'
          : ['production', 'finishing', 'delivery', 'completed'].includes(overallStage)
          ? 'completed'
          : 'pending',
    },
    {
      id: 'production',
      labelEn: 'Production',
      labelBn: 'প্রোডাকশন',
      status:
        overallStage === 'production'
          ? isBlocked
            ? 'blocked'
            : 'in_progress'
          : ['finishing', 'delivery', 'completed'].includes(overallStage)
          ? 'completed'
          : 'pending',
    },
    {
      id: 'finishing',
      labelEn: 'Finishing',
      labelBn: 'ফিনিশিং',
      status:
        !hasFinishing && !hasFabrication
          ? 'skipped'
          : overallStage === 'finishing'
          ? 'in_progress'
          : ['delivery', 'completed'].includes(overallStage)
          ? 'completed'
          : 'pending',
    },
    {
      id: 'delivery',
      labelEn: 'Delivery',
      labelBn: 'ডেলিভারি',
      status:
        overallStage === 'delivery'
          ? 'in_progress'
          : overallStage === 'completed'
          ? 'completed'
          : 'pending',
    },
    {
      id: 'completed',
      labelEn: 'Settled',
      labelBn: 'সম্পূর্ণ সমাপ্ত',
      status: overallStage === 'completed' && isFullyPaid ? 'completed' : 'pending',
    },
  ]

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    overallStage,
    overallStageLabelEn,
    overallStageLabelBn,
    orderStatus: order.status,
    derivedOrderStatus,
    progressPercentage,
    isBlocked,
    blockedReasonEn,
    blockedReasonBn,
    blockerActionLabelEn,
    blockerActionHref,
    nextActionEn,
    nextActionBn,
    nextActionHref,
    isPartiallyDelivered,
    isFullyDelivered,
    isFullyPaid,
    hasPendingDue,
    stepperStages,
    childJobs,
    jobsSummary: {
      total: totalJobs,
      completed: completedJobs,
      inProgress: inProgressJobs,
      ready: readyJobs,
      delivered: deliveredJobs,
      miniList,
    },
    materialsSummary: {
      totalItems: items.length,
      hasDesign,
      hasPrint,
      hasFinishing,
      hasFabrication,
      hasInstallation,
    },
  }
}
