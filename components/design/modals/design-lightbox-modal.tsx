'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, Maximize2 } from 'lucide-react'
import type { DesignJobRecord } from '@/types/design.types'

interface DesignLightboxModalProps {
  isOpen: boolean
  onClose: () => void
  job: DesignJobRecord | null
  versionIndex?: number
}

export const DesignLightboxModal = React.memo(function DesignLightboxModal({
  isOpen,
  onClose,
  job,
  versionIndex = -1,
}: DesignLightboxModalProps) {
  const [zoomLevel, setZoomLevel] = useState(1)

  if (!job) return null

  const versions = job.versions || []
  const activeVerIdx = versionIndex >= 0 && versionIndex < versions.length ? versionIndex : versions.length - 1
  const activeVersion = versions[activeVerIdx]
  const previewUrl = activeVersion?.proof_file_url || activeVersion?.preview_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-slate-950 border border-slate-800 text-slate-100 p-4 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-indigo-300">
              <Eye className="h-4 w-4" />
              <span>{job.title} — High-Res Artwork Inspection (আর্টওয়ার্ক ভিউয়ার)</span>
            </DialogTitle>
            <div className="text-xs text-slate-400 font-mono">
              Job: #{job.design_number} | v{activeVersion?.version_number || job.current_version || 1}
            </div>
          </div>
          {job.dimensions_spec && (
            <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
              <span>📐 সাইজ: <strong className="text-slate-200">{job.dimensions_spec}</strong></span>
              {job.material && <span>| মেটেরিয়াল: <strong className="text-slate-200">{job.material}</strong></span>}
            </div>
          )}
        </DialogHeader>

        {/* Image Container with Zoom */}
        <div className="relative h-[65vh] w-full bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 my-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={job.title}
            style={{ transform: `scale(${zoomLevel})` }}
            className="max-h-full max-w-full object-contain transition-transform duration-200"
          />
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
              className="text-xs bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              <ZoomIn className="h-3.5 w-3.5 mr-1" />
              <span>Zoom In</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
              className="text-xs bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              <ZoomOut className="h-3.5 w-3.5 mr-1" />
              <span>Zoom Out</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomLevel(1)}
              className="text-xs bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              <span>Reset (100%)</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              <span>ডাউনলোড (Download)</span>
            </a>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              বন্ধ করুন (Close)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
