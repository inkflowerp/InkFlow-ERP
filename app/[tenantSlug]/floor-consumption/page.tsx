'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function DirectFloorConsumptionRedirectPage() {
 const params = useParams()
 const router = useRouter()
 const slug = (params?.tenantSlug as string) || 'my-company'

 useEffect(() => {
 router.replace(getTenantNavHref('/production/floor-consumption', null, slug))
  }, [router, slug])

 return (
    <PanelAccessGuard
 module="production"action="view"panelTitle="Floor Consumptions"panelTitleBn="কাঁচামাল খরচ">
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-warning-border"/>
      </div>
    </PanelAccessGuard>
  )
}
