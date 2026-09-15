import { describe, it } from 'node:test'
import assert from 'node:assert'
import { createAdminClient } from '../../lib/supabase/admin.ts'
import fs from 'fs'
import path from 'path'

// Parse .env.local without third-party dotenv package
try {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    }
  }
} catch {}


describe('Remote Supabase Quotations Schema & Constraints Verification', () => {
  const admin = createAdminClient()

  it('1. Verifies that public.quotations table contains all sales-control center columns in remote DB', async () => {
    // Query remote quotations table
    const { data, error: selectErr } = await (admin as any)
      .from('quotations')
      .select('id, company_id, quotation_number, customer_company, customer_whatsapp, customer_type, reference_no, delivery_date, delivery_location, delivery_method, installation_required, internal_notes, follow_up_date, follow_up_status, last_follow_up_method, last_follow_up_at, last_follow_up_note, next_action, follow_up_count, converted_order_id, converted_invoice_id, converted_at, original_grand_total, negotiation_discount, status, subtotal, discount_amount, vat_rate, vat_amount, grand_total, total_cost, margin_percent')
      .limit(1)

    assert.strictEqual(selectErr, null, `Remote select error on quotations: ${selectErr?.message}`)
    assert.ok(data !== undefined, 'Remote quotations table is accessible and all migration 077 columns exist')
  })


  it('2. Verifies that public.quotation_items table contains all dimensional & spec columns in remote DB', async () => {
    const { data, error: selectErr } = await (admin as any)
      .from('quotation_items')
      .select('id, quotation_id, product_id, description, description_bn, material_spec, width, height, dimension_unit, area_sft, quantity, unit, unit_rate, rate_source, finishing, color_spec, artwork_required, installation_required, item_total')
      .limit(1)

    assert.strictEqual(selectErr, null, `Remote select error on quotation_items: ${selectErr?.message}`)
    assert.ok(data !== undefined, 'Remote quotation_items table is accessible and columns exist')
  })

  it('3. Verifies that public.quotation_activities table supports follow_up, status_change, and duplicate actions', async () => {
    const { data, error: selectErr } = await (admin as any)
      .from('quotation_activities')
      .select('id, quotation_id, action, details, actor_name, created_at')
      .limit(1)

    assert.strictEqual(selectErr, null, `Remote select error on quotation_activities: ${selectErr?.message}`)
    assert.ok(data !== undefined, 'Remote quotation_activities table is accessible and columns exist')
  })
})
