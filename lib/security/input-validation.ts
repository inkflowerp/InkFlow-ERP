// ==============================================================================
// PrintERP SaaS - Phase 22: Strict Input Validation Schemas (Zod)
// Guards financial actions, user inputs, customer records, and inventory mutations.
// ==============================================================================

import { z } from 'zod'

// 1. Customer Edit Schema
export const CustomerEditSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(150),
  name_bn: z.string().optional().nullable(),
  phone: z.string().regex(/^(?:\+8801|01)[3-9]\d{8}$/, 'Valid Bangladeshi phone number required'),
  email: z.string().email('Valid email required').optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  bin_no: z.string().max(20).optional().nullable(),
  credit_limit: z.number().min(0).max(100000000).optional().default(0),
})

// 2. Quotation Edit & Price Override Schemas
export const QuotationEditSchema = z.object({
  quotation_id: z.string().min(1),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unit_price: z.number().nonnegative(),
      discount_amount: z.number().nonnegative().optional().default(0),
    })
  ).min(1, 'Quotation must have at least one item'),
  notes: z.string().max(1000).optional(),
})

export const PriceOverrideSchema = z.object({
  order_id: z.string().optional(),
  quotation_id: z.string().optional(),
  item_id: z.string().min(1, 'Item ID required'),
  standard_price: z.number().positive(),
  approved_price: z.number().positive(),
  override_reason: z.string().min(5, 'Reason must be at least 5 characters'),
  authorized_by_id: z.string().min(1, 'Authorizing executive required'),
})

// 3. Order Cancellation Schema
export const OrderCancelSchema = z.object({
  order_id: z.string().min(1, 'Order ID is required'),
  reason: z.string().min(5, 'Cancellation reason is required (min 5 chars)'),
  authorized_by_name: z.string().min(2, 'Authorizer name required'),
  refund_requested: z.boolean().default(false),
})

// 4. Invoice Create Schema
export const InvoiceCreateSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  due_date: z.string().min(1, 'Due date is required'),
  subtotal: z.number().positive('Subtotal must be greater than 0'),
  vat_percentage: z.number().min(0).max(100).default(0),
  discount_amount: z.number().min(0).default(0),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unit_price: z.number().positive(),
    })
  ).min(1, 'Invoice must have at least one line item'),
})

// 5. Payment Record Schema
export const PaymentRecordSchema = z.object({
  customer_id: z.string().min(1, 'Customer ID required'),
  amount: z.number().positive('Payment amount must be greater than 0'),
  payment_method: z.enum(['cash', 'bkash', 'nagad', 'rocket', 'bank', 'cheque']),
  payment_date: z.string().min(1, 'Payment date required'),
  receipt_number: z.string().min(1, 'Receipt number required'),
  notes: z.string().max(500).optional(),
  received_by_name: z.string().min(2, 'Collector name required'),
})

// 6. Financial Anti-Deletion Actions (Void, Cancel, Reverse, Adjust)
export const FinancialVoidCancelSchema = z.object({
  entity_type: z.enum(['invoice', 'expense']),
  entity_id: z.string().min(1, 'Entity ID required'),
  action: z.enum(['void', 'cancel']),
  reason: z.string().min(5, 'Audit justification required (min 5 chars)'),
  authorized_by_name: z.string().min(2, 'Authorizing executive required'),
})

export const PaymentAdjustmentSchema = z.object({
  payment_id: z.string().min(1, 'Payment ID required'),
  type: z.enum(['reversal', 'adjustment']),
  adjusted_amount: z.number().min(0, 'Adjusted amount must be non-negative'),
  reason: z.string().min(5, 'Adjustment reason required (min 5 chars)'),
  authorized_by_name: z.string().min(2, 'Authorizing supervisor required'),
})

// 7. Expense Record Schema
export const ExpenseRecordSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Expense amount must be positive'),
  payment_method: z.string().min(1, 'Payment method required'),
  expense_date: z.string().min(1, 'Date required'),
  purpose: z.string().min(3, 'Purpose description required'),
  authorized_by: z.string().min(2, 'Authorizer required'),
})

// 8. Inventory Adjustment Schema
export const InventoryAdjustmentSchema = z.object({
  material_id: z.string().min(1, 'Material ID required'),
  transaction_type: z.enum([
    'purchase',
    'consumption',
    'adjustment',
    'return',
    'wastage',
    'transfer',
    'opening_stock',
  ]),
  quantity_change: z.number().refine((val) => val !== 0, 'Quantity change cannot be zero'),
  unit_cost: z.number().min(0).default(0),
  reason: z.string().min(3, 'Adjustment reason is required'),
  performed_by_name: z.string().min(2, 'Operator name is required'),
})

// 9. Payroll Approval Schema
export const PayrollApproveSchema = z.object({
  payroll_month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM'),
  total_payout: z.number().positive(),
  employee_count: z.number().int().positive(),
  authorized_by_name: z.string().min(2),
  notes: z.string().optional(),
})

// 10. Settings & Subscription Changes
export const SettingsChangeSchema = z.object({
  company_id: z.string().min(1),
  settings: z.record(z.string(), z.any()),
  reason: z.string().optional(),
})
