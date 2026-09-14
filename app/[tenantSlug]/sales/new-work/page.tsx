import React from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { NewWorkWizard } from '@/components/orders/new-work-wizard'
import { Plus, Printer } from 'lucide-react'

export default async function NewWorkPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <PageHeader
        titleEn="+ New Work Order"
        titleBn="+ নতুন কাজ তৈরি করুন"
        descriptionEn="Frictionless order intake: select customer, dimensions, material, and send straight to the floor."
        descriptionBn="সহজ ও দ্রুত কাজের এন্ট্রি: কাস্টমার, সাইজ, মিডিয়া নির্বাচন করুন এবং সরাসরি প্রোডাকশনে পাঠান।"
        icon={Plus}
        iconColor="text-blue-600"
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xs">
        <NewWorkWizard isInlineModal={false} />
      </div>
    </div>
  )
}
