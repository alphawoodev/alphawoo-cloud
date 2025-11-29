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
import { Zap } from 'lucide-react'
import { storeConnectAction } from './actions'
import { Separator } from '@/components/ui/separator'

export default function StoreSetupPage() {
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
              The connector plugin needs its credentials. Generate the unique API Key and Secret
              from your WooCommerce account and paste them below.
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
                This is used for display purposes only.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="apiKey">AlphaWoo Connector API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="text"
                placeholder="Paste the key from your WooCommerce installation here"
                required
                className="font-mono"
              />
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                This key is used by the plugin to securely sign payloads (HMAC).
              </p>
            </div>
          </CardContent>
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
