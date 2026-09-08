'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Shield, Lock, Eye, EyeOff, CheckCircle2, Server, ArrowRight, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { resetPasswordAction } from '@/actions/auth.actions'

function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const passwordRules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Passwords match', met: password.length > 0 && password === confirmPassword },
  ]

  const isPasswordValid = password.length >= 8 && password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const res = await resetPasswordAction(password)
      if (res.success) {
        setIsSuccess(true)
      } else {
        setError(res.error || 'Failed to reset password. The link may have expired.')
      }
    } catch (err: any) {
      setError('Unable to connect. Check your connection and try again.')
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
            Set New Password
          </h1>
          <p className="text-xs text-slate-400">Secure your Platform Owner credentials.</p>
        </div>

        <Card className="bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-xl text-slate-100">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-slate-200 flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span>Update Credentials</span>
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">
              Choose a strong password to protect your root platform account.
            </CardDescription>
          </CardHeader>

          {isSuccess ? (
            <CardContent className="space-y-4 pt-2">
              <div className="rounded-xl bg-emerald-950/60 p-4 text-xs text-emerald-200 border border-emerald-800/80 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-emerald-100">Password Updated Successfully</div>
                  <div>
                    Your platform credentials have been securely updated. All previous active sessions have been invalidated as a security precaution.
                  </div>
                </div>
              </div>

              <Button
                asChild
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs py-2.5 h-11 shadow-lg shadow-indigo-600/30 min-h-[44px]"
              >
                <Link href="/platform/login" className="flex items-center justify-center gap-2">
                  <span>Sign In with New Password</span>
                  <ArrowRight className="h-4 w-4" />
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
                  <Label htmlFor="new-password" className="text-xs text-slate-300">New Password</Label>
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                    placeholder="••••••••••••"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-xs text-slate-300">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                    placeholder="••••••••••••"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                {/* Password strength criteria */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5">
                  <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider">
                    Password Requirements:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {passwordRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 ${
                          rule.met ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {rule.met ? (
                          <Check className="h-3 w-3 shrink-0" />
                        ) : (
                          <X className="h-3 w-3 shrink-0" />
                        )}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !isPasswordValid}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs py-2.5 h-11 shadow-lg shadow-indigo-600/30 min-h-[44px]"
                >
                  {isLoading ? 'Updating Password...' : 'Reset Password'}
                </Button>
              </CardContent>

              <CardFooter className="pt-2 pb-5 text-center text-xs text-slate-500 border-t border-slate-800/60 justify-center">
                <Link href="/platform/login" className="text-indigo-400 hover:underline font-semibold min-h-[36px] flex items-center">
                  Cancel and Return to Sign In
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}

export default function PlatformResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading reset console...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
