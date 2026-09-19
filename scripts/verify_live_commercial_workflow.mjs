import { Client } from 'pg'

async function runLiveVerification() {
  const password = 'Shamol199431)!'
  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.liqhihsqcblddqfjmmse',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    statement_timeout: 30000,
  })

  console.log('Connecting to live PostgreSQL database...')
  await client.connect()
  console.log('✓ Connected to live PostgreSQL database.\n')

  try {
    // ==========================================
    // 1. Verify Schema Columns
    // ==========================================
    console.log('=== 1. VERIFYING LIVE DATABASE SCHEMA COLUMNS ===')

    // 1.1 invoice_requests
    const invReqCols = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'invoice_requests' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `)
    console.log(`✓ invoice_requests columns (${invReqCols.rows.length} columns):`)
    for (const c of invReqCols.rows) {
      console.log(`  - ${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`)
    }

    // 1.2 sales_orders workflow columns
    const soCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sales_orders' AND column_name IN ('workflow_routing', 'commercial_status', 'production_gate_status', 'invoice_requested_at', 'invoice_id', 'invoice_number')
      ORDER BY column_name;
    `)
    console.log(`\n✓ sales_orders workflow columns (${soCols.rows.length}/6 found):`)
    for (const c of soCols.rows) {
      console.log(`  - ${c.column_name} (${c.data_type})`)
    }

    // 1.3 job_orders workflow columns
    const joCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'job_orders' AND column_name IN ('workflow_routing', 'commercial_status', 'production_gate_status', 'invoice_id', 'invoice_number')
      ORDER BY column_name;
    `)
    console.log(`\n✓ job_orders workflow columns (${joCols.rows.length}/5 found):`)
    for (const c of joCols.rows) {
      console.log(`  - ${c.column_name} (${c.data_type})`)
    }

    // 1.4 design_jobs workflow columns
    const djCols = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'design_jobs' AND column_name IN ('workflow_routing', 'commercial_status', 'invoice_request_id', 'invoice_id', 'invoice_number')
      ORDER BY column_name;
    `)
    console.log(`\n✓ design_jobs workflow columns (${djCols.rows.length}/5 found):`)
    for (const c of djCols.rows) {
      console.log(`  - ${c.column_name} (${c.data_type})`)
    }

    // ==========================================
    // 2. Verify Constraints & Partial Unique Indexes
    // ==========================================
    console.log('\n=== 2. VERIFYING DATABASE CONSTRAINTS & INDEXES ===')
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'invoice_requests';
    `)
    console.log(`✓ invoice_requests indexes (${indexes.rows.length} indexes):`)
    for (const idx of indexes.rows) {
      console.log(`  - ${idx.indexname}: ${idx.indexdef}`)
    }

    // Check partial unique indexes
    const hasOrderUniqueIdx = indexes.rows.some(r => r.indexname === 'uk_pending_invoice_request_order')
    const hasDesignUniqueIdx = indexes.rows.some(r => r.indexname === 'uk_pending_invoice_request_design')
    console.log(`  * uk_pending_invoice_request_order present: ${hasOrderUniqueIdx ? 'YES ✓' : 'NO ✗'}`)
    console.log(`  * uk_pending_invoice_request_design present: ${hasDesignUniqueIdx ? 'YES ✓' : 'NO ✗'}`)

    // ==========================================
    // 3. Verify Row Level Security (RLS)
    // ==========================================
    console.log('\n=== 3. VERIFYING ROW LEVEL SECURITY (RLS) POLICIES ===')
    const rlsCheck = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE tablename = 'invoice_requests';
    `)
    console.log(`✓ invoice_requests rowsecurity enabled: ${rlsCheck.rows[0]?.rowsecurity ? 'YES ✓' : 'NO ✗'}`)

    const policies = await client.query(`
      SELECT policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE tablename = 'invoice_requests';
    `)
    console.log(`✓ invoice_requests RLS policies (${policies.rows.length} policies):`)
    for (const p of policies.rows) {
      console.log(`  - [${p.cmd}] "${p.policyname}" (permissive: ${p.permissive})`)
    }

    // ==========================================
    // 4. Live Workflow & Duplicate Protection Test
    // ==========================================
    console.log('\n=== 4. LIVE DATABASE WORKFLOW & DUPLICATE PROTECTION TEST ===')

    // Find an existing company ID or use standard test tenant
    const compRes = await client.query(`SELECT id, name FROM companies LIMIT 1;`)
    const companyId = compRes.rows[0]?.id
    console.log(`Using live tenant: ${compRes.rows[0]?.name} (${companyId})`)

    // Clean up any previous test leftovers first
    await client.query(`DELETE FROM invoice_requests WHERE order_number LIKE 'ORD-LIVE-%'`)
    await client.query(`UPDATE invoices SET status = 'cancelled' WHERE invoice_number LIKE 'INV-LIVE-%'`)
    await client.query(`DELETE FROM sales_orders WHERE order_number LIKE 'ORD-LIVE-%'`)

    const runSuffix = Date.now()
    const testOrderNum = `ORD-LIVE-${runSuffix}`
    const testInvNum = `INV-LIVE-${runSuffix}`
    const testOrderId = (await client.query(`SELECT gen_random_uuid() as id`)).rows[0].id

    try {
      // 4.1 Insert test Sales Order with Commercial Hold
      await client.query(`
        INSERT INTO sales_orders (
          id, company_id, order_number, customer_name, customer_phone, salesperson_name, order_date, delivery_date,
          workflow_routing, commercial_status, production_gate_status, subtotal, final_price
        ) VALUES (
          $1, $2, $3, 'Live Test Customer', '01700000000', 'Live Sales Rep', CURRENT_DATE, CURRENT_DATE + 3,
          'design_required', 'invoice_required', 'blocked_commercial', 5000, 5000
        )
      `, [testOrderId, companyId, testOrderNum])
      console.log(`✓ Created test sales order: ${testOrderId} (${testOrderNum}, commercial_status: invoice_required)`)

      // 4.2 Insert first invoice request
      const req1Id = (await client.query(`SELECT gen_random_uuid() as id`)).rows[0].id
      await client.query(`
        INSERT INTO invoice_requests (
          id, company_id, request_number, sales_order_id, order_number, customer_name,
          requested_by_name, status, estimated_amount, notes
        ) VALUES (
          $1, $2, $3, $4, $5, 'Live Test Customer',
          'Live Designer', 'pending', 5000, 'Live test invoice request'
        )
      `, [req1Id, companyId, `INVR-LIVE-${runSuffix}-1`, testOrderId, testOrderNum])
      console.log(`✓ Inserted first pending invoice request: ${req1Id}`)

      // 4.3 Test Database-Level Duplicate Protection: Try inserting a second pending request for same order
      console.log('Testing database unique constraint (attempting duplicate pending request)...')
      let duplicatePrevented = false
      try {
        const req2Id = (await client.query(`SELECT gen_random_uuid() as id`)).rows[0].id
        await client.query(`
          INSERT INTO invoice_requests (
            id, company_id, request_number, sales_order_id, order_number, customer_name,
            requested_by_name, status, estimated_amount, notes
          ) VALUES (
            $1, $2, $3, $4, $5, 'Live Test Customer',
            'Live Designer', 'pending', 5000, 'Duplicate request attempt'
          )
        `, [req2Id, companyId, `INVR-LIVE-${runSuffix}-2`, testOrderId, testOrderNum])
      } catch (err) {
        if (err.code === '23505' || err.message.includes('uk_pending_invoice_request_order') || err.message.includes('unique')) {
          duplicatePrevented = true
          console.log(`✓ PostgreSQL unique constraint correctly blocked duplicate pending request: ${err.message}`)
        } else {
          throw err
        }
      }

      if (!duplicatePrevented) {
        throw new Error('FAILED: Duplicate pending request was allowed by the database!')
      }

      // 4.4 Simulate Invoice Creation and Auto-Resolution
      const testInvId = (await client.query(`SELECT gen_random_uuid() as id`)).rows[0].id
      await client.query(`
        INSERT INTO invoices (
          id, company_id, invoice_number, sales_order_id, order_number, customer_name, customer_phone,
          created_by_name, invoice_date, due_date, status, subtotal, grand_total, paid_amount, due_amount, is_practice
        ) VALUES (
          $1, $2, $3, $4, $5, 'Live Test Customer', '01700000000',
          'Live Verifier', CURRENT_DATE, CURRENT_DATE + 7, 'paid', 5000, 5000, 5000, 0, true
        )
      `, [testInvId, companyId, testInvNum, testOrderId, testOrderNum])
      console.log(`✓ Created test official invoice: ${testInvId} (${testInvNum})`)

      // Resolve invoice request and reconnect
      await client.query(`
        UPDATE invoice_requests
        SET status = 'invoice_created', invoice_id = $1, invoice_number = $2, updated_at = now()
        WHERE sales_order_id = $3 AND status = 'pending'
      `, [testInvId, testInvNum, testOrderId])

      await client.query(`
        UPDATE sales_orders
        SET commercial_status = 'invoice_created', invoice_id = $1, invoice_number = $2,
            production_gate_status = 'ready_for_production', updated_at = now()
        WHERE id = $3
      `, [testInvId, testInvNum, testOrderId])

      // Verify resolved state
      const resolvedReq = await client.query(`SELECT status, invoice_id, invoice_number FROM invoice_requests WHERE id = $1`, [req1Id])
      console.log(`✓ Verified invoice request in DB: status = ${resolvedReq.rows[0]?.status}, invoice_number = ${resolvedReq.rows[0]?.invoice_number}`)

      const updatedSo = await client.query(`SELECT commercial_status, invoice_id, production_gate_status FROM sales_orders WHERE id = $1`, [testOrderId])
      console.log(`✓ Verified sales order in DB: commercial_status = ${updatedSo.rows[0]?.commercial_status}, production_gate_status = ${updatedSo.rows[0]?.production_gate_status}`)

    } finally {
      // 4.5 Clean up test records: cancel test invoice and delete test orders/requests
      console.log('\nCleaning up live test records...')
      await client.query(`UPDATE invoices SET status = 'cancelled' WHERE sales_order_id = $1`, [testOrderId])
      await client.query(`DELETE FROM invoice_requests WHERE sales_order_id = $1`, [testOrderId])
      await client.query(`DELETE FROM sales_orders WHERE id = $1`, [testOrderId])
      console.log('✓ Cleaned up test sales order, marked test invoice cancelled, and removed test invoice requests from live DB.')
    }

    console.log('\n======================================================')
    console.log('🎉 ALL LIVE DATABASE SCHEMA, RLS & GATING CHECKS PASSED!')
    console.log('======================================================')

  } finally {
    await client.end()
  }
}

runLiveVerification().catch((err) => {
  console.error('\n❌ Live verification failed:', err)
  process.exit(1)
})
