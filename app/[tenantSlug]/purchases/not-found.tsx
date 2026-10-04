import React from 'react'
import Link from 'next/link'
import { Truck, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PurchasesNotFound() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center my-6 max-w-xl mx-auto space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground border border-border shadow-xs">
        <Truck className="h-7 w-7" />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Purchase Order Not Found</h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed">
          The requested purchase order record, challan, or vendor procurement log does not exist or may have been deleted.
        </p>
      </div>

      <div className="pt-2">
        <Link href="./inventory?view=purchases">
          <Button variant="outline" className="gap-2 border-border text-foreground hover:bg-muted font-semibold min-h-11">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Purchase Orders</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
