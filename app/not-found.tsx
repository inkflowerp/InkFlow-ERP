import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

import fs from 'fs'

export default function NotFound() {
  try { fs.appendFileSync('debug.log', '[NOT FOUND RENDER]\n') } catch (e) {}
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-slate-50 dark:bg-slate-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 mb-4 shadow-sm">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-black text-slate-900 dark:text-white">Page Not Found</h1>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        The page or print order you are looking for does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
