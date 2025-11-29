import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, Store, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function StoresPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, stores (*)')
    .eq('owner_id', user.id)
    .single()

  const stores = organization?.stores ?? []

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Stores</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Manage your connected WooCommerce instances.</p>
        </div>
        <Button asChild className="bg-indigo-600 text-white hover:bg-indigo-700">
          <Link href="/app/stores/setup">
            <Plus className="mr-2 h-4 w-4" /> Connect Store
          </Link>
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card className="border-2 border-dashed border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-indigo-100 p-3 dark:bg-indigo-900/20">
              <Store className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">No stores connected</h3>
            <p className="mb-6 max-w-sm text-sm text-zinc-500">
              You haven&apos;t connected any WooCommerce stores to AlphaWoo yet. Set up the connector to start rescuing
              revenue.
            </p>
            <Button
              asChild
              variant="outline"
              className="border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/20"
            >
              <Link href="/app/stores/setup">Connect First Store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: any) => (
            <Card key={store.id} className="cursor-pointer transition-colors hover:border-indigo-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{store.woocommerce_domain}</CardTitle>
                <Zap className={`h-4 w-4 ${store.shadow_mode ? 'text-amber-500' : 'text-emerald-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{store.shadow_mode ? 'Shadow Mode' : 'Active'}</div>
                <p className="mt-1 text-xs text-zinc-500">
                  ID: <span className="font-mono">{store.id.substring(0, 8)}...</span>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
