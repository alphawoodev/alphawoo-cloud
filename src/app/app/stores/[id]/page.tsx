import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Key } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ShadowModeToggle } from './components/ShadowModeToggle'
import StoreMetrics from './components/StoreMetrics'

interface StorePageProps {
  params: Promise<{ id: string }>
}

export default async function StoreDetailsPage({ params }: StorePageProps) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: store, error } = await supabase
    .from('stores')
    .select('*, organizations!inner(owner_id)')
    .eq('id', id)
    .eq('organizations.owner_id', user.id)
    .single()

  if (error || !store) {
    return <div className="p-8 text-center text-zinc-500">Store not found or access denied.</div>
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent hover:text-indigo-600">
          <Link href="/app/stores">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Stores
          </Link>
        </Button>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{store.woocommerce_domain}</h1>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-mono text-zinc-500 dark:bg-zinc-800">
            {store.shadow_mode ? 'Shadow Mode' : 'Active'}
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        <StoreMetrics storeId={store.id} />
        <ShadowModeToggle initialShadowMode={store.shadow_mode} storeId={store.id} />

        <Card className="border-indigo-200 bg-indigo-50/10 dark:border-indigo-900 dark:bg-indigo-950/10">
          <CardHeader>
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400">
              <Key className="h-5 w-5" />
              <CardTitle>Connection Credentials</CardTitle>
            </div>
            <CardDescription>Copy these into your WordPress Admin &gt; AlphaWoo settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase text-zinc-500">Store ID</Label>
              <Input readOnly value={store.id} className="bg-white font-mono dark:bg-zinc-950" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-bold uppercase text-zinc-500">API Key (Secret)</Label>
              <Input readOnly value={store.api_key} className="bg-white font-mono dark:bg-zinc-950" type="text" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
