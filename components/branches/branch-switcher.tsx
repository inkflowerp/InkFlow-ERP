'use client'

import { useState } from 'react'
import type { BranchMasterRecord } from '../../types/branch.types.ts'

interface BranchSwitcherProps {
  branches: BranchMasterRecord[]
  selectedBranchId: string | null // null means 'All Branches'
  onSelectBranch: (branchId: string | null) => void
  userScope?: string
  disabled?: boolean
}

export function BranchSwitcher({
  branches,
  selectedBranchId,
  onSelectBranch,
  userScope = 'company',
  disabled = false,
}: BranchSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Single-branch restricted user
  if (branches.length <= 1 && userScope !== 'company' && userScope !== 'all_branches') {
    const single = branches[0]
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span>{single ? `${single.name} (${single.code})` : 'Main Branch'}</span>
      </div>
    )
  }

  const selectedBranch = branches.find((b) => b.id === selectedBranchId)

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-between space-x-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors min-h-[44px]"
        >
          <div className="flex items-center space-x-2">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedBranchId ? 'bg-emerald-500' : 'bg-primary-500'
              }`}
            ></span>
            <span className="truncate max-w-[160px]">
              {selectedBranch
                ? `${selectedBranch.name} (${selectedBranch.code})`
                : 'All Branches / সকল শাখা'}
            </span>
          </div>
          <svg
            className="w-4 h-4 ml-1 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute left-0 z-50 mt-2 w-64 origin-top-left rounded-xl bg-white dark:bg-slate-900 shadow-xl ring-1 ring-black ring-opacity-5 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 focus:outline-none">
            {(userScope === 'company' || userScope === 'all_branches') && (
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    onSelectBranch(null)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    selectedBranchId === null
                      ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                    <span>All Branches (Consolidated)</span>
                  </div>
                  {selectedBranchId === null && (
                    <span className="text-xs font-bold text-primary-500">✓</span>
                  )}
                </button>
              </div>
            )}

            <div className="p-1 max-h-60 overflow-y-auto">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onSelectBranch(b.id)
                    setIsOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-lg transition-colors ${
                    selectedBranchId === b.id
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {b.name}
                    </span>
                    <span className="text-xs text-slate-400">
                      {b.code} {b.name_bn ? `• ${b.name_bn}` : ''} {b.is_main ? '• HQ' : ''}
                    </span>
                  </div>
                  {selectedBranchId === b.id && (
                    <span className="text-xs font-bold text-emerald-500">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
