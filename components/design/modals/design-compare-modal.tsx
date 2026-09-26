'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SplitSquareVertical, ArrowRightLeft } from 'lucide-react'
import type { DesignJobRecord } from '@/types/design.types'

interface DesignCompareModalProps {
  isOpen: boolean
  onClose: () => void
  job: DesignJobRecord | null
}

export const DesignCompareModal = React.memo(function DesignCompareModal({
  isOpen,
  onClose,
  job,
}: DesignCompareModalProps) {
  const [verA, setVerA] = useState(1)
  const [verB, setVerB] = useState(2)

  if (!job) return null

  const versions = job.versions || []
  const verCount = versions.length

  const versionA = versions.find((v) => v.version_number === verA) || versions[0]
  const versionB = versions.find((v) => v.version_number === verB) || versions[versions.length - 1]

  const urlA = versionA?.proof_file_url || versionA?.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'
  const urlB = versionB?.proof_file_url || versionB?.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-slate-950 border border-slate-800 text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-300">
            <SplitSquareVertical className="h-5 w-5" />
            <span>Side-by-Side Version Diff & Compare (আর্টওয়ার্ক সংশোধন তুলনা)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            জব: {job.title} (#{job.design_number}) | কাস্টমারের সংশোধিত পরিবর্তন যাচাই করুন
          </DialogDescription>
        </DialogHeader>

        {/* Version Selectors */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg border border-slate-800 my-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-400">বাম পাশের ভার্সন (Left):</Label>
            <select
              value={verA}
              onChange={(e) => setVerA(Number(e.target.value))}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded p-1.5"
            >
              {versions.map((v) => (
                <option key={v.id || v.version_number} value={v.version_number}>
                  v{v.version_number} ({v.version_label || 'Proof'})
                </option>
              ))}
            </select>
          </div>

          <ArrowRightLeft className="h-4 w-4 text-slate-500" />

          <div className="flex items-center gap-2">
            <Label className="text-xs text-slate-400">ডান পাশের ভার্সন (Right):</Label>
            <select
              value={verB}
              onChange={(e) => setVerB(Number(e.target.value))}
              className="text-xs bg-slate-800 border border-slate-700 text-slate-200 rounded p-1.5"
            >
              {versions.map((v) => (
                <option key={v.id || v.version_number} value={v.version_number}>
                  v{v.version_number} ({v.version_label || 'Proof'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side-by-Side Views */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[55vh]">
          {/* Version A */}
          <div className="flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 border-b border-slate-700 flex justify-between">
              <span>ভার্সন v{versionA?.version_number}</span>
              <span className="text-2xs text-slate-400">{versionA?.created_at?.split('T')[0]}</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlA} alt="Version A" className="max-h-full max-w-full object-contain" />
            </div>
          </div>

          {/* Version B */}
          <div className="flex flex-col bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
            <div className="bg-emerald-950/60 px-3 py-1.5 text-xs font-semibold text-emerald-300 border-b border-emerald-800/60 flex justify-between">
              <span>ভার্সন v{versionB?.version_number} (Latest)</span>
              <span className="text-2xs text-emerald-400">{versionB?.created_at?.split('T')[0]}</span>
            </div>
            <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urlB} alt="Version B" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-800 pt-3">
          <Button
            type="button"
            size="sm"
            onClick={onClose}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            বন্ধ করুন (Close)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})
