// ==============================================================================
// InkFlow SaaS - Financial & Payment Integrity Service
// Strictly enforces non-destructive financial patterns: VOID, CANCEL, REVERSE, ADJUST
// Historical payment records and invoices can never be deleted.
// ==============================================================================

import { createClient } from '@/lib/supabase/server'
import { PaymentAdjustmentRecord } from '@/types/audit.types'
import { AuditService } from '@/services/audit.service'
import { ApiResponse } from '@/types/common.types'

export class FinancialIntegrityService {
  /**
   * 1. INVOICE VOID WORKFLOW
   * Changes status to 'void'. Does NOT allow silent deletion.
   */
  static async voidInvoice(
    companyId: string,
    invoiceId: string,
    reason: string,
    authorizedByName: string,
    actorEmail?: string
  ): Promise<ApiResponse<{ invoiceId: string; status: 'void'; reason: string }>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      if (!reason || reason.trim().length < 5) {
        return { success: false, error: 'Detailed audit justification is required to void an invoice (min 5 characters).' }
      }

      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('invoices')
        .update({
          status: 'void',
          notes: `[VOIDED on ${new Date().toISOString()}] Reason: ${reason} (Auth: ${authorizedByName})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId)

      if (error) {
        return { success: false, error: `Failed to void invoice in database: ${error.message}` }
      }

      // Record immutable audit event
      await AuditService.logEvent(
        companyId,
        null,
        actorEmail || authorizedByName,
        'invoice.void',
        'invoice',
        invoiceId,
        { status: 'active' },
        { status: 'void', void_reason: reason, authorized_by: authorizedByName },
        `Voided invoice ${invoiceId}: ${reason}`
      )

      return {
        success: true,
        data: { invoiceId, status: 'void', reason },
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to void invoice' }
    }
  }

  /**
   * 2. INVOICE CANCEL WORKFLOW
   */
  static async cancelInvoice(
    companyId: string,
    invoiceId: string,
    reason: string,
    authorizedByName: string,
    actorEmail?: string
  ): Promise<ApiResponse<{ invoiceId: string; status: 'cancelled'; reason: string }>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      if (!reason || reason.trim().length < 5) {
        return { success: false, error: 'Detailed reason required to cancel invoice.' }
      }

      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('invoices')
        .update({
          status: 'cancelled',
          notes: `[CANCELLED on ${new Date().toISOString()}] Reason: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('company_id', companyId)

      if (error) {
        return { success: false, error: `Failed to cancel invoice: ${error.message}` }
      }

      await AuditService.logEvent(
        companyId,
        null,
        actorEmail || authorizedByName,
        'invoice.cancel',
        'invoice',
        invoiceId,
        { status: 'issued' },
        { status: 'cancelled', cancellation_reason: reason, authorized_by: authorizedByName },
        `Cancelled invoice ${invoiceId}: ${reason}`
      )

      return {
        success: true,
        data: { invoiceId, status: 'cancelled', reason },
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to cancel invoice' }
    }
  }

  /**
   * 3. PAYMENT REVERSAL WORKFLOW
   * Reverses a historical payment by creating a reversal transaction without deleting history.
   */
  static async reversePayment(
    companyId: string,
    paymentId: string,
    receiptNumber: string,
    originalAmount: number,
    reason: string,
    authorizedByName: string,
    actorEmail?: string
  ): Promise<ApiResponse<PaymentAdjustmentRecord>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      if (!reason || reason.trim().length < 5) {
        return { success: false, error: 'Valid reversal reason required (min 5 characters).' }
      }

      const supabase = await createClient()
      const { data, error: insertError } = await (supabase as any)
        .from('payment_adjustments')
        .insert({
          company_id: companyId,
          payment_id: paymentId,
          type: 'reversal',
          original_amount: originalAmount,
          adjusted_amount: 0,
          difference_amount: -originalAmount,
          reason,
          authorized_by_name: authorizedByName,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        return { success: false, error: `Failed to create payment reversal record: ${insertError.message}` }
      }

      const { error: updateError } = await (supabase as any)
        .from('payments')
        .update({
          notes: `[REVERSED on ${new Date().toISOString()}] Reason: ${reason} (Auth: ${authorizedByName})`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)
        .eq('company_id', companyId)

      if (updateError) {
        console.warn(`Could not update notes on payment ${paymentId}: ${updateError.message}`)
      }

      // Record audit log
      await AuditService.logEvent(
        companyId,
        null,
        actorEmail || authorizedByName,
        'payment.reverse',
        'payment',
        paymentId,
        { amount: originalAmount, status: 'recorded' },
        { reversal_amount: -originalAmount, status: 'reversed', reason },
        `Reversed payment MR ${receiptNumber} of ৳${originalAmount.toLocaleString()}: ${reason}`
      )

      return { success: true, data: data as PaymentAdjustmentRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reverse payment' }
    }
  }

  /**
   * 4. PAYMENT ADJUSTMENT WORKFLOW
   * Creates a formal adjustment record linking to the historical payment.
   */
  static async adjustPayment(
    companyId: string,
    paymentId: string,
    receiptNumber: string,
    originalAmount: number,
    adjustedAmount: number,
    reason: string,
    authorizedByName: string,
    actorEmail?: string
  ): Promise<ApiResponse<PaymentAdjustmentRecord>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      if (!reason || reason.trim().length < 5) {
        return { success: false, error: 'Valid adjustment reason required.' }
      }

      const diff = adjustedAmount - originalAmount
      const supabase = await createClient()
      const { data, error: insertError } = await (supabase as any)
        .from('payment_adjustments')
        .insert({
          company_id: companyId,
          payment_id: paymentId,
          type: 'adjustment',
          original_amount: originalAmount,
          adjusted_amount: adjustedAmount,
          difference_amount: diff,
          reason,
          authorized_by_name: authorizedByName,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (insertError) {
        return { success: false, error: `Failed to record payment adjustment: ${insertError.message}` }
      }

      // Audit log entry
      await AuditService.logEvent(
        companyId,
        null,
        actorEmail || authorizedByName,
        'payment.adjust',
        'payment',
        paymentId,
        { original_amount: originalAmount },
        { adjusted_amount: adjustedAmount, difference: diff, reason },
        `Adjusted payment MR ${receiptNumber}: ৳${originalAmount} ➔ ৳${adjustedAmount} (Diff: ৳${diff})`
      )

      return { success: true, data: data as PaymentAdjustmentRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record payment adjustment' }
    }
  }

  /**
   * 5. EXPENSE REVERSAL WORKFLOW
   */
  static async reverseExpense(
    companyId: string,
    expenseId: string,
    originalAmount: number,
    reason: string,
    authorizedByName: string,
    actorEmail?: string
  ): Promise<ApiResponse<{ expenseId: string; status: 'reversed'; reason: string }>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const supabase = await createClient()
      const { error } = await (supabase as any)
        .from('expenses')
        .update({
          status: 'reversed',
          notes: `[REVERSED on ${new Date().toISOString()}] Reason: ${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', expenseId)
        .eq('company_id', companyId)

      if (error) {
        return { success: false, error: `Failed to reverse expense in database: ${error.message}` }
      }

      await AuditService.logEvent(
        companyId,
        null,
        actorEmail || authorizedByName,
        'expense.reverse',
        'expense',
        expenseId,
        { amount: originalAmount, status: 'approved' },
        { status: 'reversed', reversal_reason: reason },
        `Reversed expense ${expenseId} of ৳${originalAmount.toLocaleString()}: ${reason}`
      )

      return {
        success: true,
        data: { expenseId, status: 'reversed', reason },
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reverse expense' }
    }
  }

  /**
   * Fetch all payment adjustments for a company
   */
  static async getPaymentAdjustments(companyId: string): Promise<ApiResponse<PaymentAdjustmentRecord[]>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('payment_adjustments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: `Failed to fetch adjustments: ${error.message}` }
      }
      return { success: true, data: (data || []) as PaymentAdjustmentRecord[] }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch adjustments' }
    }
  }
}

