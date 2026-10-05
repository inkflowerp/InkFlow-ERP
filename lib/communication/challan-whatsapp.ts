import type { DeliveryChallanRecord } from '@/types/logistics.types'

/**
 * Formats a localized Bengali WhatsApp delivery challan notification message
 */
export function generateBangladeshiChallanWhatsAppMessage(
  challan: DeliveryChallanRecord,
  companyName: string = 'PrintFlow Printing & Signage'
): string {
  const customer = challan.customer_name || 'সম্মানিত গ্রাহক'
  const challanNo = challan.challan_number || 'CHL-0000'
  const invoiceNo = challan.invoice_number || 'N/A'
  const date = challan.scheduled_date || new Date().toISOString().split('T')[0]
  const method =
    challan.delivery_method === 'courier'
      ? 'কুরিয়ার সার্ভিস'
      : challan.delivery_method === 'company_vehicle'
      ? 'কোম্পানির নিজস্ব গাড়ি'
      : challan.delivery_method === 'local_transport'
      ? 'লোকাল পরিবহন / ভ্যান'
      : 'দোকান / কারখানা থেকে গ্রহণ'

  const vehicleOrTracking = challan.vehicle_info || challan.delivery_person_name || 'অন-ট্রানজিট'
  const driverPhone = challan.delivery_person_phone
    ? `\n📞 চালক/ডেলিভারিম্যান: ${challan.delivery_person_phone}`
    : ''

  const items = (challan.items || []).map((it, idx) => {
    const desc = it.product_description || 'প্রিন্টিং আইটেম'
    const qty = it.quantity || 0
    const unit = it.unit || 'টি'
    return `${idx + 1}. ${desc} - ${qty} ${unit}`
  }).join('\n')

  const dueNotice = (challan.due_amount || 0) > 0
    ? `\n\n⚠️ অবশিষ্ট বকেয়া: ৳${Number(challan.due_amount).toLocaleString('en-IN')}\nঅনুগ্রহ করে ডেলিভারি গ্রহণের সময় বকেয়া পরিশোধ সম্পন্ন করুন।`
    : '\n\n✅ এই অর্ডারের যাবতীয় বিল পরিশোধিত রয়েছে।'

  return `📦 *ডেলিভারি চালান নোটিফিকেশন* (${companyName})\n\nপ্রিয় ${customer},\nআপনার অর্ডারের পণ্য ডেলিভারির উদ্দেশ্যে পাঠানো হয়েছে।\n\n📄 চালান নং: *${challanNo}*\n🧾 ইনভয়েস নং: ${invoiceNo}\n📅 তারিখ: ${date}\n🚚 মাধ্যম: ${method}\n📍 পরিবহন/ট্র্যাকিং: ${vehicleOrTracking}${driverPhone}\n\n*পণ্য তালিকা:*\n${items || 'পণ্য বিবরণী সংযুক্ত রয়েছে'}${dueNotice}\n\nপণ্য গ্রহণের পর চালান সই করে ডেলিভারিম্যানকে দিন। ধন্যবাদ!`
}
