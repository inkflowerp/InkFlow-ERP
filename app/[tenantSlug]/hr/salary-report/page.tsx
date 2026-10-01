'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTenant } from '@/hooks/use-tenant'

export default function SalaryReportRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  useEffect(() => {
    router.replace(`/${slug}/hr/reports`)
  }, [router, slug])

  return (
    <div className="p-8 text-center text-xs text-muted-foreground">
      Redirecting to Workforce Reports...
    </div>
  )
}
