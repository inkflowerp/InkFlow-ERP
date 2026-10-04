import type { ProductionTaskRecord } from '../../types/production.types.ts'

/**
 * Generates a respectful, culturally-attuned Bengali WhatsApp message
 * updating customers or sales reps on live factory press floor execution.
 */
export function generateBangladeshiFloorWhatsAppMessage(
  task: ProductionTaskRecord,
  companyName: string = 'InkFlow Digital & Offset Press'
): string {
  const customer = task.customer_name || 'সম্মানিত গ্রাহক'
  const jobNo = task.job_number || task.task_number || 'JOB-0000'
  const productName = task.task_name || 'প্রিন্টিং অর্ডার'
  const qty = `${task.quantity || 1} ${task.unit || 'pcs'}`
  const machine = task.assigned_machine_name || 'ফ্যাক্টরি ফ্লোর'
  const media = task.required_material || 'প্রেস স্ট্যান্ডার্ড মিডিয়া'

  let dimensions = ''
  if (task.width && task.height) {
    dimensions = `\n• সাইজ ও মাপ: ${task.width} × ${task.height} ${task.dimension_unit || task.unit || 'inch'}`
  }

  let statusBangla = 'প্রোডাকশনে অপেক্ষারত'
  if (task.status === 'in_progress') {
    statusBangla = `⚙️ মেশিনে চলমান (Machine: ${machine})`
  } else if (task.status === 'completed') {
    statusBangla = '✅ প্রোডাকশন ও কোয়ালিটি চেক সম্পন্ন (Ready for Delivery/Finishing)'
  } else if (task.status === 'on_hold') {
    statusBangla = `⚠️ সাময়িক স্থগিত (${task.hold_reason || 'কাস্টমার কনফার্মেশন/মিডিয়া অপেক্ষমান'})`
  } else if (task.status === 'scheduled' || task.status === 'ready') {
    statusBangla = `📅 শিডিউল সম্পন্ন (মেশিন: ${machine})`
  }

  const operator = task.assigned_operator_name || task.operator_name ? `\n• দায়িত্বপ্রাপ্ত অপারেটর: ${task.assigned_operator_name || task.operator_name}` : ''

  return `আসসালামু আলাইকুম, *${customer}*।\n*${companyName}* এর কারখানা থেকে আপনার অর্ডারের প্রোডাকশন আপডেট:\n\n📋 *কাজের বিবরণ:*\n• জব/অর্ডার নং: *${jobNo}*\n• আইটেম: *${productName}*\n• পরিমাণ: ${qty}${dimensions}\n• মিডিয়া/কাঁচামাল: ${media}\n• বর্তমান অবস্থা: *${statusBangla}*${operator}\n\nপণ্য প্রস্তুত হওয়া মাত্রই আপনাকে পরবর্তী চালান/ডেলিভারি নোটিফিকেশন জানানো হবে। ধন্যবাদ!`
}
