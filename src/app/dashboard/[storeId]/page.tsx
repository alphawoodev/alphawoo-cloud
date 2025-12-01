import { createClient } from '@/lib/supabase/server'
// import { redirect } from "next/navigation"; // intentionally not redirecting to show debug info

// FIX: In Next.js 16, params is a Promise
interface PageProps {
    params: Promise<{ storeId: string }>
}

export default async function DashboardPage({ params }: PageProps) {
    // FIX: You MUST await the params in Next.js 16
    const resolvedParams = await params
    const storeId = resolvedParams.storeId

    const supabase = await createClient()

    // 1. Auth Check
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return <div className="p-10 text-red-500">Error: Not Logged In</div>
    }

    // 2. Database Query
    const { data: store, error } = await supabase
        .from('stores')
        .select('id, organization_id, organizations!inner(owner_user_id)')
        .eq('id', storeId)
        .eq('organizations.owner_user_id', user.id)
        .single()

    // --- DEBUGGING BLOCK ---
    // If this hits, at least 'Target Store ID' will now be visible (not blank)
    if (error || !store) {
        console.error('Access Denied Error:', error)

        return (
            <div className="p-10 font-mono text-sm bg-zinc-50 min-h-screen">
                <div className="max-w-2xl mx-auto border-2 border-red-500 bg-white p-8 rounded-lg shadow-xl">
                    <h1 className="text-xl font-bold text-red-600 mb-4">🚫 ACCESS DENIED (Debug Mode)</h1>

                    <div className="space-y-4">
                        <div>
                            <strong className="block text-zinc-500">Target Store ID:</strong>
                            <div className="bg-zinc-100 p-2 rounded">{storeId}</div>
                        </div>

                        <div>
                            <strong className="block text-zinc-500">Your User ID:</strong>
                            <div className="bg-zinc-100 p-2 rounded">{user.id}</div>
                        </div>

                        <div>
                            <strong className="block text-zinc-500">Database Error:</strong>
                            <pre className="bg-red-50 p-2 rounded text-red-700 whitespace-pre-wrap">
                                {JSON.stringify(error, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    // --- END DEBUGGING BLOCK ---

    // 3. SUCCESS: Render the Dashboard
    return (
        <div className="p-8">
            <header className="mb-8 border-b border-zinc-200 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Store Dashboard</h1>
                <p className="mt-2 text-sm font-mono text-zinc-500">ID: {store.id}</p>
            </header>
            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-medium text-zinc-500">Revenue Leaked</h3>
                    <div className="mt-2 text-3xl font-bold text-zinc-900">$0.00</div>
                    <span className="inline-flex mt-4 items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Monitoring Active
                    </span>
                </div>
            </div>
        </div>
    )
}
