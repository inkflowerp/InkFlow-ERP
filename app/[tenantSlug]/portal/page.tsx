'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { UserCheck } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
import { MyWorkforceHub } from '@/components/portal/my-workforce-hub'

export default function TenantStaffPortalPage() {
  const { tBilingual } = useI18n()
  const params = useParams()
  const tenantSlug = (params?.tenantSlug as string) || 'app'

  return (
    <div className="space-y-6 mx-auto pb-16">
      <PageHeader
        titleEn="Staff Portal"
        titleBn="স্টাফ পোর্টাল"
        descriptionEn="Personal attendance, leave records, salary slips, overtime earnings, and advance salary balance."
        descriptionBn="আপনার ব্যক্তিগত হাজিরা, ছুটির হিসাব, বেতন পে-স্লিপ, ওভারটাইম অর্জন ও অগ্রিম বেতন।"
        icon={UserCheck}
      />
      <MyWorkforceHub />
    </div>
  )
}
