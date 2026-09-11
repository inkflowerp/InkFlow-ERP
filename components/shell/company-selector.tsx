'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronsUpDown, PlusCircle, Sparkles } from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { useOutsideClick } from '@/hooks/use-outside-click'
import { cn } from '@/lib/utils'

export function CompanySelector() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useOutsideClick<HTMLDivElement>(() => setIsOpen(false), isOpen)
  const { company, availableCompanies, switchCompany } = useTenant()
  const { accountType, accountTypeMeta, isTrial, daysRemainingInTrial, timeRemainingInTrial, checkCanCreate, openLimitExceededModal, isTrialExpired } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const router = useRouter()

  const displayName = company
    ? tBilingual(company.name, company.name_bn || company.name)
    : tBilingual('Select Company', 'প্রতিষ্ঠান নির্বাচন')

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-2 sm:px-3 py-1.5 text-left text-sm font-medium transition-all hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:hover:bg-slate-800 cursor-pointer shrink-0 whitespace-nowrap min-h-[40px]"
        suppressHydrationWarning
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-white font-bold text-xs shadow-xs shrink-0"
          suppressHydrationWarning
        >
          {company?.name ? company.name.charAt(0).toUpperCase() : 'P'}
        </div>
        <div className="flex flex-col text-left max-w-[110px] xs:max-w-[150px] sm:max-w-[180px] lg:max-w-[220px] min-w-0" suppressHydrationWarning>
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm whitespace-nowrap" suppressHydrationWarning>
              {displayName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10px] text-slate-400 capitalize whitespace-nowrap hidden xs:inline" suppressHydrationWarning>
              {company?.business_type?.replace('_', ' ') || 'Printing & Signage'}
            </span>
            <span
              className={cn(
                'text-[8px] xs:text-[9px] px-1 xs:px-1.5 py-0.2 rounded font-bold uppercase tracking-wider border shrink-0',
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
        <ChevronsUpDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 shrink-0 ml-0.5" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 bangla-text">
            {tBilingual('Your Organizations', 'আপনার প্রতিষ্ঠানসমূহ')}
          </div>

          <div className="space-y-1 my-1">
            {availableCompanies.map((c) => {
              const isSelected = c.slug === company?.slug
              const name = tBilingual(c.name, c.name_bn || c.name)

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    switchCompany(c.slug)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer',
                    isSelected && 'bg-blue-50/80 text-blue-900 dark:bg-blue-950/60 dark:text-blue-200 font-semibold'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <div className="flex flex-col truncate">
                      <span className="truncate">{name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {c.slug}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              )
            })}
          </div>

          <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                const branchCheck = checkCanCreate('max_branches')
                if (!branchCheck.allowed || isTrialExpired) {
                  openLimitExceededModal('max_branches')
                  return
                }
                router.push('/onboarding')
              }}
              className="flex w-full items-center gap-2 rounded-lg p-2 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 cursor-pointer bangla-text"
            >
              <PlusCircle className="h-4 w-4" />
              <span>{tBilingual('Add New Company / Branch', 'নতুন প্রতিষ্ঠান / শাখা যোগ করুন')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
