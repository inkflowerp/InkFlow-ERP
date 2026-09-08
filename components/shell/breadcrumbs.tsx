'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useI18n } from '@/i18n/context'

export function Breadcrumbs() {
  const pathname = usePathname()
  const { t } = useI18n()

  const segments = pathname.split('/').filter(Boolean)

  if (segments.length <= 1) return null

  // Format path segments
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 max-w-[220px] overflow-hidden">
      <Link
        href={`/${segments[0]}/dashboard`}
        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
      </Link>

      {segments.slice(1).map((seg, idx) => {
        const isLast = idx === segments.length - 2
        const href = `/${segments.slice(0, idx + 2).join('/')}`
        const label = t(`nav.${seg}`) || seg.replace('-', ' ')

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 text-slate-400" />
            {isLast ? (
              <span className="font-semibold text-slate-900 dark:text-white capitalize">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-900 dark:hover:text-white transition-colors capitalize"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
