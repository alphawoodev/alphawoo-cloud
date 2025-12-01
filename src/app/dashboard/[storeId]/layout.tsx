import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

interface LayoutProps {
    children: ReactNode
    params: { storeId: string } | Promise<{ storeId: string }>
}

export default async function StoreLayout({ children, params }: LayoutProps) {
    // Support both plain and promised params (Next.js typing variants)
    const resolvedParams = await Promise.resolve(params)
    const storeId = resolvedParams?.storeId

    if (!storeId) {
        return (
            <div className="p-8 text-red-600">
                Critical Error: Store ID could not be read from URL.
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
