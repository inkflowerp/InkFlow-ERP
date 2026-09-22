import { describe, it } from 'node:test'
import assert from 'node:assert'
import { ProductionService } from '../../services/production.service.ts'
import type { ProductionTaskRecord, MachineQueueGroup } from '../../types/production.types.ts'

describe('Bangladeshi Press Production & Shop Floor Upgrade Unit Tests', () => {
  const mockTasks: ProductionTaskRecord[] = [
    {
      id: 'task-001',
      company_id: 'tenant-dhaka-press',
      job_order_id: 'job-1001',
      job_number: 'JOB-2026-1001',
      task_number: 'TSK-1001-01',
      task_name: 'Four Color Offset Printing (4C Brocure)',
      task_type: 'printing',
      department: 'printing',
      customer_name: 'Bengal Commercial Bank',
      sequence_order: 1,
      quantity: 5000,
      unit: 'sheets',
      priority: 'urgent',
      status: 'in_progress',
      assigned_machine_id: 'mach-offset-01',
      assigned_machine_name: 'Heidelberg Speedmaster CD 102 (4 Color)',
      operator_name: 'Mizanur Rahman',
      required_material: '150 GSM Art Paper (Double Crown)',
      width: 20,
      height: 30,
      created_at: '2026-09-22T08:00:00Z',
      updated_at: '2026-09-22T09:30:00Z',
    },
    {
      id: 'task-002',
      company_id: 'tenant-dhaka-press',
      job_order_id: 'job-1001',
      job_number: 'JOB-2026-1001',
      task_number: 'TSK-1001-02',
      task_name: 'Thermal Gloss Lamination',
      task_type: 'lamination',
      department: 'finishing',
      customer_name: 'Bengal Commercial Bank',
      sequence_order: 2,
      quantity: 5000,
      unit: 'sheets',
      priority: 'urgent',
      status: 'queued',
      created_at: '2026-09-22T08:00:00Z',
      updated_at: '2026-09-22T08:00:00Z',
    },
    {
      id: 'task-003',
      company_id: 'tenant-dhaka-press',
      job_order_id: 'job-1002',
      job_number: 'JOB-2026-1002',
      task_number: 'TSK-1002-01',
      task_name: 'Backlit Signboard Star Flex Print',
      task_type: 'printing',
      department: 'printing',
      customer_name: 'Dhaka Pharmacy',
      sequence_order: 1,
      quantity: 2,
      unit: 'pcs',
      priority: 'normal',
      status: 'on_hold',
      hold_reason: 'material_unavailable',
      hold_notes: 'Waiting for 440 GSM Backlit Star Flex roll delivery from supplier',
      created_at: '2026-09-22T07:00:00Z',
      updated_at: '2026-09-22T08:30:00Z',
    },
    {
      id: 'task-004',
      company_id: 'tenant-dhaka-press',
      job_order_id: 'job-1000',
      job_number: 'JOB-2026-1000',
      task_number: 'TSK-1000-01',
      task_name: 'Indoor Glossy Vinyl Print & Die Cut',
      task_type: 'printing',
      department: 'printing',
      customer_name: 'Rongdhonu Textiles',
      sequence_order: 1,
      quantity: 100,
      unit: 'pcs',
      priority: 'normal',
      status: 'completed',
      completed_at: new Date().toISOString(),
      created_at: '2026-09-22T06:00:00Z',
      updated_at: '2026-09-22T09:00:00Z',
    },
  ]

  const mockMachineQueues: MachineQueueGroup[] = [
    {
      machine_id: 'mach-offset-01',
      machine_name: 'Heidelberg Speedmaster CD 102 (4 Color)',
      machine_type: 'offset_sheetfed',
      operating_status: 'in_use',
      location: 'Main Press Floor - Hall A',
      now: mockTasks[0],
      next: [],
      later: [],
      total_queued_hours: 2.5,
    },
    {
      machine_id: 'mach-uv-01',
      machine_name: 'Roland TrueVIS SG3-540 UV Printer',
      machine_type: 'wide_format_uv',
      operating_status: 'idle',
      location: 'Digital Large Format Room',
      now: null,
      next: [],
      later: [],
      total_queued_hours: 0,
    },
  ]

  it('1. Calculates production KPIs correctly with live running, queued, hold, completed and rush counts', () => {
    const kpis = ProductionService.calculateProductionKpis(mockTasks, mockMachineQueues)

    assert.strictEqual(kpis.totalTasks, 4, 'Total tasks count must be 4')
    assert.strictEqual(kpis.runningNow, 1, 'Running now count must be 1')
    assert.strictEqual(kpis.queuedReady, 1, 'Queued/ready count must be 1')
    assert.strictEqual(kpis.onHold, 1, 'On hold count must be 1')
    assert.strictEqual(kpis.completedToday, 1, 'Completed today count must be 1')
    assert.strictEqual(kpis.urgentCount, 2, 'Urgent tasks count must be 2')
    assert.strictEqual(kpis.totalMachines, 2, 'Total machines must be 2')
    assert.strictEqual(kpis.activeMachines, 1, 'Active in-use machines must be 1')
  })

  it('2. Generates respectful Bengali WhatsApp floor update for in-progress press machine tasks', () => {
    const message = ProductionService.generateBangladeshiFloorWhatsAppMessage(
      mockTasks[0],
      'Dhaka Offset & Digital Printers'
    )

    assert.ok(message.includes('আসসালামু আলাইকুম, *Bengal Commercial Bank*।'))
    assert.ok(message.includes('Dhaka Offset & Digital Printers'))
    assert.ok(message.includes('JOB-2026-1001'))
    assert.ok(message.includes('Heidelberg Speedmaster CD 102 (4 Color)'))
    assert.ok(message.includes('Mizanur Rahman'))
    assert.ok(message.includes('150 GSM Art Paper (Double Crown)'))
    assert.ok(message.includes('20 × 30 sheets'))
  })

  it('3. Generates respectful Bengali WhatsApp floor update for on-hold tasks with reason', () => {
    const message = ProductionService.generateBangladeshiFloorWhatsAppMessage(
      mockTasks[2],
      'Rangao Signage & Media'
    )

    assert.ok(message.includes('আসসালামু আলাইকুম, *Dhaka Pharmacy*।'))
    assert.ok(message.includes('JOB-2026-1002'))
    assert.ok(message.includes('সাময়িক স্থগিত'))
    assert.ok(message.includes('material_unavailable'))
  })

  it('4. Generates respectful Bengali WhatsApp floor update for completed production jobs', () => {
    const message = ProductionService.generateBangladeshiFloorWhatsAppMessage(
      mockTasks[3],
      'Rangao Signage & Media'
    )

    assert.ok(message.includes('আসসালামু আলাইকুম, *Rongdhonu Textiles*।'))
    assert.ok(message.includes('✅ প্রোডাকশন ও কোয়ালিটি চেক সম্পন্ন'))
    assert.ok(message.includes('100 pcs'))
  })
})
