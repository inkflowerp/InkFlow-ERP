import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { WorkflowService, SEEDED_WORKFLOW_RULES } from '../../services/workflow.service.ts'
import type { WorkflowRule, WorkflowCondition } from '../../types/workflow.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Workflow Automations Engine - Multi-Tenant Declarative Pipeline', () => {
  const testCompanyId = 'comp-wf-test-01'

  beforeEach(() => {
    // Clear in-memory storage for clean test isolation
    WorkflowService.clearMemoryState()
    PrintERPDataStore.clear(STORAGE_KEYS.WORKFLOW_RULES)
    PrintERPDataStore.clear(STORAGE_KEYS.WORKFLOW_LOGS)
  })

  // ============================================================================
  // 1. RULE REPOSITORY & TENANT BOOTSTRAPPING
  // ============================================================================
  it('1. Initializes default printing industry automation templates for a tenant', async () => {
    const rulesRes = await WorkflowService.getRules(testCompanyId)
    assert.strictEqual(rulesRes.success, true)
    assert.ok(rulesRes.data && rulesRes.data.length >= 3)

    // Verify key printing industry rules exist
    const quoteApprovedRule = rulesRes.data.find(
      (r) => r.trigger_type === 'status_changed' && r.trigger_entity === 'quotation'
    )
    assert.ok(quoteApprovedRule, 'Default quotation approved rule must be seeded')
    assert.strictEqual(quoteApprovedRule.trigger_config?.to_status, 'approved')
    assert.ok(quoteApprovedRule.actions.some((a) => a.type === 'create_document'))
  })

  it('2. Saves, updates, toggles, and deletes workflow rules with isolation', async () => {
    // Create new rule
    const newRule: Partial<WorkflowRule> = {
      name: 'High Value Order WhatsApp Alert',
      name_bn: 'উচ্চ মূল্যের অর্ডার হোয়াটসঅ্যাপ নোটিফিকেশন',
      description: 'Notify owner on orders exceeding 50,000 BDT',
      is_active: true,
      trigger_type: 'status_changed',
      trigger_entity: 'order',
      trigger_config: { to_status: 'confirmed' },
      conditions: [
        { field: 'pricing.total_amount', operator: 'greater_than_or_equal', value: 50000 },
      ],
      actions: [
        {
          type: 'send_whatsapp',
          config: { template: 'vip_order_alert', recipient: '+8801700000000' },
        },
      ],
    }

    const saveRes = await WorkflowService.saveRule(testCompanyId, newRule)
    assert.strictEqual(saveRes.success, true)
    assert.ok(saveRes.data?.id)
    const ruleId = saveRes.data.id

    // Verify retrieval
    const fetched = await WorkflowService.getRuleById(testCompanyId, ruleId)
    assert.strictEqual(fetched?.name, 'High Value Order WhatsApp Alert')
    assert.strictEqual(fetched?.is_active, true)
    assert.strictEqual(fetched?.conditions.length, 1)

    // Toggle active state
    const toggleRes = await WorkflowService.toggleRule(testCompanyId, ruleId, false)
    assert.strictEqual(toggleRes.success, true)
    assert.strictEqual(toggleRes.data?.is_active, false)

    // Delete rule
    const delRes = await WorkflowService.deleteRule(testCompanyId, ruleId)
    assert.strictEqual(delRes.success, true)
    const afterDelete = await WorkflowService.getRuleById(testCompanyId, ruleId)
    assert.strictEqual(afterDelete, null)
  })

  // ============================================================================
  // 2. CONDITION EVALUATION ENGINE (ALL OPERATORS & PATH RESOLUTION)
  // ============================================================================
  describe('Condition Evaluation Engine', () => {
    it('evaluates equality and inequality operators correctly', () => {
      const payload = { status: 'approved', customer_type: 'corporate', priority: 'urgent' }

      // equals
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'status', operator: 'equals', value: 'approved' }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'status', operator: 'equals', value: 'rejected' }],
          payload
        ),
        false
      )

      // not_equals
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'status', operator: 'not_equals', value: 'rejected' }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'status', operator: 'not_equals', value: 'approved' }],
          payload
        ),
        false
      )
    })

    it('evaluates numeric comparison operators (>, <, >=, <=) with coercion', () => {
      const payload = { total_amount: 50000, string_amount: '75000', margin: 25.5 }

      // greater_than
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'total_amount', operator: 'greater_than', value: 40000 }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'total_amount', operator: 'greater_than', value: 50000 }],
          payload
        ),
        false
      )

      // greater_than_or_equal
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'total_amount', operator: 'greater_than_or_equal', value: 50000 }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'string_amount', operator: 'greater_than_or_equal', value: '75000' }],
          payload
        ),
        true
      )

      // less_than & less_than_or_equal
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'margin', operator: 'less_than', value: 30 }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'margin', operator: 'less_than_or_equal', value: 25.5 }],
          payload
        ),
        true
      )
    })

    it('evaluates string containment and set inclusion operators (contains, in)', () => {
      const payload = {
        customer_phone: '+8801711223344',
        payment_method: 'bkash',
        notes: 'Urgent delivery for Dhaka trade fair exhibition',
      }

      // contains & not_contains
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'notes', operator: 'contains', value: 'trade fair' }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'notes', operator: 'not_contains', value: 'cancelled' }],
          payload
        ),
        true
      )

      // in (comma-separated or list)
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'payment_method', operator: 'in', value: 'bkash, nagad, rocket' }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'payment_method', operator: 'in', value: 'bank_transfer, cash' }],
          payload
        ),
        false
      )
    })

    it('evaluates emptiness operators (is_empty, is_not_empty)', () => {
      const payload = {
        present_field: 'valid value',
        empty_str: '',
        null_field: null,
        empty_arr: [],
      }

      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'null_field', operator: 'is_empty', value: null }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'empty_str', operator: 'is_empty', value: '' }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'present_field', operator: 'is_not_empty', value: '' }],
          payload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'missing_field', operator: 'is_empty', value: null }],
          payload
        ),
        true
      )
    })

    it('resolves nested dot-notation paths gracefully', () => {
      const complexPayload = {
        customer: {
          profile: {
            phone: '+8801819999999',
            tier: 'vip',
          },
        },
        pricing: {
          summary: {
            grand_total: 125000,
          },
        },
      }

      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'customer.profile.tier', operator: 'equals', value: 'vip' }],
          complexPayload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'pricing.summary.grand_total', operator: 'greater_than', value: 100000 }],
          complexPayload
        ),
        true
      )
      assert.strictEqual(
        WorkflowService.evaluateConditions(
          [{ field: 'customer.non_existent.field', operator: 'is_empty', value: null }],
          complexPayload
        ),
        true
      )
    })
  })

  // ============================================================================
  // 3. DETERMINISTIC TRIGGER DISPATCHING & ACTION EXECUTION
  // ============================================================================
  it('3. Dispatches trigger and records execution audit logs', async () => {
    // Create rule that triggers on quotation approved
    const rule: Partial<WorkflowRule> = {
      name: 'Auto-convert approved quote test',
      is_active: true,
      trigger_type: 'status_changed',
      trigger_entity: 'quotation',
      trigger_config: { to_status: 'approved' },
      conditions: [{ field: 'total_amount', operator: 'greater_than', value: 10000 }],
      actions: [
        {
          type: 'send_notification',
          config: { title: 'Quote Approved', message: 'Notification test' },
        },
        {
          type: 'send_sms',
          config: { message: 'Your quotation has been approved.', recipient: '+8801711223344' },
        },
      ],
    }

    await WorkflowService.saveRule(testCompanyId, rule)

    // Dispatch trigger matching conditions (amount 25,000 > 10,000)
    const logs = await WorkflowService.dispatchTrigger(
      testCompanyId,
      'status_changed',
      'quotation',
      'QT-2026-999',
      {
        to_status: 'approved',
        total_amount: 25000,
        customer_name: 'Alpha Prints Ltd',
        customer_phone: '+8801711223344',
      }
    )

    assert.ok(logs.length > 0, 'At least one execution log must be recorded')
    const executedLog = logs.find((l) => l.rule_name === 'Auto-convert approved quote test')
    assert.ok(executedLog, 'Target rule must have executed')
    assert.strictEqual(executedLog.status, 'success')
    assert.strictEqual(executedLog.actions_taken.length, 2)
    assert.ok(executedLog.actions_taken[0].latency_ms !== undefined)

    // Verify logs can be queried through getExecutionLogs
    const fetchedLogs = await WorkflowService.getExecutionLogs(testCompanyId)
    assert.ok(fetchedLogs.data && fetchedLogs.data.some((l) => l.id === executedLog.id))
  })

  it('4. Skips execution when conditions do not match', async () => {
    const rule: Partial<WorkflowRule> = {
      name: 'High-Value Only Rule',
      is_active: true,
      trigger_type: 'status_changed',
      trigger_entity: 'order',
      trigger_config: { to_status: 'confirmed' },
      conditions: [{ field: 'total_amount', operator: 'greater_than', value: 100000 }],
      actions: [
        {
          type: 'send_notification',
          config: { title: 'Mega Order Alert' },
        },
      ],
    }

    await WorkflowService.saveRule(testCompanyId, rule)

    // Dispatch trigger with amount 5,000 (does not satisfy > 100,000)
    const logs = await WorkflowService.dispatchTrigger(
      testCompanyId,
      'status_changed',
      'order',
      'ORD-TEST-001',
      {
        to_status: 'confirmed',
        total_amount: 5000,
      }
    )

    const skippedLog = logs.find((l) => l.rule_name === 'High-Value Only Rule')
    assert.ok(skippedLog, 'Rule evaluation should produce a log')
    assert.strictEqual(skippedLog.status, 'skipped')
    assert.strictEqual(skippedLog.actions_taken[0].status, 'skipped')
  })

  it('5. Does not execute inactive (paused) rules', async () => {
    const rule: Partial<WorkflowRule> = {
      name: 'Paused Inactive Rule',
      is_active: false,
      trigger_type: 'status_changed',
      trigger_entity: 'invoice',
      trigger_config: { to_status: 'paid' },
      conditions: [],
      actions: [{ type: 'send_notification', config: { title: 'Invoice Paid' } }],
    }

    await WorkflowService.saveRule(testCompanyId, rule)

    const logs = await WorkflowService.dispatchTrigger(
      testCompanyId,
      'status_changed',
      'invoice',
      'INV-001',
      { to_status: 'paid' }
    )

    const found = logs.find((l) => l.rule_name === 'Paused Inactive Rule')
    assert.strictEqual(found, undefined, 'Paused rules must not run or produce execution logs')
  })

  // ============================================================================
  // 4. RECURSION GUARD & SAFETY ENFORCEMENT
  // ============================================================================
  it('6. Guard prevents infinite loops when depth exceeds maximum safety threshold', async () => {
    // If an action triggers another trigger, the depth counter increases
    const deepLogs = await WorkflowService.dispatchTrigger(
      testCompanyId,
      'status_changed',
      'quotation',
      'RECURSION-TEST',
      { to_status: 'approved' },
      3 // depth > 2
    )

    assert.deepStrictEqual(deepLogs, [], 'Should immediately halt without executing when depth > 2')
  })

  // ============================================================================
  // 5. TEST RUN SIMULATOR
  // ============================================================================
  it('7. Runs sandbox simulation and returns actionable trace for UI diagnostic', async () => {
    const rulesRes = await WorkflowService.getRules(testCompanyId)
    const firstRule = rulesRes.data![0]

    const simRes = await WorkflowService.simulateRuleRun(testCompanyId, firstRule.id, {
      to_status: firstRule.trigger_config?.to_status || 'approved',
      approval_type: 'prepress_proof',
      due_amount: 50000,
      total_amount: 75000,
    })

    assert.strictEqual(simRes.success, true)
    assert.ok(simRes.data)
    assert.strictEqual(simRes.data.rule_id, firstRule.id)
    assert.strictEqual(simRes.data.status, 'success')
    assert.ok(simRes.data.actions_taken.length > 0)
  })
})
