import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface LayoutProps {
    children: ReactNode
    params: { storeId: string } | Promise<{ storeId: string }>
}

export default async function StoreLayout({ children, params }: LayoutProps) {
    // Capture the ID directly from the URL params
    const resolvedParams = await Promise.resolve(params)
    const storeId = resolvedParams?.storeId

    if (!storeId) {
        return (
            <div className="flex h-screen items-center justify-center bg-red-50 text-red-700">
                <div className="rounded-lg border border-red-200 bg-white p-8 shadow-lg">
                    <h1 className="text-xl font-bold">Deployment Check Failed</h1>
                    <p className="mt-2">The application could not read the Store ID from the URL.</p>
                    <p className="mt-4 text-xs font-mono bg-zinc-100 p-2">
                        URL Params Received: {JSON.stringify(params)}
                    </p>
                </div>
            </div>
        )
    }

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return redirect('/login')
    }

    // Verify ownership against organizations (agency-aware)
    const { data: store, error } = await supabase
        .from('stores')
        .select('id, organization_id, organizations!inner(owner_user_id)')
        .eq('id', storeId)
        .eq('organizations.owner_user_id', user.id)
        .single()

    if (error || !store) {
        return redirect('/dashboard')
    }

    return (
        <div className="flex min-h-screen flex-col bg-zinc-50">
            <main className="flex-1">{children}</main>
        </div>
    )
}
