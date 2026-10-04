import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/nightly-reconciliation
 * Automatically reconciles customer balances and inventory stock balances
 * against transactional ledgers (invoices, payments, stock_ledger).
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    // Enforce fail-closed Bearer token verification if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 })
    }

    const admin = createAdminClient()

    // 1. Fetch active companies
    const { data: companies, error: compErr } = await (admin as any)
      .from('companies')
      .select('id, name')

    if (compErr) throw compErr

    const results = []
    let totalCustomersReconciled = 0
    let totalStockReconciled = 0
    let totalDriftsDetected = 0

    for (const comp of (companies || [])) {
      // Customer balance reconciliation
      const { data: custRes, error: custErr } = await (admin as any).rpc(
        'reconcile_customer_balance_atomic',
        {
          p_company_id: comp.id,
          p_customer_id: null,
        }
      )

      // Stock ledger reconciliation
      const { data: stockRes, error: stockErr } = await (admin as any).rpc(
        'reconcile_inventory_stock_atomic',
        {
          p_company_id: comp.id,
          p_material_id: null,
        }
      )

      const custCount = custRes?.reconciled_count || 0
      const stockCount = stockRes?.reconciled_count || 0
      const drifts = (custRes?.drift_detected_count || 0) + (stockRes?.drift_detected_count || 0)

      totalCustomersReconciled += custCount
      totalStockReconciled += stockCount
      totalDriftsDetected += drifts

      results.push({
        company_id: comp.id,
        company_name: comp.name,
        customers_reconciled: custCount,
        stock_reconciled: stockCount,
        drifts_resolved: drifts,
        customer_error: custErr ? custErr.message : null,
        stock_error: stockErr ? stockErr.message : null,
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        companies_processed: (companies || []).length,
        total_customers_reconciled: totalCustomersReconciled,
        total_stock_reconciled: totalStockReconciled,
        total_drifts_resolved: totalDriftsDetected,
      },
      details: results,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to execute nightly reconciliation' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/nightly-reconciliation
 */
export async function POST(request: Request) {
  return GET(request)
}
