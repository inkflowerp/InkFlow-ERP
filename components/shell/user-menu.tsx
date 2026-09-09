'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, User as UserIcon, Shield } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth()
  const { company, currentRole, currentBranch, currentUser } = useTenant()
  const { locale, tBilingual } = useI18n()
  const router = useRouter()
  const slug = company?.slug || 'my-company'
  const isOwner = currentRole === 'owner' || currentRole === 'admin'

  const userName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : 'User'
  const userEmail = currentUser?.profile?.email || ''

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
      >
        <Avatar
          fallback={userName}
          src={currentUser?.profile?.avatar_url || undefined}
          className="h-8 w-8 text-xs font-bold shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        />
        <div className="hidden 2xl:flex flex-col text-left shrink-0 whitespace-nowrap max-w-[130px]">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight whitespace-nowrap truncate">
            {userName}
          </span>
          <span className="text-[10px] text-slate-400 capitalize whitespace-nowrap truncate">
            {currentRole || 'Staff'} {currentBranch ? `• ${currentBranch.code || currentBranch.name.split(' ')[0]}` : ''}
          </span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-0 zoom-in-95">
            <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {userName}
              </p>
              {userEmail && <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4 border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <Shield className="h-2.5 w-2.5 mr-1 text-blue-600" />
                  {currentRole || 'Staff'}
                </Badge>
                {currentBranch && (
                  <Badge variant="secondary" className="text-[9px] py-0 h-4 truncate max-w-[130px]">
                    {currentBranch.name.split('(')[0].trim()}
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-0.5 py-1">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
                onClick={() => {
                  setIsOpen(false)
                  router.push(`/${slug}/settings/users`)
                }}
              >
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span>{tBilingual('My Profile & Team', 'আমার প্রোফাইল ও টিম')}</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
                onClick={() => {
                  setIsOpen(false)
                  router.push(`/${slug}/settings/company`)
                }}
              >
                <Settings className="h-3.5 w-3.5 text-slate-400" />
                <span>{tBilingual('Company Settings', 'প্রতিষ্ঠান সেটিংস')}</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer bangla-text"
                onClick={() => {
                  setIsOpen(false)
                  router.push(`/${slug}/settings/subscription`)
                }}
              >
                <Shield className="h-3.5 w-3.5 text-amber-500" />
                <span>{tBilingual('Subscription & Plan', 'সাবস্ক্রিপশন ও প্ল্যান')}</span>
              </button>
              {isOwner && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                  onClick={() => {
                    setIsOpen(false)
                    router.push('/platform-admin')
                  }}
                >
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Platform Owner Portal</span>
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 pt-1 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  signOut()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer bangla-text"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{tBilingual('Sign Out', 'লগ আউট')}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
