'use client'

import { use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCopy, Key, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

interface ConfirmPageProps {
  searchParams: Promise<{
    storeId?: string
    domain?: string
    apiKey?: string
  }>
}

export default function ConfirmPage({ searchParams }: ConfirmPageProps) {
  const router = useRouter()
  const { storeId, domain, apiKey } = use(searchParams)

  const handleCopy = useCallback(async (value?: string) => {
    if (!value) {
      return
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value)
      }
    } catch (error) {
      console.error('Clipboard copy failed', error)
    }
  }, [])

  const safeDomain = domain ?? ''

  if (!storeId || !apiKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Credentials Missing</CardTitle>
            <CardDescription>
              We could not find generated credentials for this store. Please restart the connection
              flow.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/app/stores')}>Back to Stores</Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-2xl border-indigo-200 shadow-xl dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-center space-x-3 text-emerald-600 dark:text-indigo-400">
            <Zap className="h-6 w-6" />
            <CardTitle>Connection Successful</CardTitle>
          </div>
          <CardDescription className="mt-2">
            Your store <strong>{safeDomain}</strong> is now secured. Paste the credentials below into
            the AlphaWoo Connector plugin to complete the Reverse Handshake.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-sm font-semibold text-rose-500">
            Action Required: Copy both values. The secret key will not be shown again.
          </p>
          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="storeId" className="flex items-center text-base font-medium">
              <Key className="mr-2 h-4 w-4 text-indigo-500" />
              AlphaWoo Store ID
            </Label>
            <div className="flex gap-2">
              <Input
                id="storeId"
                value={storeId}
                readOnly
                className="font-mono text-xs"
                aria-readonly
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(storeId)}
                title="Copy Store ID"
              >
                <ClipboardCopy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="apiKey" className="flex items-center text-base font-medium">
              <Key className="mr-2 h-4 w-4 text-indigo-500" />
              HMAC Secret Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                value={apiKey}
                readOnly
                className="font-mono text-xs"
                aria-readonly
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(apiKey)}
                title="Copy Secret Key"
              >
                <ClipboardCopy className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Store this in WordPress immediately; it will not be displayed again.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={() => router.push('/app/stores')} className="bg-emerald-600 hover:bg-emerald-700">
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
