'use client'

import React from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { ShieldAlert, ArrowLeft, LayoutDashboard, UserCheck, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export interface PanelAccessDeniedProps {
 module: string
 action?: string
 panelTitle: string
 panelTitleBn?: string
 requiredRole?: string | string[]
 reason?: string
}

export function PanelAccessDenied({
 module,
 action = 'view',
 panelTitle,
 panelTitleBn,
 requiredRole,
 reason,
}: PanelAccessDeniedProps) {
 const params = useParams()
 const pathname = usePathname()
 const { company, currentUser } = useTenant()
 const { isOwner, userCtx } = usePermissions()
 const { locale, tBilingual } = useI18n()

 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
 const isBn = locale === 'bn'

 const responsibilities = (userCtx.responsibilities || []) as string[]
 const requiredPermCode = `${module}.${action}`

 return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 sm:p-6">
      <Card className="max-w-xl w-full border-border bg-card shadow-xs rounded-xl overflow-hidden">
        <div className="h-1 bg-destructive"/>
        
        <CardContent className="p-6 sm:p-8 text-center space-y-5">
          {/* Lock Icon */}
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-destructive/10 text-destructive mx-auto">
            <ShieldAlert className="h-7 w-7"/>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs tabular-nums font-bold uppercase tracking-wider bg-danger-surface bg-danger-surface text-destructive text-destructive border border-danger-border border-danger-border">
              <Lock className="w-3 h-3"/>
              {tBilingual('403 Panel Isolated', '৪০৩ প্যানেল সীমাবদ্ধ')}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {tBilingual(
                `Access Restricted: ${panelTitle}`,
                `অনুমতি সীমাবদ্ধ: ${panelTitleBn || panelTitle}`
              )}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {reason ||
 tBilingual(
                  `Your active employee profile does not possess authorization to access this operational panel. Missing required permission:"${requiredPermCode}".`,
                  `আপনার সক্রিয় প্রোফাইলে এই প্যানেলে প্রবেশের অনুমতি নেই। প্রয়োজনীয় অনুমতি কোড:"${requiredPermCode}"।`
                )}
            </p>
          </div>

          {/* User Profile Context */}
          <div className="p-3.5 rounded-xl bg-muted border border-border text-left text-xs space-y-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-medium">{tBilingual('Logged-in User:', 'লগইনকৃত ব্যবহারকারী:')}</span>
              <span className="font-semibold text-foreground">
                {currentUser?.profile?.full_name || 'Staff Member'}
              </span>
            </div>

            {currentUser?.department && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-medium">{tBilingual('Department:', 'বিভাগ:')}</span>
                <span className="font-semibold text-foreground capitalize">
                  {currentUser.department}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border">
              <span className="font-medium">{tBilingual('Active Responsibilities:', 'বর্তমান দায়িত্বসমূহ:')}</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {responsibilities.length > 0 ? (
 responsibilities.map((r) => (
                    <Badge
 key={r}
 variant="outline"className="text-xs bg-card text-foreground capitalize px-1.5 py-0">
                      {r.replace(/_/g, ' ')}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline"className="text-xs bg-card text-muted-foreground">
 general staff
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button
 asChild
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs gap-1.5 shadow-xs">
              <Link href={getTenantNavHref('/dashboard', pathname, slug)}>
                <LayoutDashboard className="h-4 w-4"/>
                <span>{tBilingual('Go to My Dashboard', 'আমার ড্যাশবোর্ডে যান')}</span>
              </Link>
            </Button>

            <Button
 asChild
 variant="outline"className="border-border text-xs gap-1.5">
              <Link href={getTenantNavHref('/portal/my-workforce', pathname, slug)}>
                <UserCheck className="h-4 w-4 text-success"/>
                <span>{tBilingual('Employee Self-Service Hub', 'আমার হাজিরা ও বেতন')}</span>
              </Link>
            </Button>
          </div>

          {/* Notice to contact Owner */}
          <p className="text-xs text-muted-foreground">
            {tBilingual(
              'If you need access to this panel for your workflow duties, contact your business owner to update your permissions.',
              'কাজের প্রয়োজনে এই প্যানেলে প্রবেশের অনুমতির জন্য প্রতিষ্ঠানের মালিকের সাথে যোগাযোগ করুন।'
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}