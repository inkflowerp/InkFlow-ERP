'use client'

import React, { useState, useEffect } from 'react'
import {
 Calendar,
 CheckCircle2,
 X,
 Phone,
 Building2,
 Mail,
 User,
 MapPin,
 Loader2,
 AlertCircle,
 Briefcase,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'
import { submitDemoRequestAction } from '@/actions/lead.actions'

interface DemoModalProps {
 isOpen: boolean
 onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
 const { tBilingual } = useI18n()
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [serverError, setServerError] = useState<string | null>(null)
 const [submitted, setSubmitted] = useState(false)
 const [successMessage, setSuccessMessage] = useState('')

 const [formData, setFormData] = useState({
 businessName: '',
 contactName: '',
 phone: '',
 email: '',
 city: 'Dhaka',
 businessType: 'Digital Flex & Banner',
  })

  // Keyboard escape listener & reset on close
 useEffect(() => {
 if (!isOpen) {
 setSubmitted(false)
 setServerError(null)
 return
    }

 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 e.preventDefault()
 onClose()
      }
    }

 window.addEventListener('keydown', handleKeyDown)
 return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

 if (!isOpen) return null

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 setServerError(null)
 setIsSubmitting(true)

 try {
 const res = await submitDemoRequestAction({
 pressName: formData.businessName,
 contactName: formData.contactName,
 phone: formData.phone,
 email: formData.email,
 city: formData.city,
 businessType: formData.businessType,
      })

 if (res.success) {
 setSubmitted(true)
 setSuccessMessage(
 res.message ||
            'Demo request scheduled successfully. Our Dhaka team will contact you within 2 hours.'
        )
      } else {
 setServerError(res.error || 'Failed to submit demo request. Please check your information.')
      }
    } catch {
 setServerError('An unexpected error occurred. Please verify your connection or call our helpline.')
    } finally {
 setIsSubmitting(false)
    }
  }

 return (
    <div
 className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-inset backdrop-blur-sm animate-in fade-in-0 duration-200 overflow-y-auto cursor-pointer"onClick={onClose}
 role="dialog"aria-modal="true"aria-labelledby="demo-modal-title">
      <div
 className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card border border-border p-6 sm:p-8 shadow-lg text-foreground my-auto cursor-default animate-in zoom-in-95 duration-200"onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
 type="button"onClick={onClose}
 className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted transition-colors cursor-pointer"aria-label="Close dialog">
          <X className="h-5 w-5"/>
        </button>

        {submitted ? (
          <div className="text-center py-6 sm:py-8 space-y-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-success-surface bg-success/20 text-success text-success flex items-center justify-center mx-auto border border-success-border border-success-border/30">
              <CheckCircle2 className="h-8 w-8"/>
            </div>

            <h3 id="demo-modal-title"className="text-xl sm:text-2xl font-bold text-foreground bangla-text">
              {tBilingual('Demo Walkthrough Scheduled!', 'ডেমো রিকোয়েস্ট নিশ্চিত হয়েছে!')}
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto bangla-text">
              {tBilingual(
 successMessage,
                'আমাদের ঢাকা অনবোর্ডিং স্পেশালিস্ট আগামী ২ কর্মঘণ্টার মধ্যে কল করে আপনার সাথে লাইভ স্ক্রিন ডেমো পরিচালনা করবেন।'
              )}
            </p>

            <div className="pt-4">
              <Button
 onClick={onClose}
 className="w-full sm:w-auto px-8 h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
                {tBilingual('Done', 'সম্পন্ন')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="space-y-1.5 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary bg-primary/40 text-primary border border-primary/20 border-border/60">
                <Calendar className="h-3.5 w-3.5"/>
                <span>{tBilingual('Live Walkthrough', 'লাইভ স্ক্রিন ডেমো')}</span>
              </div>
              <h3 id="demo-modal-title"className="text-xl sm:text-2xl font-black text-foreground tracking-tight bangla-text">
                {tBilingual('Schedule a Personalized Demo', 'আপনার প্রেসের জন্য ডেমো বুক করুন')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed bangla-text">
                {tBilingual(
                  'See how PrintFlow manages your actual machines, roll stocks, and customer dues in real time.',
                  'আপনার মেশিনের প্রকার, রোল স্টক এবং বাকি খাতার হিসাব কীভাবে পরিচালিত হবে তা সরাসরি দেখুন।'
                )}
              </p>
            </div>

            {/* Error Banner */}
            {serverError && (
              <div className="p-3 rounded-xl bg-danger-surface bg-danger-surface border border-danger-border border-danger-border text-destructive text-destructive text-xs flex items-start gap-2 animate-in fade-in-0">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5"/>
                <span>{serverError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-foreground font-medium mb-1">
                  {tBilingual('Press or Business Name *', 'প্রেস বা প্রতিষ্ঠানের নাম *')}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                  <input
 required
 type="text"placeholder="e.g. Apex Digital Press"value={formData.businessName}
 onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
 className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs transition-all"/>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1">
                    {tBilingual('Your Name *', 'আপনার নাম *')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <input
 required
 type="text"placeholder="Kamrul Hasan"value={formData.contactName}
 onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
 className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs transition-all"/>
                  </div>
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">
                    {tBilingual('Mobile Number (WhatsApp) *', 'মোবাইল নম্বর (হোয়াটসঅ্যাপ) *')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                    <input
 required
 type="tel"placeholder="01712-XXXXXX"value={formData.phone}
 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
 className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs tabular-nums transition-all"/>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-foreground font-medium mb-1">
                    {tBilingual('City / District', 'জেলা বা অঞ্চল')}
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none"/>
                    <select
 value={formData.city}
 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
 className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs cursor-pointer">
                      <option value="Dhaka">Dhaka (Motijheel / Arambagh)</option>
                      <option value="Chattogram">Chattogram</option>
                      <option value="Bogura">Bogura</option>
                      <option value="Sylhet">Sylhet</option>
                      <option value="Khulna">Khulna</option>
                      <option value="Rajshahi">Rajshahi</option>
                      <option value="Other">Other District</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-foreground font-medium mb-1">
                    {tBilingual('Primary Business Focus', 'প্রধান কাজের ধরন')}
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none"/>
                    <select
 value={formData.businessType}
 onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
 className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs cursor-pointer">
                      <option value="Digital Flex & Banner">Digital Flex & Banner</option>
                      <option value="Offset Printing Press">Offset Commercial Press</option>
                      <option value="Acrylic & LED Signage">Acrylic & LED Signage</option>
                      <option value="Packaging & Box Making">Packaging & Box Making</option>
                      <option value="Advertising Agency">Advertising Agency</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-foreground font-medium mb-1">
                  {tBilingual('Email Address (Optional)', 'ইমেইল এড্রেস (ঐচ্ছিক)')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
                  <input
 type="email"placeholder="info@yourpress.com.bd"value={formData.email}
 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
 className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs transition-all"/>
                </div>
              </div>

              <div className="pt-3">
                <Button
 type="submit"disabled={isSubmitting}
 className="w-full h-11 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer bangla-text flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin"/>
                      <span>{tBilingual('Scheduling Walkthrough...', 'শিডিউল করা হচ্ছে...')}</span>
                    </>
                  ) : (
                    <span>{tBilingual('Confirm & Schedule Demo', 'ডেমো শিডিউল নিশ্চিত করুন')}</span>
                  )}
                </Button>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {tBilingual(
                    'No software installation required • 30-minute interactive screen share',
                    'কোনো সফটওয়্যার ইনস্টল করতে হবে না • ৩০ মিনিটের ইন্টারঅ্যাক্টিভ স্ক্রিন শেয়ার'
                  )}
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
