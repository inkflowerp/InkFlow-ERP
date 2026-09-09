import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('Platform Dashboard Live Telemetry & Health Calculation Tests', () => {
  describe('1. Company Health Evaluation Logic', () => {
    test('Correctly classifies healthy, at-risk, critical, and suspended companies', () => {
      const companies = [
        { id: '1', name: 'Alpha Signs', is_active: true },
        { id: '2', name: 'Beta Prints', is_active: true },
        { id: '3', name: 'Gamma Media', is_active: false }, // Inactive -> Suspended
        { id: '4', name: 'Delta Offset', is_active: true },
      ]

      const nowTime = Date.now()
      const dayMs = 1000 * 60 * 60 * 24

      const subscriptions = [
        { company_id: '1', status: 'trial', trial_ends_at: new Date(nowTime + 10 * dayMs).toISOString() }, // 10 days left -> Healthy
        { company_id: '2', status: 'trial', trial_ends_at: new Date(nowTime + 1 * dayMs).toISOString() }, // 1 day left -> At Risk
        { company_id: '3', status: 'suspended', trial_ends_at: null }, // Suspended -> Suspended
        { company_id: '4', status: 'past_due', trial_ends_at: null }, // Past due -> Critical
      ]

      const unresolvedEvents: Array<{ company_id?: string; severity: 'info' | 'warning' | 'error' | 'critical' }> = []

      let healthyCount = 0
      let atRiskCount = 0
      let criticalCount = 0
      let suspendedCount = 0

      companies.forEach((c) => {
        const sub = subscriptions.find((s) => s.company_id === c.id)
        if (!c.is_active || sub?.status === 'suspended') {
          suspendedCount++
          return
        }

        if (sub?.status === 'past_due' || sub?.status === 'cancelled') {
          criticalCount++
          return
        }

        if (sub?.status === 'trial') {
          const trialEnd = sub?.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0
          const daysLeft = trialEnd > 0 ? (trialEnd - nowTime) / dayMs : 14
          if (daysLeft <= 3) {
            atRiskCount++
          } else {
            healthyCount++
          }
          return
        }

        const compEvents = unresolvedEvents.filter((e) => e.company_id === c.id)
        if (compEvents.some((e) => e.severity === 'critical')) {
          criticalCount++
        } else if (compEvents.length > 0) {
          atRiskCount++
        } else {
          healthyCount++
        }
      })

      assert.strictEqual(healthyCount, 1, 'Should have 1 healthy company')
      assert.strictEqual(atRiskCount, 1, 'Should have 1 at-risk company')
      assert.strictEqual(criticalCount, 1, 'Should have 1 critical company')
      assert.strictEqual(suspendedCount, 1, 'Should have 1 suspended company')
      assert.strictEqual(healthyCount + atRiskCount + criticalCount + suspendedCount, companies.length, 'Total must equal all companies')
    })
  })

  describe('2. Dynamic Storage & Percentage Calculation', () => {
    test('Correctly computes storage percentage and labels', () => {
      const storageUsedGb = 0.15
      const storageTotalGb = 100

      const pct = storageTotalGb > 0 ? ((storageUsedGb / storageTotalGb) * 100).toFixed(1) : '0'
      const label = storageTotalGb >= 1000 ? `${(storageTotalGb / 1000).toFixed(0)} TB` : `${storageTotalGb} GB`

      assert.strictEqual(pct, '0.1', '0.15 GB of 100 GB should format to 0.1%')
      assert.strictEqual(label, '100 GB', 'Label should be 100 GB')

      const tbTotal = 1000
      const tbUsed = 50
      const tbPct = ((tbUsed / tbTotal) * 100).toFixed(1)
      const tbLabel = tbTotal >= 1000 ? `${(tbTotal / 1000).toFixed(0)} TB` : `${tbTotal} GB`
      assert.strictEqual(tbPct, '5.0')
      assert.strictEqual(tbLabel, '1 TB')
    })
  })

  describe('3. Service Health Probes Status Resolution', () => {
    test('Resolves operational status when no health incidents exist', () => {
      const unresolvedEvents: Array<{ category: string; severity: string }> = []
      const failedJobs = unresolvedEvents.filter((e) => e.category === 'job').length
      const jobStatus = failedJobs > 0 ? 'degraded' : 'operational'
      assert.strictEqual(jobStatus, 'operational')
    })

    test('Marks degraded when unresolved warnings or failures exist', () => {
      const unresolvedEvents = [
        { category: 'job', severity: 'warning' },
      ]
      const failedJobs = unresolvedEvents.filter((e) => e.category === 'job').length
      const jobStatus = failedJobs > 0 ? 'degraded' : 'operational'
      assert.strictEqual(jobStatus, 'degraded')
    })
  })
})
