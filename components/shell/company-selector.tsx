'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronsUpDown, PlusCircle, Sparkles } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { cn } from '@/lib/utils'

export function CompanySelector() {
 const [isOpen, setIsOpen] = useState(false)
 const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen)
 const { company, availableCompanies, switchCompany } = useTenant()
 const { isOwner } = usePermissions()
 const { accountType, accountTypeMeta, isTrial, daysRemainingInTrial, timeRemainingInTrial, checkCanCreate, openLimitExceededModal, isTrialExpired } = useSubscription()
 const { locale, tBilingual } = useI18n()
 const router = useRouter()

  // Only business owner / platform owner can switch organizations or add new companies/branches
 const canSwitch = isOwner && Array.isArray(availableCompanies) && availableCompanies.length > 1
 const canAddBranch = isOwner

 const displayName = company
    ? tBilingual(company.name, company.name_bn || company.name)
    : tBilingual('Select Company', 'প্রতিষ্ঠান নির্বাচন')

 return (
    <div ref={menuRef} className="relative shrink-0">
      <button
 type="button"disabled={!canSwitch}
 onClick={() => canSwitch && setIsOpen(!isOpen)}
 className={cn(
          'flex items-center gap-1.5 sm:gap-2.5 rounded-lg border border-border bg-muted px-2 sm:px-3 py-1.5 text-left text-sm font-medium transition-all shrink-0 whitespace-nowrap min-h-[40px]',
 canSwitch
            ? 'hover:bg-muted cursor-pointer'
            : 'cursor-default select-none'
        )}
 suppressHydrationWarning
      >
        <div
 className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-white font-bold text-xs shadow-xs shrink-0"suppressHydrationWarning
        >
          {company?.name ? company.name.charAt(0).toUpperCase() : 'P'}
        </div>
        <div className="flex flex-col text-left max-w-[110px] xs:max-w-[150px] sm:max-w-[180px] lg:max-w-[220px] min-w-0"suppressHydrationWarning>
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-foreground text-xs sm:text-sm whitespace-nowrap bangla-text"suppressHydrationWarning>
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs text-muted-foreground capitalize whitespace-nowrap hidden xs:inline"suppressHydrationWarning>
              {company?.business_type?.replace('_', ' ') || 'Printing & Signage'}
            </span>
            <span
 suppressHydrationWarning
 className={cn(
                'text-xs xs:text-xs px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border shrink-0',
 accountTypeMeta.badgeClass
              )}
            >
              {isTrial
                ? isTrialExpired
                  ? 'Expired'
                  : `Trial (${timeRemainingInTrial ? timeRemainingInTrial.statusBadgeEn : `${daysRemainingInTrial}d`})`
                : accountTypeMeta.badgeTextEn}
            </span>
          </div>
        </div>
        {canSwitch && (
          <ChevronsUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 ml-0.5"/>
        )}
      </button>

      {canSwitch && isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground bangla-text">
            {tBilingual('Your Organizations', 'আপনার প্রতিষ্ঠানসমূহ')}
          </div>

          <div className="space-y-1 my-1">
            {Array.isArray(availableCompanies) && availableCompanies.map((c) => {
 const isSelected = c.slug === company?.slug
 const name = tBilingual(c.name, c.name_bn || c.name)

 return (
                <button
 key={c.id}
 type="button"onClick={() => {
 switchCompany(c.slug)
 setIsOpen(false)
                  }}
 className={cn(
                    'flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors hover:bg-muted cursor-pointer',
 isSelected && 'bg-primary/10/80 text-primary bg-primary/10 text-primary font-semibold'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0"/>
                    <div className="flex flex-col truncate">
                      <span className="truncate">{name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {c.slug}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0"/>}
                </button>
              )
            })}
          </div>

          {canAddBranch && (
            <div className="pt-2 mt-2 border-t border-border">
              <button
 type="button"onClick={() => {
 setIsOpen(false)
 const branchCheck = checkCanCreate('max_branches')
 if (!branchCheck.allowed || isTrialExpired) {
 openLimitExceededModal('max_branches')
 return
                  }
 router.push('/onboarding')
                }}
 className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-medium text-primary hover:bg-primary/10 text-primary dark:hover:bg-primary/10 cursor-pointer bangla-text">
                <PlusCircle className="h-4 w-4"/>
                <span>{tBilingual('Add New Company / Branch', 'নতুন প্রতিষ্ঠান / শাখা যোগ করুন')}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
