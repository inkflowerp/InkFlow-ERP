'use client'

import React, { useState, useRef } from 'react'
import {
  Upload,
  FileCheck,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  X,
  Loader2,
  Send,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { DesignJobRecord } from '@/types/design.types'
import { validateAndUploadDesignVersionAction } from '@/actions/design.actions'

interface DesignUploadVersionModalProps {
  isOpen: boolean
  onClose: () => void
  job: DesignJobRecord | null
  onSuccess?: () => void
}

const ALLOWED_EXTS = ['pdf', 'ai', 'psd', 'eps', 'tiff', 'tif', 'png', 'jpg', 'jpeg', 'svg']
const MAX_BYTES = 50 * 1024 * 1024 // 50MB

export function DesignUploadVersionModal({
  isOpen,
  onClose,
  job,
  onSuccess,
}: DesignUploadVersionModalProps) {
  const { tBilingual } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setValidationError(null)
    setSuccessMessage(null)

    // 1. Size Check
    if (file.size > MAX_BYTES) {
      setValidationError(
        tBilingual(
          `File exceeds 50MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          `ফাইলের আকার ৫০ মেগাবাইটের বেশি (${(file.size / (1024 * 1024)).toFixed(1)}MB)।`
        )
      )
      setSelectedFile(null)
      return
    }

    // 2. Extension check
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    if (!ALLOWED_EXTS.includes(ext)) {
      setValidationError(
        tBilingual(
          `Invalid file format (.${ext}). Only PDF, AI, PSD, EPS, TIFF, PNG, and JPEG allowed.`,
          `অননুমোদিত ফরম্যাট (.${ext})। শুধুমাত্র PDF, AI, PSD, EPS, TIFF, PNG এবং JPEG অনুমোদিত।`
        )
      )
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!job || !selectedFile) return

    setIsUploading(true)
    setValidationError(null)

    try {
      const res = await validateAndUploadDesignVersionAction({
        designJobId: job.id,
        fileName: selectedFile.name,
        fileType: selectedFile.type || selectedFile.name.split('.').pop(),
        fileSizeBytes: selectedFile.size,
        notes: notes.trim() || undefined,
      })

      if (!res.success) {
        setValidationError(res.error || tBilingual('Upload failed.', 'আপলোড ব্যর্থ হয়েছে।'))
        return
      }

      setSuccessMessage(
        tBilingual(
          `Version V${res.data?.version.version_number} uploaded successfully!`,
          `সংস্করণ V${res.data?.version.version_number} সফলভাবে আপলোড হয়েছে!`
        )
      )

      setTimeout(() => {
        onSuccess?.()
        onClose()
        setSelectedFile(null)
        setNotes('')
        setSuccessMessage(null)
      }, 1500)
    } catch (err: any) {
      setValidationError(err.message || 'An unexpected error occurred.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!job) return null

  const currentVer = job.current_version || `V${job.version_count || 1}`
  const nextVerNumber = (job.version_count || 1) + 1

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual(`Upload Design Version (V${nextVerNumber})`, `নতুন ডিজাইন সংস্করণ আপলোড (V${nextVerNumber})`)}
      hideFooter={true}
    >
      <form onSubmit={handleUploadSubmit} className="space-y-4">
        {/* Job summary tile */}
        <div className="p-3.5 bg-muted border border-border rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span>{job.design_number} • {job.title}</span>
            <Badge variant="outline" className="border-border text-xs">
              Current: {currentVer}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {job.customer_name} • {job.product_name || 'Design Job'}
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-success-surface text-success border border-border rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {validationError && (
          <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* File Picker / Drag Drop */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Artwork File (PDF, AI, PSD, TIFF, PNG)', 'আর্টওয়ার্ক ফাইল (PDF, AI, PSD, TIFF, PNG)')}
          </Label>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
              selectedFile
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border hover:border-foreground/40 bg-card text-muted-foreground'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ai,.psd,.eps,.tiff,.tif,.png,.jpg,.jpeg,.svg"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileCheck className="h-6 w-6 text-success" />
                <div className="text-left text-xs">
                  <p className="font-bold text-foreground">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="h-7 w-7 text-muted-foreground mx-auto" />
                <p className="text-xs font-bold text-foreground">
                  {tBilingual('Tap to select file from device', 'ডিভাইস থেকে ফাইল নির্বাচন করুন')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 50MB • Virus-safe sanitization enabled
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Version Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground">
            {tBilingual('Version Change Notes', 'সংস্করণ পরিবর্তনের বিবরণ')}
          </Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tBilingual('e.g. Color corrected as per client call, increased margin...', 'যেমন: ক্লায়েন্টের কথামত রঙ পরিবর্তন ও মার্জিন বৃদ্ধি...')}
            className="text-xs h-10"
          />
        </div>

        {/* Security / Expiry Notice */}
        <div className="p-2.5 rounded-lg bg-muted text-muted-foreground text-xs flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span>
            {tBilingual(
              'Company-scoped storage with auto-expiring signed URLs (1 hr) for security.',
              'কোম্পানি-স্কোপড সুরক্ষিত স্টোরেজ ও ১ ঘণ্টার মেয়াদি সাইন্ড লিংক নিশ্চিত।'
            )}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isUploading}
            className="text-xs min-h-[48px] h-12 px-4 cursor-pointer"
          >
            {tBilingual('Cancel', 'বাতিল')}
          </Button>

          <Button
            type="submit"
            disabled={!selectedFile || isUploading}
            className="text-xs font-bold min-h-[48px] h-12 px-5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{tBilingual('Uploading...', 'আপলোড হচ্ছে...')}</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>{tBilingual(`Upload V${nextVerNumber}`, `V${nextVerNumber} আপলোড করুন`)}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </ModalDialog>
  )
}
