import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ShadowView from '@/components/dashboard/shadow-view'
import ActiveView from '@/components/dashboard/active-view'

type DashboardPageProps = {
    params: { storeId: string }
}

export default async function DashboardPage({ params }: DashboardPageProps) {
    const supabase = await createClient()

    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=/dashboard/${params.storeId}`)
    }

    const { data: storeLink } = await supabase
        .from('store_users' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('store_id', params.storeId)
        .single()

    if (!storeLink) {
        return (
            <div className="p-8 text-center text-zinc-600">
                Unauthorized Access to this Store
            </div>
        )
    }

    const { data: store } = await supabase
        .from('stores')
        .select('shadow_mode, currency_code')
        .eq('id', params.storeId)
        .single()

    if (!store) {
        return (
            <div className="p-8 text-center text-zinc-600">
                Store not found
            </div>
        )
    }

    if (store.shadow_mode) {
        return (
            <div className="p-8 max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Revenue Leakage Detector
                    </h1>
                    <p className="text-zinc-500">
                        Monitoring store activity in background mode.
                    </p>
                </header>
                <ShadowView storeId={params.storeId} currencyCode={store.currency_code} />
            </div>
        )
    }

    return <ActiveView storeId={params.storeId} />
}
