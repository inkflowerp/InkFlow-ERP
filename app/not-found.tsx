import Link from 'next/link'
import { FileQuestion, ArrowLeft, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-muted dark:bg-background">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 bg-primary/10 text-primary mb-4 shadow-xs">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-black text-foreground dark:text-white">Page Not Found</h1>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground dark:text-muted-foreground">
        The page or order you are looking for does not exist, has been moved, or you may need to access your tenant workspace.
      </p>
      <p className="mt-1 text-xs text-muted-foreground bangla-text">
        অনুরোধকৃত পেজ বা অর্ডারটি পাওয়া যায়নি অথবা স্থানান্তরিত হয়েছে।
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            <span>Homepage</span>
          </Button>
        </Link>
      </div>
    </div>
  )
}
