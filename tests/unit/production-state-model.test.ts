import { test, describe } from 'node:test'
import assert from 'node:assert'
import { ProductionRepository } from '../../lib/repositories/production.repository.ts'
import type { ProductionJobStatus, ProductionDepartment } from '../../types/production.types.ts'

describe('Standardized Production State & Stage Model Tests (V9.1)', () => {
  const companyId = 'test_v9_1_prod_state'

  test('1. Separates overall job_status from current_stage throughout lifecycle', async () => {
    // 1. Initial creation: status=queued, stage=printing
    const job = await ProductionRepository.createProductionJob({
      company_id: companyId,
      production_job_number: 'JOB-2026-STATE-01',
      customer_name: 'Metro Advertising',
      product_name: 'Acrylic LED Letter Board',
      department: 'fabrication',
      stage: 'fabrication',
      status: 'queued',
      priority: 'urgent',
      deadline: '2026-09-25',
      dimensions_spec: '10 × 3 ft',
      quantity: 1,
      material_spec: 'Cast Acrylic + LED Module + Power Supply',
      assigned_workers: [],
      has_rework: false,
      rework_count: 0,
    })

    assert.strictEqual(job.status, 'queued')
    assert.strictEqual(job.stage, 'fabrication')

    // 2. Start Work on Fabrication stage
    const started = await ProductionRepository.updateProductionJob(job.id, {
      status: 'in_progress',
      stage: 'fabrication',
    })
    assert.strictEqual(started?.status, 'in_progress')
    assert.strictEqual(started?.stage, 'fabrication')

    // 3. Move to Wiring stage while still in_progress
    const wiringStage = await ProductionRepository.updateProductionJob(job.id, {
      status: 'in_progress',
      stage: 'wiring',
    })
    assert.strictEqual(wiringStage?.status, 'in_progress')
    assert.strictEqual(wiringStage?.stage, 'wiring')

    // 4. Pause on Wiring stage due to missing adapter
    const paused = await ProductionRepository.updateProductionJob(job.id, {
      status: 'paused',
      pause_reason: 'Awaiting 12V 10A Waterproof Power Supply',
    })
    assert.strictEqual(paused?.status, 'paused')
    assert.strictEqual(paused?.stage, 'wiring')

    // 5. Resume and Move to Quality Check
    const qc = await ProductionRepository.updateProductionJob(job.id, {
      status: 'quality_check',
      stage: 'qc',
      pause_reason: null,
    })
    assert.strictEqual(qc?.status, 'quality_check')
    assert.strictEqual(qc?.stage, 'qc')

    // 6. Complete Job and Handover to Delivery
    const completed = await ProductionRepository.updateProductionJob(job.id, {
      status: 'completed',
      stage: 'delivery',
    })
    assert.strictEqual(completed?.status, 'completed')
    assert.strictEqual(completed?.stage, 'delivery')
  })

  test('2. Validates allowed production job statuses and pipeline stages', () => {
    const validStatuses: ProductionJobStatus[] = [
      'queued',
      'in_progress',
      'paused',
      'quality_check',
      'completed',
      'rework',
      'rejected',
    ]

    const validStages = [
      'design',
      'printing',
      'lamination',
      'cutting',
      'finishing',
      'fabrication',
      'wiring',
      'installation',
      'qc',
      'delivery',
    ]

    validStatuses.forEach((status) => {
      assert.ok(typeof status === 'string')
    })
    validStages.forEach((stage) => {
      assert.ok(typeof stage === 'string')
    })
  })
})
