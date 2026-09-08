import { LoadingState } from '@/components/shared/loading-state'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <LoadingState text="Loading PrintERP..." />
    </div>
  )
}
