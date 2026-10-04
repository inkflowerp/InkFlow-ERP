import React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function FloorConsumptionNotFound() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center my-6 max-w-xl mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border shadow-xs">
        <AlertCircle className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Floor Consumption Record Not Found</h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
          The requested floor consumption entry, roll batch, or machine assignment could not be found.
        </p>
      </div>

      <div className="pt-2">
        <Link href="../production">
          <Button variant="outline" className="gap-2 border-border text-foreground hover:bg-muted font-semibold min-h-11">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Production</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
