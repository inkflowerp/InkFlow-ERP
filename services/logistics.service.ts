import type {
  DeliveryChallanRecord,
  InstallationRecord,
  DeliveryStatus,
} from '../types/logistics.types.ts'
import { LogisticsRepository } from '../lib/repositories/logistics.repository.ts'
import { formatBDT } from '../lib/formatters.ts'

export interface LogisticsKpiMetrics {
  dispatchesToday: number
  outForDelivery: number
  partiallyDelivered: number
  installationsActive: number
  fullyDelivered: number
  totalPendingDue: number
  totalChallans: number
}

export class LogisticsService {
  static async getChallans(companyId?: string): Promise<DeliveryChallanRecord[]> {
    if (!companyId) return []
    try {
      return await LogisticsRepository.getChallans(companyId)
    } catch (error) {
      console.error('Error in LogisticsService.getChallans:', error)
      throw error
    }
  }

  static async getChallanById(id: string, companyId: string): Promise<DeliveryChallanRecord | null> {
    if (!companyId || !id) return null
    try {
      return await LogisticsRepository.getChallanById(id, companyId)
    } catch (error) {
      console.error('Error in LogisticsService.getChallanById:', error)
      throw error
    }
  }

  static async createChallan(data: {
    company_id: string
    customer_id: string
    customer_name: string
    customer_phone: string
    delivery_address: string
    dispatched_by_name: string
    [key: string]: any
  }): Promise<DeliveryChallanRecord> {
    if (!data.company_id) throw new Error('Company ID is required')
    if (!data.customer_id) throw new Error('Customer ID is required')
    if (!data.customer_name) throw new Error('Customer name is required')
    if (!data.customer_phone) throw new Error('Customer phone is required')
    if (!data.delivery_address) throw new Error('Delivery address is required')
    if (!data.dispatched_by_name) throw new Error('Dispatcher name is required')

    return await LogisticsRepository.createChallan(data)
  }

  static async updateChallanStatus(
    id: string,
    status: DeliveryStatus | 'ready' | 'assigned' | 'out_for_delivery' | 'delivered' | 'cancelled',
    companyId: string,
    extraUpdates?: Partial<DeliveryChallanRecord>
  ): Promise<DeliveryChallanRecord> {
    if (!companyId) throw new Error('Company ID is required')
    return await LogisticsRepository.updateChallanStatus(id, status, companyId, extraUpdates)
  }

  static async getInstallations(companyId: string): Promise<InstallationRecord[]> {
    if (!companyId) return []
    return await LogisticsRepository.getInstallations(companyId)
  }

  /**
   * Calculates executive and operational KPIs for delivery & installation overview.
   */
  static calculateLogisticsKpis(
    challans: DeliveryChallanRecord[] = [],
    installations: InstallationRecord[] = []
  ): LogisticsKpiMetrics {
    const todayStr = new Date().toISOString().split('T')[0]

    let dispatchesToday = 0
    let outForDelivery = 0
    let partiallyDelivered = 0
    let fullyDelivered = 0
    let totalPendingDue = 0

    for (const ch of challans) {
      if (ch.scheduled_date === todayStr) {
        dispatchesToday++
      }
      if (ch.status === 'out_for_delivery') {
        outForDelivery++
      } else if (ch.status === 'partially_delivered') {
        partiallyDelivered++
      } else if (ch.status === 'delivered') {
        fullyDelivered++
      }

      if (ch.status !== 'delivered' && ch.due_amount && ch.due_amount > 0) {
        totalPendingDue += Number(ch.due_amount) || 0
      }
    }

    const installationsActive = installations.filter(
      (ins) => ins.status === 'on_site' || ins.status === 'scheduled'
    ).length

    return {
      dispatchesToday,
      outForDelivery,
      partiallyDelivered,
      installationsActive,
      fullyDelivered,
      totalPendingDue,
      totalChallans: challans.length,
    }
  }

  /**
   * Generates a culturally-appropriate, respectful Bengali WhatsApp message
   * for Bangladeshi printing & signage customers when goods are dispatched.
   */
  static generateBangladeshiChallanWhatsAppMessage(
    challan: DeliveryChallanRecord,
    companyName: string = 'InkFlow Printing & Signage'
  ): string {
    const customer = challan.customer_name || 'সম্মানিত গ্রাহক'
    const challanNo = challan.challan_number || 'CHL-0000'
    const invoiceNo = challan.invoice_number || 'N/A'
    const date = challan.scheduled_date || new Date().toISOString().split('T')[0]
    const method = challan.delivery_method === 'courier'
      ? 'কুরিয়ার সার্ভিস'
      : challan.delivery_method === 'company_vehicle'
      ? 'কোম্পানির নিজস্ব গাড়ি'
      : challan.delivery_method === 'local_transport'
      ? 'লোকাল পরিবহন / ভ্যান'
      : 'দোকান / কারখানা থেকে গ্রহণ'

    const vehicleOrTracking = challan.vehicle_info || challan.delivery_person_name || 'অন-ট্রানজিট'
    const driverPhone = challan.delivery_person_phone ? `\n📞 চালক/ডেলিভারিম্যান: ${challan.delivery_person_phone}` : ''

    const items = (challan.items || []).map((it, idx) => {
      const desc = it.product_description || 'প্রিন্টিং আইটেম'
      const qty = `${it.quantity || 1} ${it.unit || 'pcs'}`
      const status = it.is_delivered ? '✅ (ডেলিভারি সম্পন্ন)' : '📦 (চলমান চালান)'
      return `${idx + 1}. ${desc} — ${qty} ${status}`
    }).join('\n')

    const dueAmount = Number(challan.due_amount) || 0
    let dueSection = ''
    if (dueAmount > 0) {
      dueSection = `\n\n⚠️ *বকেয়া পরিশোধের নির্দেশনা:*
মোট বকেয়া: *${formatBDT(dueAmount)}*
মাল রিসিভ করার সময় অনুগ্রহ করে নগদ বা বিকাশ/নগদ/ব্যাংকের মাধ্যমে বকেয়া পরিশোধ করুন।`
    } else if (challan.grand_total) {
      dueSection = `\n\n✅ *বিল পরিশোধিত:* সম্পূর্ণ বিল পরিশোধ করা আছে।`
    }

    return `আসসালামু আলাইকুম, *${customer}*।
*${companyName}* থেকে আপনার প্রিন্টিং/সাইনেজ পণ্যের ডেলিভারি চালান পাঠানো হয়েছে।

📋 *চালান বিবরণ:*
• চালান নং: *${challanNo}*
• ইনভয়েস নং: *${invoiceNo}*
• তারিখ: ${date}
• ডেলিভারি মাধ্যম: ${method}
• গাড়ি / ট্র্যাকিং: ${vehicleOrTracking}${driverPhone}
• গন্তব্য: ${challan.delivery_address || 'ফ্যাক্টরি ডেলিভারি'}

📦 *পণ্যের বিবরণ:*
${items || '• প্রিন্টিং মালামাল'}
${dueSection}

চালানপত্রটি যাচাই করে পণ্য বুঝে নিন। যেকোনো প্রয়োজনে কল করুন: ${challan.customer_phone || ''}
ধন্যবাদ,
*${companyName}*`
  }
}



