import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShadowView from '@/components/dashboard/shadow-view'
import SetPasswordBanner from '@/components/dashboard/set-password-banner'

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
        return <div className="p-8">Unauthorized Access</div>
    }

    const { data: store } = await supabase
        .from('stores')
        .select('shadow_mode, currency_code')
        .eq('id', params.storeId)
        .single()

    if (!store) {
        return <div className="p-8">Store not found</div>
    }

    const { data: metrics } = await supabase
        .from('reporting_metrics' as any)
        .select('shadow_revenue_total_cents')
        .eq('store_id', params.storeId)
        .order('reporting_week', { ascending: false })
        .limit(1)
        .single()

    const { data: recentCarts } = await supabase
        .from('carts' as any)
        .select('created_at, total_amount_cents, currency')
        .eq('store_id', params.storeId)
        .order('created_at', { ascending: false })
        .limit(5)

    const totalLost = (metrics as any)?.shadow_revenue_total_cents || 0

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <SetPasswordBanner />

            <div className="p-8 max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {store.shadow_mode ? 'Revenue Leakage Detector' : 'AlphaWoo Dashboard'}
                    </h1>
                    <p className="text-zinc-500">
                        Store ID:{' '}
                        <code className="text-xs bg-zinc-200 dark:bg-zinc-800 p-1 rounded font-mono">
                            {params.storeId}
                        </code>
                    </p>
                </header>

                {store.shadow_mode ? (
                    <ShadowView
                        storeId={params.storeId}
                        currencyCode={store.currency_code}
                        totalLostCents={totalLost}
                        ghostCarts={(recentCarts as any[]) || []}
                    />
                ) : (
                    <div className="p-12 border rounded bg-white text-center text-zinc-500">
                        Active Mode Dashboard (Coming Soon in Phase 1)
                    </div>
                )}
            </div>
        </div>
    )
}
