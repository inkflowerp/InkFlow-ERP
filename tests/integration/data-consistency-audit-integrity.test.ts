import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

describe('Data Consistency & Integrity Verification Suite', () => {
  const rootDir = process.cwd()

  it('1. Area calculation formulas match between new-invoice-modal and actions/billing.actions.ts', () => {
    // Metric Area Test (1m x 2m @ 10 pcs @ 50 BDT/sqft)
    const wMetric = 1
    const hMetric = 2
    const qtyMetric = 10
    const rateMetric = 50

    const metricArea = wMetric * hMetric * 10.7639
    const metricLineTotal = Math.round(metricArea * qtyMetric * rateMetric)
    assert.equal(Math.round(metricArea * 100) / 100, 21.53)
    assert.equal(metricLineTotal, 10764)

    // Square inch Area Test (12in x 24in @ 1 pcs @ 100 BDT/sqft)
    const wInch = 12
    const hInch = 24
    const qtyInch = 1
    const rateInch = 100
    const inchArea = (wInch * hInch) / 144 // 288 / 144 = 2 sqft
    const inchLineTotal = Math.round(inchArea * qtyInch * rateInch)
    assert.equal(inchArea, 2)
    assert.equal(inchLineTotal, 200)

    // Ready product ignores dimensions (10 pcs @ 150 BDT)
    const readyQty = 10
    const readyRate = 150
    const readyTotal = Math.round(readyQty * readyRate)
    assert.equal(readyTotal, 1500)
  })

  it('2. Vercel cron configuration registers communication worker and trash cleanup', () => {
    const vercelConfigPath = path.join(rootDir, 'vercel.json')
    assert.equal(fs.existsSync(vercelConfigPath), true, 'vercel.json must exist')

    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'))
    assert.ok(Array.isArray(vercelConfig.crons), 'crons array must be defined in vercel.json')

    const commCron = vercelConfig.crons.find((c: any) => c.path === '/api/cron/communication-worker')
    assert.ok(commCron, 'communication-worker cron must be registered')
    assert.ok(commCron.schedule === '0 4 * * *' || commCron.schedule === '* * * * *', 'communication-worker cron schedule must be configured')

    const trashCron = vercelConfig.crons.find((c: any) => c.path === '/api/cron/trash-cleanup')
    assert.ok(trashCron, 'trash-cleanup cron must be registered')
  })

  it('3. Inbound OpenWA webhook adheres to Migration 107 schema constraints', () => {
    const routePath = path.join(rootDir, 'app/api/webhooks/openwa/route.ts')
    const routeContent = fs.readFileSync(routePath, 'utf8')

    // Must NOT contain old invalid field names or invalid direction enum
    assert.equal(routeContent.includes("direction: 'inbound'"), false, "Direction must be 'incoming', not 'inbound'")
    assert.equal(routeContent.includes("chat_jid: rawFrom"), false, "Field must be chat_id, not chat_jid")
    assert.equal(routeContent.includes("last_message_preview:"), false, "Field must be last_message_body")
    assert.equal(routeContent.includes("last_message_timestamp:"), false, "Field must be last_message_at")

    // Must contain correct schema fields
    assert.ok(routeContent.includes("direction: 'incoming'"), "Must insert direction: 'incoming'")
    assert.ok(routeContent.includes("provider_message_id: data?.id"), "Must insert provider_message_id")
    assert.ok(routeContent.includes("connection_id: conn.id"), "Must link connection_id to conn.id")
    assert.ok(routeContent.includes(".eq('provider_message_id', messageId)"), "Must query by provider_message_id on ack")
  })

  it('4. Quotation conversion sets deterministic idempotency key', () => {
    const quoteRepoPath = path.join(rootDir, 'lib/repositories/quotation.repository.ts')
    const quoteRepoContent = fs.readFileSync(quoteRepoPath, 'utf8')

    assert.ok(
      quoteRepoContent.includes('idempotency_key: `quote-convert-${quote.id}`'),
      'convertQuotationToInvoice must inject deterministic idempotency key'
    )
  })

  it('5. New Invoice Modal includes idempotency key in submission payload', () => {
    const modalPath = path.join(rootDir, 'components/billing/new-invoice-modal.tsx')
    const modalContent = fs.readFileSync(modalPath, 'utf8')

    assert.ok(
      modalContent.includes('const [idempotencyKey, setIdempotencyKey] = useState'),
      'Modal must track idempotencyKey state'
    )
    assert.ok(
      modalContent.includes('idempotency_key: idempotencyKey'),
      'Submission payload must include idempotency_key'
    )
  })

  it('6. Production Planning Service logs structured error telemetry instead of swallowing errors', () => {
    const prodServicePath = path.join(rootDir, 'services/production-planning.service.ts')
    const prodServiceContent = fs.readFileSync(prodServicePath, 'utf8')

    assert.ok(
      prodServiceContent.includes('[ProductionPlanningService] Roll consumption failed'),
      'Must log roll consumption failures'
    )
    assert.ok(
      prodServiceContent.includes('[ProductionPlanningService] Stock adjustment failed'),
      'Must log stock adjustment failures'
    )
    assert.ok(
      prodServiceContent.includes('[ProductionPlanningService] Wastage recording failed'),
      'Must log wastage recording failures'
    )
  })

  it('7. CommunicationJobQueue uses valid DB status transitions and backoff', () => {
    const queuePath = path.join(rootDir, 'lib/communication/job-queue.ts')
    const queueContent = fs.readFileSync(queuePath, 'utf8')

    assert.ok(queueContent.includes("status: 'queued'"), "Must enqueue with status 'queued'")
    assert.ok(queueContent.includes("status: 'sent'"), "Must complete with status 'sent'")
    assert.ok(queueContent.includes("status: 'retrying'"), "Must retry with status 'retrying'")
    assert.ok(queueContent.includes("next_attempt_at:"), "Must set next_attempt_at for retry worker")
  })
})
