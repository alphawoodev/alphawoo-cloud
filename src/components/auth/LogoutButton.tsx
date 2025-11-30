'use client'

import { useFormStatus } from 'react-dom'
import { LogOut, Loader2 } from 'lucide-react'

import { signOutAction } from '@/app/auth/actions'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const { pending } = useFormStatus()

  return (
    <form action={signOutAction}>
      <Button
        type="submit"
        variant="ghost"
        className="text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        disabled={pending}
      >
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
        Sign Out
      </Button>
    </form>
  )
}
