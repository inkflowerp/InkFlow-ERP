import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizeBangladeshiPhone,
  buildBangladeshiOrderWhatsAppMessage,
} from '../../components/orders/types.ts'

describe('Bangladeshi Printing Press Orders & Job Flow Unit Tests', () => {
  it('1. Correctly formats and sanitizes Bangladeshi phone numbers for WhatsApp', () => {
    assert.equal(sanitizeBangladeshiPhone('01712345678'), '8801712345678')
    assert.equal(sanitizeBangladeshiPhone('018-9988-7766'), '8801899887766')
    assert.equal(sanitizeBangladeshiPhone('+8801912345678'), '8801912345678')
  })

  it('2. WhatsApp order confirmation message includes items summary, advance paid, and due amount', () => {
    const msg = buildBangladeshiOrderWhatsAppMessage({
      template: 'order_confirmed',
      customerName: 'আনোয়ার হোসেন',
      companyName: 'ক্লাসিক প্রিন্ট অ্যান্ড সাইন',
      orderNumber: 'ORD-2026-0042',
      invoiceNumber: 'INV-2026-0042',
      totalAmount: 25000,
      advanceAmount: 10000,
      dueAmount: 15000,
      deliveryDate: '2026-09-25',
      itemsSummary: '১০×৩ ফিট ব্যানার (২ পিস), ভিজিটিং কার্ড (১০০০ পিস)',
    })

    assert.ok(msg.includes('আনোয়ার হোসেন'))
    assert.ok(msg.includes('ORD-2026-0042'))
    assert.ok(msg.includes('১০×৩ ফিট ব্যানার'))
    assert.ok(msg.includes('৳25,000'))
    assert.ok(msg.includes('৳10,000'))
    assert.ok(msg.includes('৳15,000'))
  })

  it('3. WhatsApp ready for pickup template includes challan & due clearance notice', () => {
    const msg = buildBangladeshiOrderWhatsAppMessage({
      template: 'ready_pickup',
      customerName: 'করিম সাহেব',
      companyName: 'পদ্মা প্রিন্টিং প্রেস',
      orderNumber: 'ORD-2026-0099',
      totalAmount: 12000,
      advanceAmount: 12000,
      dueAmount: 0,
      itemsSummary: '৪ কালার ব্রোশিওর (৫০০ পিস)',
    })

    assert.ok(msg.includes('প্রিন্টিং ও ফিনিশিং সম্পন্ন হয়েছে'))
    assert.ok(msg.includes('ডেলিভারির জন্য প্রস্তুত'))
    assert.ok(msg.includes('পদ্মা প্রিন্টিং প্রেস'))
  })

  it('4. Financial consistency: computes advance and remaining due balance cleanly', () => {
    const calculateFinancials = (total: number, advance: number) => {
      const due = Math.max(0, total - advance)
      const status = due <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid'
      return { total, advance, due, status }
    }

    const fullPaid = calculateFinancials(10000, 10000)
    assert.equal(fullPaid.due, 0)
    assert.equal(fullPaid.status, 'paid')

    const partial = calculateFinancials(10000, 4000)
    assert.equal(partial.due, 6000)
    assert.equal(partial.status, 'partial')

    const unpaid = calculateFinancials(10000, 0)
    assert.equal(unpaid.due, 10000)
    assert.equal(unpaid.status, 'unpaid')
  })
})
