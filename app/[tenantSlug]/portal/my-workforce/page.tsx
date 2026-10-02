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
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <PageHeader
 titleEn="My Staff Hub"titleBn="আমার হাজিরা ও বেতন পোর্টাল"descriptionEn="Personal attendance, leave records, salary slips, overtime earnings, and advance salary balance."descriptionBn="আপনার ব্যক্তিগত হাজিরা, ছুটির হিসাব, বেতন পে-স্লিপ, ওভারটাইম অর্জন ও অগ্রিম বেতন।"icon={UserCheck}
 actions={
          <Button
 variant="outline"size="sm"onClick={() => router.push(getTenantNavHref('/dashboard', undefined, tenantSlug))}
 className="text-xs font-bold cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5 mr-1"/>
            {tBilingual('Back to Dashboard', 'ড্যাশবোর্ডে ফিরুন')}
          </Button>
        }
      />

      <MyWorkforceHub />
    </div>
  )
}
