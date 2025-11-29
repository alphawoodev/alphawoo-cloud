import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Zap } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link href="/app/stores" className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-indigo-600 dark:text-emerald-500" />
              <span className="hidden font-bold text-zinc-900 dark:text-zinc-50 sm:inline-block">AlphaWoo</span>
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="text-sm text-zinc-500">{user.email}</div>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
