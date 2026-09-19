'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'

export function Breadcrumbs() {
  const pathname = usePathname()
  const { company } = useTenant()
  const { t } = useI18n()

  const rawSegments = (pathname || '').split('/').filter(Boolean)
  // If first segment matches the company slug, strip it for clean display
  const segments = company?.slug && rawSegments[0] === company.slug
    ? rawSegments.slice(1)
    : rawSegments

  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'dashboard')) {
    return null
  }

  // Format path segments
  return (
    <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0 max-w-[280px] overflow-hidden">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
        title="Dashboard"
      >
        <Home className="h-3.5 w-3.5 shrink-0" />
      </Link>

      {segments.map((seg, idx) => {
        const isLast = idx === segments.length - 1
        const href = `/${segments.slice(0, idx + 1).join('/')}`
        const label = t(`nav.${seg}`) || seg.replace(/-/g, ' ')

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3 w-3 text-slate-400 shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-900 dark:text-white capitalize truncate">
                {label}
              </span>
            ) : (
              <Link
                href={href}
                className="hover:text-slate-900 dark:hover:text-white transition-colors capitalize truncate"
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
