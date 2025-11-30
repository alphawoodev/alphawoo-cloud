import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Zap, AlertTriangle } from 'lucide-react'
import { storeConnectAction } from './actions'
import { Separator } from '@/components/ui/separator'

type SearchParams = { error?: string }

const errorMessages: Record<string, string> = {
  domain_exists: 'This WooCommerce domain is already connected to your account.',
  missing_domain: 'Please enter a domain before submitting the form.',
  store_create_failed: 'Something went wrong while creating the store. Try again.',
}

export default async function StoreSetupPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const resolved = await searchParams
  const activeError = resolved?.error ? errorMessages[resolved.error] ?? 'Unable to connect store.' : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Card className="w-full max-w-lg border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <div className="mx-auto h-8 w-8 text-indigo-600 dark:text-emerald-500">
            <Zap className="h-full w-full" />
          </div>
          <CardTitle className="text-center text-2xl font-bold text-zinc-900 dark:text-white">
            Connect Your Store
          </CardTitle>
          <CardDescription className="text-center text-zinc-600 dark:text-zinc-400">
            Final step: Complete the secure &quot;Reverse Handshake.&quot;
          </CardDescription>
        </CardHeader>

        <form action={storeConnectAction}>
          <CardContent className="grid gap-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Add your WooCommerce domain. AlphaWoo will generate the Store ID and secret key for
              you to paste into the WordPress plugin on the next screen.
            </p>
            <Separator className="bg-zinc-200 dark:bg-zinc-800" />

            <div className="grid gap-2">
              <Label htmlFor="domain">WooCommerce Domain</Label>
              <Input
                id="domain"
                name="domain"
                type="text"
                placeholder="https://mystore.com"
                required
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Used for display context and verification only.
              </p>
            </div>
          </CardContent>
          {activeError && (
            <div className="mx-6 mb-4 flex items-start space-x-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <span>{activeError}</span>
            </div>
          )}
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              Securely Connect AlphaWoo
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
