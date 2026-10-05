'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Shield, Mail, ArrowLeft, CheckCircle2, Server, KeyRound, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { forgotPasswordAction } from '@/actions/auth.actions'
import { useI18n } from '@/lib/i18n'

export default function PlatformForgotPasswordPage() {
  const { tBilingual } = useI18n()
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
 await forgotPasswordAction(email)
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
 Reset Password
 </h1>
 <p className="text-xs text-muted-foreground">Platform administrator security recovery.</p>
 </div>

 <Card className="bg-card border-border shadow-xs backdrop-blur-xl text-foreground">
 <CardHeader className="pb-4">
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <KeyRound className="h-4 w-4 text-primary" />
 <span>Forgot Password</span>
 </CardTitle>
 <CardDescription className="text-muted-foreground text-xs">
 Enter your registered Platform Email to request a secure password reset link.
 </CardDescription>
 </CardHeader>

 {isSubmitted ? (
 <CardContent className="space-y-4 pt-2">
 <div className="rounded-xl bg-success-surface p-4 text-xs text-success border border-success/30 flex items-start gap-3">
 <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
 <div className="space-y-1">
 <div className="font-bold text-success">Password Reset Requested</div>
 <div>
 If an eligible account exists, a password reset email will be sent with further instructions.
 </div>
 </div>
 </div>
 <Button asChild variant="outline" className="w-full text-xs font-semibold border-border hover:bg-muted min-h-11">
 <Link href="/platform/login" className="flex items-center justify-center gap-2">
 <ArrowLeft className="h-4 w-4" />
 <span>{tBilingual('Back to Login', 'লগইনে ফিরে যান')}</span>
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
 <Label htmlFor="platform-email" className="text-xs text-muted-foreground">{tBilingual('Email', 'ইমেইল')}</Label>
 <Input
 id="platform-email"
 type="email"
 required
 autoComplete="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 icon={<Mail className="h-4 w-4 text-muted-foreground" />}
 placeholder="admin@printflow.bd"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
 />
 </div>

 <div className="p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground">
 {tBilingual('Reset link expires after 15 minutes for your safety.', 'নিরাপত্তার জন্য রিসেট লিংক ১৫ মিনিট পর বাতিল হয়ে যাবে।')}
 </div>

 <Button
 type="submit"
 disabled={isLoading}
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs py-2.5 h-11 shadow-xs min-h-11"
 >
 {isLoading ? tBilingual('Sending...', 'পাঠানো হচ্ছে...') : tBilingual('Send Link', 'লিংক পাঠান')}
 </Button>
 </CardContent>

 <CardFooter className="pt-2 pb-5 text-center text-xs text-muted-foreground border-t border-border justify-center">
 <Link href="/platform/login" className="flex items-center gap-1.5 text-primary hover:underline font-semibold min-h-9">
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
