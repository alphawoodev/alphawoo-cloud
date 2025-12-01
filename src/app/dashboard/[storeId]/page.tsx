import { createClient } from '@/lib/supabase/server'
// import { redirect } from "next/navigation"; // <--- COMMENTED OUT

interface PageProps {
    params: { storeId: string }
}

export default async function DashboardPage({ params }: PageProps) {
    const storeId = params.storeId
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
    if (error || !store) {
        console.error('Access Denied Error:', error)

        // STOP THE REDIRECT LOOP. SHOW THE ERROR.
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
                                {JSON.stringify(error, null, 2) || 'No SQL Error (Store check returned null)'}
                            </pre>
                        </div>

                        <div className="pt-4 border-t mt-4">
                            <p className="text-zinc-600">Possible Causes:</p>
                            <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-500">
                                <li>Row Level Security (RLS) is still blocking you.</li>
                                <li>The Organization Owner ID in the DB doesn&apos;t match your User ID.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    // --- END DEBUGGING BLOCK ---

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
                </div>
            </div>
        </div>
    )
}
