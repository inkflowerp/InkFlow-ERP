import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=')
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim()
      let val = trimmed.slice(idx + 1).trim()
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  }
}

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

export async function executePurge() {
  console.log('=== STARTING PURGE OF PRODUCTS, INVOICES, QUOTATIONS & WORKS ===')
  
  // Get active companies
  const { data: companies, error: compErr } = await supabase.from('companies').select('id, name, slug')
  if (compErr) {
    console.error('Failed to get companies:', compErr.message)
    return
  }

  const companyIds = companies.map(c => c.id)
  console.log(`Targeting ${companies.length} company/companies:`, companies.map(c => `${c.name} (${c.id})`))

  const tablesToPurge = [
    'invoice_requests',
    'delivery_challan_items',
    'delivery_challans',
    'production_tasks',
    'production_reworks',
    'production_jobs',
    'design_versions',
    'design_jobs',
    'job_orders',
    'order_timeline_events',
    'sales_order_items',
    'sales_orders',
    'financial_write_offs',
    'payment_allocations',
    'payments',
    'invoice_items',
    'invoices',
    'quotation_items',
    'quotations',
    'stock_ledger',
    'inventory_rolls',
    'material_wastages',
    'product_price_history',
    'supplier_material_prices',
    'materials',
    'products',
    'product_categories',
    'printing_methods',
    'finishing_options',
    'additional_options',
    'installation_options'
  ]

  for (const table of tablesToPurge) {
    try {
      const { error, count } = await supabase.from(table).delete({ count: 'exact' }).in('company_id', companyIds)
      if (error) {
        // Fallback for tables without company_id
        const { error: fbErr, count: fbCount } = await supabase.from(table).delete({ count: 'exact' }).neq('id', '00000000-0000-0000-0000-000000000000')
        if (fbErr) {
          console.warn(`! Warning on ${table}: ${fbErr.message}`)
        } else {
          console.log(`✓ Purged table ${table} (${fbCount ?? 0} rows deleted)`)
        }
      } else {
        console.log(`✓ Purged table ${table} (${count ?? 0} rows deleted)`)
      }
    } catch (err) {
      console.warn(`! Exception on ${table}: ${err.message}`)
    }
  }

  // Reset customer balances
  const { error: custErr } = await supabase.from('customers').update({ total_due_balance: 0, total_invoiced_amount: 0 }).in('company_id', companyIds)
  if (custErr) {
    console.warn('! Customer balance reset notice:', custErr.message)
  } else {
    console.log('✓ Reset customer balances to 0')
  }

  // Reset document sequences
  try {
    await supabase.from('document_sequences').update({ current_val: 0 }).in('company_id', companyIds)
    console.log('✓ Reset document_sequences to 0')
  } catch (e) {}

  try {
    await supabase.from('document_number_counters').update({ current_value: 0 }).in('company_id', companyIds)
    console.log('✓ Reset document_number_counters to 0')
  } catch (e) {}

  console.log('=== PURGE COMPLETE ===')
}

// Only run if called directly with --confirm flag
if (process.argv.includes('--confirm')) {
  executePurge().catch(console.error)
} else {
  console.log('To execute this purge, pass the `--confirm` flag.')
}
