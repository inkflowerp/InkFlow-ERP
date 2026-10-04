import type {
  ProductionTaskRecord,
  MachineQueueGroup,
  ProductionKpiMetrics,
} from '../../types/production.types.ts'

/**
 * Calculates comprehensive operational and machine utilization KPIs for the Press Shop Floor.
 */
export function calculateProductionKpis(
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
