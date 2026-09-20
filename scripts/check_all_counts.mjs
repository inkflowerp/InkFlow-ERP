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

async function checkCounts() {
  const tables = [
    'products',
    'product_categories',
    'product_price_history',
    'materials',
    'inventory_rolls',
    'stock_ledger',
    'material_wastages',
    'invoices',
    'invoice_items',
    'payments',
    'payment_allocations',
    'financial_write_offs',
    'quotations',
    'quotation_items',
    'sales_orders',
    'sales_order_items',
    'order_timeline_events',
    'job_orders',
    'design_jobs',
    'design_versions',
    'production_jobs',
    'production_tasks',
    'production_reworks',
    'invoice_requests',
    'delivery_challans',
    'delivery_challan_items'
  ]

  console.log('--- Supabase Table Row Counts ---')
  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
      if (error) {
        console.log(`${t.padEnd(28)}: ERROR - ${error.message}`)
      } else {
        console.log(`${t.padEnd(28)}: ${count} rows`)
      }
    } catch (err) {
      console.log(`${t.padEnd(28)}: EXCEPTION - ${err.message}`)
    }
  }
}

checkCounts().catch(console.error)
