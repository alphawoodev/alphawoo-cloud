import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface LayoutProps {
    children: ReactNode
    params: { storeId: string } | Promise<{ storeId: string }>
}

export default async function StoreLayout({ children, params }: LayoutProps) {
    // Debug Log: Check Vercel logs to see what we received
    const resolvedParams = await Promise.resolve(params)
    console.log('StoreLayout Params:', resolvedParams)

    const storeId = resolvedParams?.storeId

    if (!storeId) {
        return (
            <div className="p-10 font-mono text-red-600">
                <h1 className="text-xl font-bold">Location Error</h1>
                <p>This file is running, but cannot find the Store ID.</p>
                <p>
                    Ensure this file is located at: <code>app/dashboard/[storeId]/layout.tsx</code>
                </p>
                <p>Current Params received: {JSON.stringify(resolvedParams)}</p>
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
