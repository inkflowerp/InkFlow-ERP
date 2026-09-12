// ==============================================================================
// PrintERP SaaS - Business Workflow Email Service
// Connects Quotations, Invoices, Payments, Due Reminders, Design Proofs,
// and Delivery Challans to the tenant's authenticated email provider (Gmail/SMTP).
// ==============================================================================

import { EmailGatewayService } from './email-gateway.service.ts'
import type { SendEmailResult, EmailAttachment } from '../types/communication.types.ts'

export class BusinessEmailService {
  /**
   * Dispatches Quotation Email to Customer
   */
  static async sendQuotationEmail(params: {
    companyId: string
    companyName: string
    quotationId: string
    quotationNumber: string
    customerName: string
    recipientEmail: string
    grandTotal: number
    validUntil?: string
    notes?: string
    language?: 'en' | 'bn'
    sentBy?: string
    attachments?: EmailAttachment[]
  }): Promise<SendEmailResult> {
    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: params.companyId,
      eventType: 'quotation_sent',
      recipient: params.recipientEmail,
      language: params.language || 'bn',
      variables: {
        customer_name: params.customerName,
        company_name: params.companyName,
        invoice_number: params.quotationNumber,
        quotation_number: params.quotationNumber,
        amount: params.grandTotal.toLocaleString('en-IN'),
        grand_total: params.grandTotal.toLocaleString('en-IN'),
        valid_until: params.validUntil || '15 days from issuance',
        notes: params.notes || '',
        timestamp: new Date().toLocaleDateString(),
      },
      attachments: params.attachments,
      idempotencyKey: `quote:${params.quotationId}:${params.recipientEmail}`,
      sentBy: params.sentBy,
    })
  }

  /**
   * Dispatches Invoice Bill & Payment Link Email to Customer
   */
  static async sendInvoiceEmail(params: {
    companyId: string
    companyName: string
    invoiceId: string
    invoiceNumber: string
    customerName: string
    recipientEmail: string
    totalAmount: number
    paidAmount: number
    dueAmount: number
    dueDate?: string
    paymentLink?: string
    language?: 'en' | 'bn'
    sentBy?: string
    attachments?: EmailAttachment[]
  }): Promise<SendEmailResult> {
    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: params.companyId,
      eventType: 'invoice_created',
      recipient: params.recipientEmail,
      language: params.language || 'bn',
      variables: {
        customer_name: params.customerName,
        company_name: params.companyName,
        invoice_number: params.invoiceNumber,
        total_amount: params.totalAmount.toLocaleString('en-IN'),
        paid_amount: params.paidAmount.toLocaleString('en-IN'),
        due_amount: params.dueAmount.toLocaleString('en-IN'),
        due_date: params.dueDate || 'Upon receipt',
        payment_link: params.paymentLink || '',
        timestamp: new Date().toLocaleDateString(),
      },
      attachments: params.attachments,
      idempotencyKey: `invoice:${params.invoiceId}:${params.recipientEmail}`,
      sentBy: params.sentBy,
    })
  }

  /**
   * Dispatches Payment Receipt Voucher to Customer
   */
  static async sendPaymentReceiptEmail(params: {
    companyId: string
    companyName: string
    paymentId: string
    receiptNumber: string
    invoiceNumber: string
    customerName: string
    recipientEmail: string
    amountPaid: number
    remainingDue: number
    paymentMethod: string
    language?: 'en' | 'bn'
    sentBy?: string
    attachments?: EmailAttachment[]
  }): Promise<SendEmailResult> {
    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: params.companyId,
      eventType: 'payment_received',
      recipient: params.recipientEmail,
      language: params.language || 'bn',
      variables: {
        customer_name: params.customerName,
        company_name: params.companyName,
        invoice_number: params.invoiceNumber,
        receipt_number: params.receiptNumber,
        amount: params.amountPaid.toLocaleString('en-IN'),
        paid_amount: params.amountPaid.toLocaleString('en-IN'),
        due_amount: params.remainingDue.toLocaleString('en-IN'),
        payment_method: params.paymentMethod,
        timestamp: new Date().toLocaleString(),
      },
      attachments: params.attachments,
      idempotencyKey: `payment:${params.paymentId}:${params.recipientEmail}`,
      sentBy: params.sentBy,
    })
  }

  /**
   * Dispatches Overdue Payment Reminder to Customer
   */
  static async sendDueReminderEmail(params: {
    companyId: string
    companyName: string
    customerName: string
    recipientEmail: string
    totalDueAmount: number
    overdueInvoicesSummary: string
    language?: 'en' | 'bn'
    sentBy?: string
  }): Promise<SendEmailResult> {
    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: params.companyId,
      eventType: 'due_reminder',
      recipient: params.recipientEmail,
      language: params.language || 'bn',
      variables: {
        customer_name: params.customerName,
        company_name: params.companyName,
        invoice_number: params.overdueInvoicesSummary,
        due_amount: params.totalDueAmount.toLocaleString('en-IN'),
        amount: params.totalDueAmount.toLocaleString('en-IN'),
        timestamp: new Date().toLocaleDateString(),
      },
      idempotencyKey: `due_reminder:${params.companyId}:${params.recipientEmail}:${new Date().toISOString().slice(0, 10)}`,
      sentBy: params.sentBy,
    })
  }

  /**
   * Dispatches Graphic Design Proof Approval Request to Client
   */
  static async sendDesignApprovalEmail(params: {
    companyId: string
    companyName: string
    designId: string
    jobTitle: string
    customerName: string
    recipientEmail: string
    proofUrl: string
    approvalDeadline?: string
    language?: 'en' | 'bn'
    sentBy?: string
    attachments?: EmailAttachment[]
  }): Promise<SendEmailResult> {
    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: params.companyId,
      eventType: 'design_approval_request',
      recipient: params.recipientEmail,
      language: params.language || 'bn',
      variables: {
        customer_name: params.customerName,
        company_name: params.companyName,
        job_title: params.jobTitle,
        proof_link: params.proofUrl,
        approval_deadline: params.approvalDeadline || 'Within 24 hours',
        timestamp: new Date().toLocaleString(),
      },
      attachments: params.attachments,
      idempotencyKey: `design_proof:${params.designId}:${params.recipientEmail}`,
      sentBy: params.sentBy,
    })
  }

  /**
   * Dispatches Delivery Challan Dispatch Notification
   */
  static async sendDeliveryEmail(params: {
    companyId: string
    companyName: string
    deliveryId: string
    challanNumber: string
    orderNumber: string
    customerName: string
    recipientEmail: string
    deliveryDate: string
    driverContact?: string
    language?: 'en' | 'bn'
    sentBy?: string
  }): Promise<SendEmailResult> {
    return await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: params.companyId,
      eventType: 'delivery_completed',
      recipient: params.recipientEmail,
      language: params.language || 'bn',
      variables: {
        customer_name: params.customerName,
        company_name: params.companyName,
        order_number: params.orderNumber,
        challan_number: params.challanNumber,
        delivery_date: params.deliveryDate,
        driver_contact: params.driverContact || 'Our delivery representative',
        timestamp: new Date().toLocaleString(),
      },
      idempotencyKey: `delivery:${params.deliveryId}:${params.recipientEmail}`,
      sentBy: params.sentBy,
    })
  }
}
