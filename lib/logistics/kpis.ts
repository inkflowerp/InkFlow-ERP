import type {
  DeliveryChallanRecord,
  InstallationRecord,
  LogisticsKpiMetrics,
} from '@/types/logistics.types'

/**
 * Pure calculation function for logistics dashboard KPIs
 */
export function calculateLogisticsKpis(
  challans: DeliveryChallanRecord[] = [],
  installations: InstallationRecord[] = []
): LogisticsKpiMetrics {
  const todayStr = new Date().toISOString().split('T')[0]

  let dispatchesToday = 0
  let outForDelivery = 0
  let partiallyDelivered = 0
  let fullyDelivered = 0
  let totalPendingDue = 0

  for (const ch of challans) {
    if (ch.scheduled_date === todayStr) {
      dispatchesToday++
    }
    if (ch.status === 'out_for_delivery') {
      outForDelivery++
    } else if (ch.status === 'partially_delivered') {
      partiallyDelivered++
    } else if (ch.status === 'delivered') {
      fullyDelivered++
    }

    if (ch.status !== 'delivered' && ch.due_amount && ch.due_amount > 0) {
      totalPendingDue += Number(ch.due_amount) || 0
    }
  }

  const installationsActive = installations.filter(
    (ins) => ins.status === 'on_site' || ins.status === 'scheduled'
  ).length

  return {
    dispatchesToday,
    outForDelivery,
    partiallyDelivered,
    installationsActive,
    fullyDelivered,
    totalPendingDue,
    totalChallans: challans.length,
  }
}
