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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { PlusCircle, ClipboardPaste, Sparkles, Upload } from 'lucide-react'
import type { DesignJobRecord, DesignPriority, DesignFormat } from '@/types/design.types'

interface CustomerOption {
  id: string
  name: string
  mobile?: string
}

interface DesignNewJobModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  customers: CustomerOption[]
  currentUserName?: string
  onCreateJob: (newJob: DesignJobRecord) => void
  onShowNotification?: (msg: string, type?: 'success' | 'warning' | 'info') => void
}

export const DesignNewJobModal = React.memo(function DesignNewJobModal({
  isOpen,
  onClose,
  companyId,
  customers,
  currentUserName,
  onCreateJob,
  onShowNotification,
}: DesignNewJobModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '')
  const [title, setTitle] = useState('')
  const [dimensions, setDimensions] = useState('8.5 x 11 in')
  const [material, setMaterial] = useState('300 GSM Art Card')
  const [priority, setPriority] = useState<DesignPriority>('normal')
  const [instructions, setInstructions] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [format, setFormat] = useState<DesignFormat>('png')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handlePasteClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read()
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'))
        if (imageType) {
          const blob = await item.getType(imageType)
          const reader = new FileReader()
          reader.onload = (e) => {
            const dataUrl = e.target?.result as string
            setProofUrl(dataUrl)
            onShowNotification?.('ক্লিপবোর্ড থেকে ছবি সফলভাবে যুক্ত হয়েছে! (Pasted Image)', 'success')
          }
          reader.readAsDataURL(blob)
          return
        }
      }
      onShowNotification?.('ক্লিপবোর্ডে কোনো ছবি পাওয়া যায়নি। স্ক্রিনশট কপি করে পেস্ট করুন।', 'warning')
    } catch {
      onShowNotification?.('ব্রাউজার ক্লিপবোর্ড এক্সেস অনুমতি দিন বা ফাইল আপলোড করুন।', 'warning')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      onShowNotification?.('দয়া করে ডিজাইনের নাম বা টাইটেল লিখুন', 'warning')
      return
    }

    setIsSubmitting(true)
    try {
      const cust = customers.find((c) => c.id === selectedCustomerId) || customers[0]
      const dsnNumber = `DSN-${Date.now().toString().slice(-4)}`
      const fallbackProof =
        proofUrl ||
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'

      const newJob: DesignJobRecord = {
        id: `dsn-${Date.now()}`,
        company_id: companyId,
        design_number: dsnNumber,
        customer_id: cust?.id || 'cust-walkin',
        customer_name: cust?.name || 'Walk-in Counter Customer',
        customer_phone: cust?.mobile || null,
        title: title.trim(),
        product_name: title.trim(),
        designer_name: currentUserName || 'Tanvir Ahmed',
        priority,
        status: 'received',
        deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] + ' 18:00',
        instructions: instructions || null,
        dimensions_spec: dimensions || 'Standard Spec',
        material: material || null,
        current_version: 1,
        revision_count: 0,
        is_locked: false,
        workflow_routing: 'design_required',
        versions: [
          {
            id: `dv-${Date.now()}`,
            design_job_id: `dsn-${Date.now()}`,
            version_number: 1,
            version_label: 'Version 1 (Initial Brief)',
            proof_file_name: `brief_${Date.now()}.${format}`,
            proof_file_url: fallbackProof,
            file_format: format,
            uploaded_by_name: currentUserName || 'Counter Designer',
            created_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      onCreateJob(newJob)
      onShowNotification?.(`নতুন কাজ #${dsnNumber} সফলভাবে গ্রহণ করা হয়েছে!`, 'success')
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
            <PlusCircle className="h-5 w-5" />
            <span>নতুন আর্টওয়ার্ক বা ডিজাইন জব এন্ট্রি (New Design Entry)</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            দোকানে বসা কাস্টমার বা সরাসরি ডিজাইন রিকোয়ারমেন্ট যুক্ত করুন
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Selector */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">কাস্টমার (Customer):</Label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.mobile ? `(${c.mobile})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">জরুরিত্ব (Priority):</Label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as DesignPriority)}
                className="w-full text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-slate-800 dark:text-slate-200"
              >
                <option value="normal">সাধারণ (Normal)</option>
                <option value="urgent">জরুরী (Urgent - Today)</option>
                <option value="very_urgent">খুবই জরুরী (Very Urgent / Walk-in)</option>
              </select>
            </div>
          </div>

          {/* Job Title */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ডিজাইন বা কাজের নাম (Artwork Title): *
            </Label>
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: ৩×১০ ফিট ব্যানার, বিজনেস কার্ড, ৪ কালার লিফলেট..."
              className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dimensions */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">সাইজ / পরিমাপ (Dimensions):</Label>
              <Input
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="যেমন: 3.5 x 2 in, 10 x 3 ft, A4"
                className="text-xs font-mono bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>

            {/* Material */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">মেটেরিয়াল (Material):</Label>
              <Input
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                placeholder="যেমন: Star Flex 320g, 300 GSM Art Card"
                className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              ডিজাইন ব্রিফ ও কাস্টমারের নির্দেশনা (Design Brief / Notes):
            </Label>
            <Textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="কাস্টমারের কালার পছন্দ, ফন্ট, লোগো ও টেক্সটের বিবরণ..."
              className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Quick Paste or Image URL */}
          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>রেফারেন্স আর্টওয়ার্ক বা প্রিভিউ (Artwork Image / Proof):</span>
              </Label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-bold"
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
                <span>ক্লিপবোর্ড থেকে পেস্ট (Ctrl+V)</span>
              </button>
            </div>
            <Input
              value={proofUrl}
              onChange={(e) => setProofUrl(e.target.value)}
              placeholder="https://... বা স্ক্রিনশট পেস্ট করুন"
              className="text-xs font-mono bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              বাতিল (Cancel)
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md"
            >
              <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
              <span>{isSubmitting ? 'সেভ হচ্ছে...' : 'কাজ শুরু করুন (Create Design Job)'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
})
