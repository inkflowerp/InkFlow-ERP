// ==============================================================================
// PrintERP SaaS - Native PDF Generator Service
// Generates standards-compliant PDF 1.4 document buffers for Quotations and Invoices
// with zero external runtime dependencies.
// ==============================================================================

import type { QuotationRecord } from '../types/quotation.types.ts'
import type { InvoiceRecord } from '../types/billing.types.ts'

function formatMoney(amount: any): string {
  const num = Number(amount) || 0
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface DrawOptions {
  fill?: [number, number, number]
  stroke?: [number, number, number]
  lineWidth?: number
}

interface TextOptions {
  font?: 'F1' | 'F2' | 'F3'
  size?: number
  color?: [number, number, number]
  align?: 'left' | 'right' | 'center'
  width?: number
}

class SimplePdfBuilder {
  private width = 595.28 // A4 width in pt
  private height = 841.89 // A4 height in pt
  private streamCommands: string[] = []

  constructor(width = 595.28, height = 841.89) {
    this.width = width
    this.height = height
  }

  // Set background fill / stroke
  drawRect(x: number, y: number, w: number, h: number, opts: DrawOptions = {}): void {
    const pdfY = this.height - y - h
    let cmd = ''
    if (opts.lineWidth !== undefined) {
      cmd += `${opts.lineWidth} w `
    }
    if (opts.stroke) {
      const [r, g, b] = opts.stroke
      cmd += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG `
    }
    if (opts.fill) {
      const [r, g, b] = opts.fill
      cmd += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg `
    }
    cmd += `${x.toFixed(2)} ${pdfY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re `
    if (opts.fill && opts.stroke) {
      cmd += 'B\n'
    } else if (opts.fill) {
      cmd += 'f\n'
    } else {
      cmd += 'S\n'
    }
    this.streamCommands.push(cmd)
  }

  drawLine(x1: number, y1: number, x2: number, y2: number, opts: DrawOptions = {}): void {
    const py1 = this.height - y1
    const py2 = this.height - y2
    let cmd = ''
    if (opts.lineWidth !== undefined) {
      cmd += `${opts.lineWidth} w `
    }
    if (opts.stroke) {
      const [r, g, b] = opts.stroke
      cmd += `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG `
    }
    cmd += `${x1.toFixed(2)} ${py1.toFixed(2)} m ${x2.toFixed(2)} ${py2.toFixed(2)} l S\n`
    this.streamCommands.push(cmd)
  }

  drawText(text: string, x: number, y: number, opts: TextOptions = {}): void {
    if (!text) return
    const font = opts.font || 'F1'
    const size = opts.size || 10
    const color = opts.color || [30, 41, 59] // Slate 800
    const [r, g, b] = color
    const align = opts.align || 'left'
    const pdfY = this.height - y - size

    // Sanitize ASCII for Standard Type1 Helvetica
    const sanitized = text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, (char) => {
        // Replace Bengali or unicode currency / bullet symbols with clean equivalents
        if (char === '৳') return 'Tk '
        if (char === '•') return '-'
        return ''
      })

    const approxCharWidth = size * (font === 'F2' ? 0.58 : 0.52)
    const textWidth = sanitized.length * approxCharWidth
    let adjustedX = x

    if (align === 'right') {
      adjustedX = x - textWidth
    } else if (align === 'center') {
      adjustedX = x - textWidth / 2
    }

    const cmd = `BT\n/${font} ${size} Tf\n${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg\n${adjustedX.toFixed(2)} ${pdfY.toFixed(2)} Td\n(${sanitized}) Tj\nET\n`
    this.streamCommands.push(cmd)
  }

  toBuffer(): Buffer {
    const streamContent = this.streamCommands.join('')
    const streamLength = Buffer.byteLength(streamContent, 'utf8')

    const objects: string[] = []
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj')
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj')
    objects.push(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width.toFixed(2)} ${this.height.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>\nendobj`
    )
    objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`)
    objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj')
    objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj')
    objects.push('7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>\nendobj')

    let header = '%PDF-1.4\n%âãÏÓ\n'
    let body = ''
    const xrefOffsets: number[] = [0]

    let currentOffset = Buffer.byteLength(header, 'utf8')
    for (const obj of objects) {
      xrefOffsets.push(currentOffset)
      const objStr = obj + '\n'
      body += objStr
      currentOffset += Buffer.byteLength(objStr, 'utf8')
    }

    const xrefOffset = currentOffset
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    for (let i = 1; i < xrefOffsets.length; i++) {
      xref += `${String(xrefOffsets[i]).padStart(10, '0')} 00000 n \n`
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

    return Buffer.from(header + body + xref + trailer, 'utf8')
  }
}

export class PdfGeneratorService {
  /**
   * Generates a commercial-grade Quotation PDF document
   */
  static generateQuotationPdf(quote: QuotationRecord, company?: any): Buffer {
    const doc = new SimplePdfBuilder()
    const compName = company?.name || 'Printing Enterprise'
    const compAddress = company?.address || 'Dhaka, Bangladesh'
    const compPhone = company?.phone || '+880 1700-000000'
    const compEmail = company?.email || 'billing@example.com'
    const compBin = company?.bin || company?.bin_no || '18291004821'

    // Header Background Accent Bar
    doc.drawRect(0, 0, 595.28, 6, { fill: [37, 99, 235] }) // Blue 600

    // Company Header
    doc.drawText(compName.toUpperCase(), 40, 35, { font: 'F2', size: 16, color: [15, 23, 42] })
    doc.drawText(`${compAddress} | Phone: ${compPhone}`, 40, 55, { font: 'F1', size: 9, color: [100, 116, 139] })
    doc.drawText(`Email: ${compEmail} | BIN: ${compBin}`, 40, 68, { font: 'F1', size: 9, color: [100, 116, 139] })

    // Quotation Title Badge
    doc.drawRect(390, 32, 165, 26, { fill: [239, 246, 255], stroke: [191, 219, 254], lineWidth: 1 })
    doc.drawText('PRICE PROPOSAL / QUOTATION', 472.5, 40, { font: 'F2', size: 8, color: [29, 78, 216], align: 'center' })
    doc.drawText(`#${quote.quotation_number}`, 472.5, 50, { font: 'F2', size: 10, color: [30, 58, 138], align: 'center' })

    // Divider
    doc.drawLine(40, 85, 555.28, 85, { stroke: [226, 232, 240], lineWidth: 1 })

    // Meta Section (2 Columns)
    // Left: Customer Info
    doc.drawRect(40, 95, 245, 80, { fill: [248, 250, 252], stroke: [226, 232, 240], lineWidth: 1 })
    doc.drawText('PROPOSAL FOR / CLIENT:', 50, 105, { font: 'F2', size: 8, color: [100, 116, 139] })
    doc.drawText(quote.customer_name || 'Valued Customer', 50, 120, { font: 'F2', size: 11, color: [15, 23, 42] })
    if (quote.customer_company) {
      doc.drawText(quote.customer_company, 50, 134, { font: 'F1', size: 9, color: [71, 85, 105] })
    }
    doc.drawText(`Phone: ${quote.customer_phone || 'N/A'}`, 50, 148, { font: 'F1', size: 9, color: [71, 85, 105] })
    if (quote.customer_address) {
      doc.drawText(`Address: ${quote.customer_address.slice(0, 38)}`, 50, 160, { font: 'F1', size: 8.5, color: [100, 116, 139] })
    }

    // Right: Quotation Metadata
    doc.drawRect(310, 95, 245, 80, { fill: [248, 250, 252], stroke: [226, 232, 240], lineWidth: 1 })
    doc.drawText('QUOTATION DETAILS:', 320, 105, { font: 'F2', size: 8, color: [100, 116, 139] })
    doc.drawText(`Issue Date: ${quote.quotation_date || new Date().toISOString().split('T')[0]}`, 320, 120, { font: 'F1', size: 9, color: [30, 41, 59] })
    doc.drawText(`Valid Until: ${quote.valid_until || '15 Days from Issue'}`, 320, 134, { font: 'F1', size: 9, color: [30, 41, 59] })
    doc.drawText(`Status: ${(quote.status || 'Draft').toUpperCase()}`, 320, 148, { font: 'F2', size: 9, color: [37, 99, 235] })
    doc.drawText(`Prepared By: ${quote.salesperson_name || 'Sales Officer'}`, 320, 160, { font: 'F1', size: 8.5, color: [100, 116, 139] })

    // Items Table Header
    const tableTop = 190
    doc.drawRect(40, tableTop, 515.28, 22, { fill: [30, 41, 59] })
    doc.drawText('#', 48, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255] })
    doc.drawText('ITEM DESCRIPTION & SPECS', 70, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255] })
    doc.drawText('QTY', 360, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255], align: 'right' })
    doc.drawText('UNIT RATE', 445, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255], align: 'right' })
    doc.drawText('TOTAL (Tk)', 545, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255], align: 'right' })

    // Table Rows
    let currentY = tableTop + 22
    const items = quote.items && quote.items.length > 0 ? quote.items : []

    items.forEach((item: any, index: number) => {
      const isAlt = index % 2 === 1
      if (isAlt) {
        doc.drawRect(40, currentY, 515.28, 22, { fill: [248, 250, 252] })
      }
      doc.drawLine(40, currentY + 22, 555.28, currentY + 22, { stroke: [241, 245, 249], lineWidth: 0.5 })

      const itemTitle = item.item_name || item.description || `Print Item #${index + 1}`
      const sizeNote = item.width && item.height ? ` (${item.width}x${item.height} ${item.dimension_unit || item.unit || 'sqft'})` : ''
      const desc = `${itemTitle}${sizeNote}`.slice(0, 48)
      const unitRate = item.unit_rate ?? item.unit_price ?? 0
      const itemTotal = item.item_total ?? item.total_price ?? (unitRate * (item.quantity || 1))

      doc.drawText(String(index + 1), 48, currentY + 6, { font: 'F1', size: 8.5, color: [100, 116, 139] })
      doc.drawText(desc, 70, currentY + 6, { font: 'F2', size: 8.5, color: [15, 23, 42] })
      doc.drawText(`${item.quantity} ${item.unit || 'pcs'}`, 360, currentY + 6, { font: 'F1', size: 8.5, color: [51, 65, 85], align: 'right' })
      doc.drawText(`Tk ${formatMoney(unitRate)}`, 445, currentY + 6, { font: 'F1', size: 8.5, color: [51, 65, 85], align: 'right' })
      doc.drawText(`Tk ${formatMoney(itemTotal)}`, 545, currentY + 6, { font: 'F2', size: 8.5, color: [15, 23, 42], align: 'right' })

      currentY += 22
    })

    // Totals Section
    currentY += 10
    const totalsLeft = 340
    doc.drawRect(totalsLeft, currentY, 215.28, 80, { fill: [248, 250, 252], stroke: [226, 232, 240], lineWidth: 1 })

    doc.drawText('Subtotal:', totalsLeft + 15, currentY + 10, { font: 'F1', size: 9, color: [100, 116, 139] })
    doc.drawText(`Tk ${formatMoney(quote.subtotal || quote.grand_total)}`, 545, currentY + 10, { font: 'F1', size: 9, color: [15, 23, 42], align: 'right' })

    if (quote.discount_amount && quote.discount_amount > 0) {
      doc.drawText('Discount:', totalsLeft + 15, currentY + 24, { font: 'F1', size: 9, color: [220, 38, 38] })
      doc.drawText(`- Tk ${formatMoney(quote.discount_amount)}`, 545, currentY + 24, { font: 'F1', size: 9, color: [220, 38, 38], align: 'right' })
    }

    if (quote.vat_amount && quote.vat_amount > 0) {
      doc.drawText(`VAT (${quote.vat_rate || 0}%):`, totalsLeft + 15, currentY + 38, { font: 'F1', size: 9, color: [100, 116, 139] })
      doc.drawText(`+ Tk ${formatMoney(quote.vat_amount)}`, 545, currentY + 38, { font: 'F1', size: 9, color: [15, 23, 42], align: 'right' })
    }

    // Grand Total Highlight
    doc.drawRect(totalsLeft, currentY + 52, 215.28, 28, { fill: [37, 99, 235] })
    doc.drawText('GRAND TOTAL:', totalsLeft + 15, currentY + 62, { font: 'F2', size: 10, color: [255, 255, 255] })
    doc.drawText(`Tk ${formatMoney(quote.grand_total)}`, 545, currentY + 62, { font: 'F2', size: 12, color: [255, 255, 255], align: 'right' })

    // Terms & Conditions (Left side)
    const termsY = currentY
    doc.drawText('TERMS & CONDITIONS:', 40, termsY + 8, { font: 'F2', size: 8, color: [100, 116, 139] })
    doc.drawText('1. Price validity: 15 days from issue date.', 40, termsY + 22, { font: 'F1', size: 8, color: [71, 85, 105] })
    doc.drawText('2. 50% advance required upon work order confirmation.', 40, termsY + 34, { font: 'F1', size: 8, color: [71, 85, 105] })
    doc.drawText('3. Production commences after client approved artwork proof.', 40, termsY + 46, { font: 'F1', size: 8, color: [71, 85, 105] })

    // Footer & Signatures
    const footY = 720
    doc.drawLine(40, footY, 555.28, footY, { stroke: [226, 232, 240], lineWidth: 1 })

    doc.drawLine(70, footY + 50, 200, footY + 50, { stroke: [148, 163, 184], lineWidth: 1 })
    doc.drawText('Customer Acceptance Signature', 135, footY + 56, { font: 'F1', size: 8, color: [100, 116, 139], align: 'center' })

    doc.drawLine(395, footY + 50, 525, footY + 50, { stroke: [148, 163, 184], lineWidth: 1 })
    doc.drawText('Authorized Signatory & Seal', 460, footY + 56, { font: 'F1', size: 8, color: [100, 116, 139], align: 'center' })
    doc.drawText(compName, 460, footY + 66, { font: 'F2', size: 8, color: [30, 41, 59], align: 'center' })

    return doc.toBuffer()
  }

  /**
   * Generates a commercial-grade Sales Invoice PDF document
   */
  static generateInvoicePdf(invoice: InvoiceRecord, company?: any): Buffer {
    const doc = new SimplePdfBuilder()
    const compName = company?.name || 'Printing Enterprise'
    const compAddress = company?.address || 'Dhaka, Bangladesh'
    const compPhone = company?.phone || '+880 1700-000000'
    const compEmail = company?.email || 'billing@example.com'
    const compBin = company?.bin || company?.bin_no || '18291004821'

    // Header Accent Bar (Emerald)
    doc.drawRect(0, 0, 595.28, 6, { fill: [16, 185, 129] }) // Emerald 500

    // Company Header
    doc.drawText(compName.toUpperCase(), 40, 35, { font: 'F2', size: 16, color: [15, 23, 42] })
    doc.drawText(`${compAddress} | Phone: ${compPhone}`, 40, 55, { font: 'F1', size: 9, color: [100, 116, 139] })
    doc.drawText(`Email: ${compEmail} | BIN: ${compBin}`, 40, 68, { font: 'F1', size: 9, color: [100, 116, 139] })

    // Invoice Title Badge
    const isPaid = (Number(invoice.due_amount) || 0) <= 0
    const badgeColor: [number, number, number] = isPaid ? [16, 185, 129] : [234, 88, 12]
    doc.drawRect(390, 32, 165, 26, { fill: [240, 253, 244], stroke: [187, 247, 208], lineWidth: 1 })
    doc.drawText('COMMERCIAL SALES INVOICE', 472.5, 40, { font: 'F2', size: 8, color: badgeColor, align: 'center' })
    doc.drawText(`#${invoice.invoice_number}`, 472.5, 50, { font: 'F2', size: 10, color: [15, 23, 42], align: 'center' })

    // Divider
    doc.drawLine(40, 85, 555.28, 85, { stroke: [226, 232, 240], lineWidth: 1 })

    // Meta Section
    // Left: Customer Billing Address
    doc.drawRect(40, 95, 245, 80, { fill: [248, 250, 252], stroke: [226, 232, 240], lineWidth: 1 })
    doc.drawText('BILLED TO / CUSTOMER:', 50, 105, { font: 'F2', size: 8, color: [100, 116, 139] })
    doc.drawText(invoice.customer_name || 'Valued Customer', 50, 120, { font: 'F2', size: 11, color: [15, 23, 42] })
    doc.drawText(`Phone: ${invoice.customer_phone || 'N/A'}`, 50, 134, { font: 'F1', size: 9, color: [71, 85, 105] })
    if (invoice.customer_bin) {
      doc.drawText(`BIN / VAT Reg: ${invoice.customer_bin}`, 50, 148, { font: 'F1', size: 8.5, color: [71, 85, 105] })
    }
    if (invoice.customer_address) {
      doc.drawText(`Address: ${invoice.customer_address.slice(0, 38)}`, 50, 160, { font: 'F1', size: 8.5, color: [100, 116, 139] })
    }

    // Right: Invoice Metadata
    doc.drawRect(310, 95, 245, 80, { fill: [248, 250, 252], stroke: [226, 232, 240], lineWidth: 1 })
    doc.drawText('INVOICE META:', 320, 105, { font: 'F2', size: 8, color: [100, 116, 139] })
    doc.drawText(`Invoice Date: ${invoice.invoice_date || new Date().toISOString().split('T')[0]}`, 320, 120, { font: 'F1', size: 9, color: [30, 41, 59] })
    doc.drawText(`Due Date: ${invoice.due_date || 'Due Upon Receipt'}`, 320, 134, { font: 'F1', size: 9, color: [30, 41, 59] })
    doc.drawText(`Payment Status: ${(invoice.status || (isPaid ? 'PAID' : 'DUE')).toUpperCase()}`, 320, 148, { font: 'F2', size: 9, color: badgeColor })
    if (invoice.order_number) {
      doc.drawText(`Work Order Ref: #${invoice.order_number}`, 320, 160, { font: 'F1', size: 8.5, color: [100, 116, 139] })
    }

    // Items Table Header
    const tableTop = 190
    doc.drawRect(40, tableTop, 515.28, 22, { fill: [15, 23, 42] })
    doc.drawText('#', 48, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255] })
    doc.drawText('PARTICULARS / ITEM DESCRIPTION', 70, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255] })
    doc.drawText('QTY', 360, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255], align: 'right' })
    doc.drawText('RATE (Tk)', 445, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255], align: 'right' })
    doc.drawText('TOTAL (Tk)', 545, tableTop + 6, { font: 'F2', size: 9, color: [255, 255, 255], align: 'right' })

    // Table Rows
    let currentY = tableTop + 22
    const items = invoice.items && invoice.items.length > 0 ? invoice.items : []

    items.forEach((item: any, index: number) => {
      const isAlt = index % 2 === 1
      if (isAlt) {
        doc.drawRect(40, currentY, 515.28, 22, { fill: [248, 250, 252] })
      }
      doc.drawLine(40, currentY + 22, 555.28, currentY + 22, { stroke: [241, 245, 249], lineWidth: 0.5 })

      const itemTitle = item.item_name || item.description || `Printed Item #${index + 1}`
      const unitRate = item.unit_price ?? item.unit_rate ?? 0
      const itemTotal = item.total_price ?? item.item_total ?? (unitRate * (item.quantity || 1))

      doc.drawText(String(index + 1), 48, currentY + 6, { font: 'F1', size: 8.5, color: [100, 116, 139] })
      doc.drawText(itemTitle.slice(0, 48), 70, currentY + 6, { font: 'F2', size: 8.5, color: [15, 23, 42] })
      doc.drawText(`${item.quantity} ${item.unit || 'pcs'}`, 360, currentY + 6, { font: 'F1', size: 8.5, color: [51, 65, 85], align: 'right' })
      doc.drawText(`Tk ${formatMoney(unitRate)}`, 445, currentY + 6, { font: 'F1', size: 8.5, color: [51, 65, 85], align: 'right' })
      doc.drawText(`Tk ${formatMoney(itemTotal)}`, 545, currentY + 8, { font: 'F2', size: 8.5, color: [15, 23, 42], align: 'right' })

      currentY += 22
    })

    // Totals Section
    currentY += 10
    const totalsLeft = 330
    doc.drawRect(totalsLeft, currentY, 225.28, 100, { fill: [248, 250, 252], stroke: [226, 232, 240], lineWidth: 1 })

    doc.drawText('Subtotal:', totalsLeft + 12, currentY + 8, { font: 'F1', size: 9, color: [100, 116, 139] })
    doc.drawText(`Tk ${formatMoney(invoice.subtotal || invoice.grand_total)}`, 545, currentY + 8, { font: 'F1', size: 9, color: [15, 23, 42], align: 'right' })

    if (invoice.discount_amount && invoice.discount_amount > 0) {
      doc.drawText('Discount:', totalsLeft + 12, currentY + 20, { font: 'F1', size: 9, color: [220, 38, 38] })
      doc.drawText(`- Tk ${formatMoney(invoice.discount_amount)}`, 545, currentY + 20, { font: 'F1', size: 9, color: [220, 38, 38], align: 'right' })
    }

    if (invoice.vat_amount && invoice.vat_amount > 0) {
      doc.drawText(`VAT (${invoice.vat_percentage || 0}%):`, totalsLeft + 12, currentY + 32, { font: 'F1', size: 9, color: [100, 116, 139] })
      doc.drawText(`+ Tk ${formatMoney(invoice.vat_amount)}`, 545, currentY + 32, { font: 'F1', size: 9, color: [15, 23, 42], align: 'right' })
    }

    doc.drawText('Grand Total:', totalsLeft + 12, currentY + 46, { font: 'F2', size: 9.5, color: [15, 23, 42] })
    doc.drawText(`Tk ${formatMoney(invoice.grand_total)}`, 545, currentY + 46, { font: 'F2', size: 9.5, color: [15, 23, 42], align: 'right' })

    doc.drawText('Paid Amount:', totalsLeft + 12, currentY + 58, { font: 'F1', size: 9, color: [16, 185, 129] })
    doc.drawText(`Tk ${formatMoney(invoice.paid_amount || 0)}`, 545, currentY + 58, { font: 'F2', size: 9, color: [16, 185, 129], align: 'right' })

    // Due Balance Bar
    const dueAmt = Number(invoice.due_amount) || 0
    doc.drawRect(totalsLeft, currentY + 70, 225.28, 30, { fill: dueAmt > 0 ? [254, 242, 242] : [240, 253, 244], stroke: dueAmt > 0 ? [254, 202, 202] : [187, 247, 208], lineWidth: 1 })
    doc.drawText('BALANCE DUE:', totalsLeft + 12, currentY + 82, { font: 'F2', size: 10, color: dueAmt > 0 ? [185, 28, 28] : [21, 128, 61] })
    doc.drawText(`Tk ${formatMoney(dueAmt)}`, 545, currentY + 82, { font: 'F2', size: 12, color: dueAmt > 0 ? [185, 28, 28] : [21, 128, 61], align: 'right' })

    // Bank & MFS details on Left side
    const payInfoY = currentY
    doc.drawText('PAYMENT INSTRUCTIONS:', 40, payInfoY + 8, { font: 'F2', size: 8, color: [100, 116, 139] })
    doc.drawText('Bank: Islami Bank Bangladesh PLC / DBBL', 40, payInfoY + 22, { font: 'F1', size: 8, color: [71, 85, 105] })
    doc.drawText('Account Name: ' + compName, 40, payInfoY + 34, { font: 'F1', size: 8, color: [71, 85, 105] })
    doc.drawText('bKash / Nagad Merchant: ' + compPhone, 40, payInfoY + 46, { font: 'F1', size: 8, color: [71, 85, 105] })
    doc.drawText('Please mention Invoice #' + invoice.invoice_number + ' in payment reference.', 40, payInfoY + 58, { font: 'F3', size: 8, color: [100, 116, 139] })

    // Signatures
    const footY = 720
    doc.drawLine(40, footY, 555.28, footY, { stroke: [226, 232, 240], lineWidth: 1 })

    doc.drawLine(70, footY + 50, 200, footY + 50, { stroke: [148, 163, 184], lineWidth: 1 })
    doc.drawText('Customer Received Signature', 135, footY + 56, { font: 'F1', size: 8, color: [100, 116, 139], align: 'center' })

    doc.drawLine(395, footY + 50, 525, footY + 50, { stroke: [148, 163, 184], lineWidth: 1 })
    doc.drawText('Authorized Signatory & Seal', 460, footY + 56, { font: 'F1', size: 8, color: [100, 116, 139], align: 'center' })
    doc.drawText(compName, 460, footY + 66, { font: 'F2', size: 8, color: [30, 41, 59], align: 'center' })

    return doc.toBuffer()
  }
}
