'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

import { deleteStoreAction } from '../actions'

interface DeleteStoreButtonProps {
  storeId: string
}

export function DeleteStoreButton({ storeId }: DeleteStoreButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await deleteStoreAction(storeId)
      if (result?.success) {
        router.push('/app/stores')
        router.refresh()
        return
      }
      setError(result?.error || 'Failed to delete store.')
    } catch (error) {
      const digest = typeof (error as any)?.digest === 'string' ? (error as any).digest : null
      if (digest?.includes('NEXT_REDIRECT')) {
        throw error
      }
      setError('Deletion failed. Check permissions.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2 border-rose-600 text-rose-600 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/10">
          <Trash2 className="h-4 w-4" />
          <span>Delete Store</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-6 w-6" />
            <span>Confirm Permanent Deletion</span>
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. All customer data, historical revenue metrics, and settings for this store will
            be permanently removed from AlphaWoo Cloud.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          Store ID:{' '}
          <code className="rounded bg-zinc-100 p-1 text-xs font-mono dark:bg-zinc-800">{storeId}</code>
        </div>
        {error && <p className="mt-2 text-sm text-rose-500">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-rose-600 hover:bg-rose-700">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'I understand, delete store'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
