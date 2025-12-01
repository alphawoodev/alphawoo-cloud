import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
            <div className="p-8">Store not found</div>
        )
    }

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <SetPasswordBanner />
            <header className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    {store.shadow_mode ? 'Revenue Leakage Detector' : 'AlphaWoo Dashboard'}
                </h1>
                <p className="text-zinc-500">
                    Store ID: <code className="text-xs bg-zinc-100 p-1 rounded">{params.storeId}</code>
                </p>
            </header>

            {store.shadow_mode ? (
                <ShadowView storeId={params.storeId} currencyCode={store.currency_code} />
            ) : (
                <div>Active Mode (Coming Soon)</div>
            )}
        </div>
    )
}
