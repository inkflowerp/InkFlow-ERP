'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserCheck } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { MyWorkforceHub } from '@/components/portal/my-workforce-hub'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export default function MyWorkforcePage() {
  const { tBilingual } = useI18n()
  const params = useParams()
  const router = useRouter()
  const tenantSlug = (params?.tenantSlug as string) || 'app'

  return (
    <div className="space-y-6 mx-auto pb-16">
      <PageHeader
        titleEn="My Staff Hub"
        titleBn="আমার হাজিরা ও বেতন পোর্টাল"
        descriptionEn="Personal attendance, leave records, salary slips, overtime earnings, and advance salary balance."
        descriptionBn="আপনার ব্যক্তিগত হাজিরা, ছুটির হিসাব, বেতন পে-স্লিপ, ওভারটাইম অর্জন ও অগ্রিম বেতন।"
        icon={UserCheck}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(getTenantNavHref('/portal', undefined, tenantSlug))}
            className="text-xs font-bold cursor-pointer min-h-[48px] px-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            {tBilingual('Back to Portal', 'পোর্টালে ফিরুন')}
          </Button>
        }
      />

      <MyWorkforceHub />
    </div>
  )
}
