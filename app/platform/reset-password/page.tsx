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
import { useI18n } from '@/lib/i18n'

function ResetPasswordForm() {
  const { tBilingual } = useI18n()
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
 { label: tBilingual('At least 8 characters', 'কমপক্ষে ৮টি অক্ষর'), met: password.length >= 8 },
 { label: tBilingual('Contains a number', 'একটি সংখ্যা থাকতে হবে'), met: /\d/.test(password) },
 { label: tBilingual('Contains uppercase letter', 'বড় হাতের অক্ষর থাকতে হবে'), met: /[A-Z]/.test(password) },
 { label: tBilingual('Passwords match', 'পাসওয়ার্ড দুটি মিল থাকতে হবে'), met: password.length > 0 && password === confirmPassword },
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
 } catch (err: unknown) {
  const msg = err instanceof Error ? err.message : 'Unable to connect. Check your connection and try again.'
  setError(msg)
 } finally {
  setIsLoading(false)
 }
 }

 return (
 <div className="min-h-screen bg-card text-foreground flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-primary selection:text-primary-foreground">
 <div className="w-full max-w-md relative z-10 space-y-6">
 <div className="text-center space-y-2">
 <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-card text-foreground shadow-xs border border-border mb-2">
 <Server className="h-6 w-6" />
 </div>
 <div className="flex items-center justify-center gap-2">
 <span className="tabular-nums text-xs uppercase tracking-widest text-primary font-bold">
 PrintFlow Platform
 </span>
 </div>
 <h1 className="text-2xl font-black tracking-tight text-foreground">
 Set New Password
 </h1>
 <p className="text-xs text-muted-foreground">Secure your Platform Owner credentials.</p>
 </div>

 <Card className="bg-card border-border shadow-xs backdrop-blur-xl text-foreground">
 <CardHeader className="pb-4">
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <Shield className="h-4 w-4 text-primary" />
 <span>Update Credentials</span>
 </CardTitle>
 <CardDescription className="text-muted-foreground text-xs">
 Choose a strong password to protect your root platform account.
 </CardDescription>
 </CardHeader>

 {isSuccess ? (
 <CardContent className="space-y-4 pt-2">
 <div className="rounded-xl bg-success-surface p-4 text-xs text-success border border-success/30 flex items-start gap-3">
 <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
 <div className="space-y-1">
 <div className="font-bold text-success">Password Updated Successfully</div>
 <div>
 Your platform credentials have been securely updated. All previous active sessions have been invalidated as a security precaution.
 </div>
 </div>
 </div>

 <Button
 asChild
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2.5 h-11 shadow-xs min-h-11"
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
 <div className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive border border-destructive/30 flex items-start gap-2.5">
 <Shield className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
 <span>{error}</span>
 </div>
 )}

 <div className="space-y-1.5">
 <Label htmlFor="new-password" className="text-xs text-muted-foreground">New Password</Label>
 <Input
 id="new-password"
 type={showPassword ? 'text' : 'password'}
 required
 autoComplete="new-password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 icon={<Lock className="h-4 w-4 text-muted-foreground" />}
 placeholder="••••••••••••"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
 rightElement={
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="p-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
 aria-label={showPassword ? 'Hide password' : 'Show password'}
 >
 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 }
 />
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm New Password</Label>
 <Input
 id="confirm-password"
 type={showConfirmPassword ? 'text' : 'password'}
 required
 autoComplete="new-password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 icon={<Lock className="h-4 w-4 text-muted-foreground" />}
 placeholder="••••••••••••"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
 rightElement={
 <button
 type="button"
 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
 className="p-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
 aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
 >
 {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 }
 />
 </div>

 {/* Password strength criteria */}
 <div className="p-3 rounded-xl bg-card border border-border text-xs space-y-1.5">
 <div className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
 Password Requirements:
 </div>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
 {passwordRules.map((rule, idx) => (
 <div
 key={idx}
 className={`flex items-center gap-1.5 ${
 rule.met ? 'text-success' : 'text-muted-foreground'
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
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2.5 h-11 shadow-xs min-h-11"
 >
 {isLoading ? 'Updating Password...' : 'Reset Password'}
 </Button>
 </CardContent>

 <CardFooter className="pt-2 pb-5 text-center text-xs text-muted-foreground border-t border-border justify-center">
 <Link href="/platform/login" className="text-primary hover:underline font-semibold min-h-9 flex items-center">
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
 <Suspense fallback={<div className="min-h-screen bg-card flex items-center justify-center text-muted-foreground">Loading reset console...</div>}>
 <ResetPasswordForm />
 </Suspense>
 )
}
