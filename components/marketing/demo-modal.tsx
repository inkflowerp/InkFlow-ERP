'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  CheckCircle2,
  X,
  Printer,
  Sparkles,
  Phone,
  Building2,
  Mail,
  User,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/context'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const { tBilingual } = useI18n()
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    city: 'Dhaka',
    businessType: 'Digital Flex & Banner',
  })

  useEffect(() => {
    if (!isOpen) return
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      // Auto close after 3 seconds or user can click
    }, 3000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0 duration-200 overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-slate-700 bg-slate-900 p-5 sm:p-8 shadow-2xl shadow-cyan-950/50 space-y-5 sm:space-y-6 my-auto cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="text-center py-6 sm:py-8 space-y-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white bangla-text">
              {tBilingual('Demo Request Received!', 'ডেমো রিকোয়েস্ট গৃহীত হয়েছে!')}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto bangla-text">
              {tBilingual(
                'Our Dhaka onboarding specialist will call you within 2 hours to schedule your personalized live screen walkthrough.',
                'আমাদের ঢাকা অনবোর্ডিং স্পেশালিস্ট আগামী ২ ঘণ্টার মধ্যে কল করে আপনার সময় অনুযায়ী লাইভ ডেমো পরিচালনা করবেন।'
              )}
            </p>
            <div className="pt-3 sm:pt-4">
              <Button onClick={onClose} className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6">
                Close Window
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="space-y-1 pr-6 sm:pr-0">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" />
                <span>Schedule Walkthrough</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white bangla-text">
                {tBilingual('Book a Personalized Demo', 'লাইভ স্ক্রিন ডেমো বুক করুন')}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                See how PrintERP manages your specific machines, roll inventory, and dues.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Press or Business Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input
                    required
                    type="text"
                    placeholder="e.g. Padma Digital Press, Dhaka"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Your Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      required
                      type="text"
                      placeholder="Kamrul Hasan"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Mobile Number (WhatsApp) *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      required
                      type="tel"
                      placeholder="01712-XXXXXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    City / District
                  </label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="Dhaka">Dhaka (Motijheel / Arambagh)</option>
                    <option value="Chattogram">Chattogram</option>
                    <option value="Bogura">Bogura</option>
                    <option value="Sylhet">Sylhet</option>
                    <option value="Khulna">Khulna</option>
                    <option value="Rajshahi">Rajshahi</option>
                    <option value="Other">Other District</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Primary Business
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                  >
                    <option value="Digital Flex & Banner">Digital Flex & Banner</option>
                    <option value="Offset Printing Press">Offset Commercial Press</option>
                    <option value="Acrylic & LED Signage">Acrylic & LED Signage</option>
                    <option value="Carton Packaging">Packaging & Box Making</option>
                    <option value="Advertising Agency">Advertising Agency</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 sm:pt-3">
                <Button
                  type="submit"
                  className="w-full h-11 font-bold text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg cursor-pointer bangla-text"
                >
                  {tBilingual('Confirm & Schedule Demo', 'ডেমো শিডিউল নিশ্চিত করুন')}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
