import { LoadingState } from '@/components/shared/loading-state'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted dark:bg-background">
      <LoadingState text="Loading PrintERP..." />
    </div>
  )
}
