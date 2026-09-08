'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Mail, ArrowLeft, CheckCircle2, Server, KeyRound, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { AuthService } from '@/services/auth.service'

export default function PlatformForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setIsLoading(true)
    setError(null)

    try {
      await AuthService.forgotPassword(email)
      // Generic security message regardless of whether the account exists in DB
      setIsSubmitted(true)
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.includes('network')) {
        setError('Unable to connect. Check your connection and try again.')
      } else {
        setIsSubmitted(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 text-white shadow-xl shadow-indigo-500/25 ring-1 ring-white/20 mb-2">
            <Server className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-indigo-400 font-bold">
              PrintERP Platform
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Reset Password
          </h1>
          <p className="text-xs text-slate-400">Platform administrator security recovery.</p>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-indigo-400" />
              <span>Forgot Password</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Enter your registered Platform Email to request a secure password reset link.
            </CardDescription>
          </CardHeader>

          {isSubmitted ? (
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-xl bg-emerald-950/60 p-4 text-xs text-emerald-200 border border-emerald-800/80 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-100">Password Reset Requested</div>
                  <div>
                    If an eligible account exists, a password reset email will be sent with further instructions.
                  </div>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full text-xs font-semibold border-slate-700 hover:bg-slate-800 min-h-[44px]">
                <Link href="/platform/login" className="flex items-center justify-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Sign In</span>
                </Link>
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-950/60 p-3 text-xs text-red-200 border border-red-800/80 flex items-start gap-2.5">
                    <Shield className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="platform-email" className="text-xs text-slate-300">Platform Email</Label>
                  <Input
                    id="platform-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="h-4 w-4 text-slate-400" />}
                    placeholder="admin@printerp.com.bd"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                  Password reset tokens are single-use, expire after 15 minutes, and invalidate all existing active sessions upon completion.
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs py-2.5 h-11 shadow-lg shadow-indigo-600/30 min-h-[44px]"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </CardContent>

              <CardFooter className="pt-2 pb-5 text-center text-xs text-slate-500 border-t border-slate-800/60 justify-center">
                <Link href="/platform/login" className="flex items-center gap-1.5 text-indigo-400 hover:underline font-semibold min-h-[36px]">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
