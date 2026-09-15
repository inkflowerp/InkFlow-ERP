import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Load .env.local
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

console.log('Connecting to Supabase:', supabaseUrl)
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
})

async function checkSchema() {
  console.log('\n--- 1. Testing invoices table query with all columns ---')
  const { data: invData, error: invError } = await supabase
    .from('invoices')
    .select('id, company_id, invoice_number, customer_id, customer_name, customer_email, quotation_id, quotation_number, job_order_id, job_number, subtotal, discount_amount, vat_percentage, vat_amount, grand_total, paid_amount, due_amount, status, created_at')
    .limit(1)

  if (invError) {
    console.error('❌ Error querying invoices with extended columns:', invError.message)
  } else {
    console.log('✅ Invoices table successfully returned extended columns. Rows found:', invData?.length)
    if (invData && invData.length > 0) {
      console.log('Sample invoice row:', invData[0])
    }
  }

  console.log('\n--- 2. Testing invoice_items table query with finishing column ---')
  const { data: itemData, error: itemError } = await supabase
    .from('invoice_items')
    .select('id, invoice_id, item_description, quantity, unit, unit_price, finishing, total_price')
    .limit(1)

  if (itemError) {
    console.error('❌ Error querying invoice_items with finishing column:', itemError.message)
  } else {
    console.log('✅ Invoice_items table successfully returned finishing column. Rows found:', itemData?.length)
  }

  console.log('\n--- 3. Testing companies in database ---')
  const { data: compData, error: compError } = await supabase
    .from('companies')
    .select('id, name, slug')
    .limit(10)

  if (compError) {
    console.error('❌ Error querying companies:', compError.message)
  } else {
    console.log('✅ Companies in database:', compData)
  }

  console.log('\n--- 4. Testing customers in database ---')
  const { data: custData, error: custError } = await supabase
    .from('customers')
    .select('id, name, company_id, mobile, total_due_balance, total_invoiced_amount')
    .limit(5)

  if (custError) {
    console.error('❌ Error querying customers:', custError.message)
  } else {
    console.log('✅ Customers in database:', custData)
  }

  console.log('\n--- 5. Testing financial RPCs ---')
  const { data: rpcData, error: rpcError } = await supabase.rpc('reconcile_customer_balances', {
    p_company_id: compData?.[0]?.id || '00000000-0000-0000-0000-000000000000',
    p_auto_fix: false
  })
  if (rpcError) {
    console.log('RPC reconcile_customer_balances status:', rpcError.message)
  } else {
    console.log('✅ RPC reconcile_customer_balances executed successfully:', rpcData)
  }
}

checkSchema().catch(console.error)
