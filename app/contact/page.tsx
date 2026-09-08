'use client'

import React, { useState } from 'react'
import { MarketingNavbar } from '@/components/marketing/marketing-navbar'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { DemoModal } from '@/components/marketing/demo-modal'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Building2,
  User,
  MessageSquare,
} from 'lucide-react'

export default function PublicContactPage() {
  const [demoOpen, setDemoOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { tBilingual } = useI18n()

  const [form, setForm] = useState({
    name: '',
    pressName: '',
    phone: '',
    email: '',
    message: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-white font-sans antialiased overflow-x-hidden">
      <MarketingNavbar onOpenDemo={() => setDemoOpen(true)} />

      <main className="pt-20">
        {/* Banner */}
        <div className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800 text-center px-4">
          <div className="max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              Get in Touch
            </span>
            <h1 className="text-4xl sm:text-5xl font-black text-white bangla-text">
              {tBilingual('We’re Here to Help Your Press Grow.', 'আপনার প্রেসের সহযোগিতায় আমরা প্রস্তুত।')}
            </h1>
            <p className="text-slate-400 text-base max-w-xl mx-auto leading-relaxed bangla-text">
              {tBilingual(
                'Have a question about implementation, pricing, or custom hardware integrations? Reach out to our Dhaka support team.',
                'সফটওয়্যার বাস্তবায়ন, ট্রেনিং বা কাস্টম ইন্টিগ্রেশনের যেকোনো প্রশ্নে আমাদের সাথে যোগাযোগ করুন।'
              )}
            </p>
          </div>
        </div>

        {/* Contact Layout */}
        <div className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Info Column (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-6">
                <h3 className="text-xl font-bold text-white bangla-text">
                  {tBilingual('Dhaka Headquarters & Help Desk', 'ঢাকা প্রধান কার্যালয় ও সাপোর্ট ডেস্ক')}
                </h3>

                <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Arambagh Press Cluster</span>
                      <span className="text-slate-400">
                        Level 4, Modern Bhaban, Motijheel C/A, Dhaka-1000, Bangladesh
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Direct Phone & WhatsApp Hotline</span>
                      <span className="text-cyan-400 font-mono">+880 1819-876543 / +880 1711-234567</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Email Inquiries</span>
                      <span className="text-slate-400 font-mono">support@printerp.com.bd</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Press Support Hours</span>
                      <span className="text-slate-400">
                        Saturday – Thursday: 9:00 AM – 9:00 PM (Emergency 24/7 for Enterprise)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <a
                    href="https://wa.me/8801819876543"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat on WhatsApp Directly</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Contact Form (7 Cols) */}
            <div className="lg:col-span-7">
              <div className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6">
                {submitted ? (
                  <div className="text-center py-12 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-white bangla-text">
                      {tBilingual('Message Dispatched!', 'আপনার বার্তা সফলভাবে পৌঁছেছে!')}
                    </h3>
                    <p className="text-sm text-slate-300 max-w-sm mx-auto leading-relaxed bangla-text">
                      {tBilingual(
                        'Thank you for reaching out. A PrintERP technical specialist will get back to you within 2 hours.',
                        'আমাদের টেকনিক্যাল সাপোর্ট টিম দ্রুততম সময়ের মধ্যে আপনার সাথে যোগাযোগ করবে।'
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white bangla-text">
                        {tBilingual('Send Us a Message', 'আমাদের একটি বার্তা পাঠান')}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Fill out the details below and we will respond promptly.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            Your Name *
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Kamrul Hasan"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            Press / Shop Name *
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Padma Digital Press"
                            value={form.pressName}
                            onChange={(e) => setForm({ ...form, pressName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            Mobile (WhatsApp) *
                          </label>
                          <input
                            required
                            type="tel"
                            placeholder="01712-XXXXXX"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-semibold mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="info@yourpress.com.bd"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-300 font-semibold mb-1">
                          How can we help your business? *
                        </label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Tell us about your machine models, shop location, or specific requirements..."
                          value={form.message}
                          onChange={(e) => setForm({ ...form, message: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs resize-none"
                        />
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          className="w-full h-11 font-bold text-sm bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg cursor-pointer bangla-text"
                        >
                          <Send className="mr-2 h-4 w-4" />
                          <span>{tBilingual('Send Inquiries', 'বার্তা পাঠান')}</span>
                        </Button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
      <DemoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  )
}
