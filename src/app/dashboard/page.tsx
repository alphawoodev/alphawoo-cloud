import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardRootPage() {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect("/login");

    // 2. Get the User's Organization
    // (Agency First: We assume one org per user for now, or fetch the primary)
    const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("owner_user_id", user.id) //
        .single();

    if (!org) {
        // Edge Case: User logged in but has no Organization. 
        // Redirect to provisioning or show error.
        return (
            <div className="p-8 font-sans">
                <h1 className="text-xl font-bold text-red-600">Account Configuration Error</h1>
                <p className="text-zinc-600">No Organization found for this user.</p>
            </div>
        );
    }

    // 3. Fetch Stores for this Org
    const { data: stores } = await supabase
        .from("stores")
        .select("id, name, url, currency_code") //
        .eq("organization_id", org.id);

    const storeList = stores || [];

    // --- LOGIC BRANCHING ---

    // SCENARIO B: Solo Founder (1 Store) -> Auto-Redirect
    if (storeList.length === 1) {
        redirect(`/dashboard/${storeList[0].id}`);
    }

    // SCENARIO A & C: Agency (Many Stores) or New User (0 Stores) -> Render UI
    return (
        <div className="min-h-screen bg-zinc-50 p-8 font-sans">
            <div className="mx-auto max-w-4xl">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        Select Store
                    </h1>
                    <p className="text-zinc-500">
                        Organization ID: <span className="font-mono text-xs">{org.id}</span>
                    </p>
                </header>

                {storeList.length === 0 ? (
                    // Empty State
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center">
                        <h3 className="mt-2 text-sm font-semibold text-zinc-900">No stores connected</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                            Install the AlphaWoo Connector plugin on your WordPress site to begin.
                        </p>
                        <div className="mt-6">
                            <Link
                                href="/onboarding"
                                className="inline-flex items-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-zinc-700"
                            >
                                Connect a Store
                            </Link>
                        </div>
                    </div>
                ) : (
                    // List State (Agency View)
                    <ul role="list" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {storeList.map((store) => (
                            <li key={store.id} className="col-span-1 divide-y divide-zinc-200 rounded-lg bg-white shadow transition hover:shadow-md">
                                <Link href={`/dashboard/${store.id}`} className="block h-full">
                                    <div className="flex w-full items-center justify-between space-x-6 p-6">
                                        <div className="flex-1 truncate">
                                            <div className="flex items-center space-x-3">
                                                <h3 className="truncate text-sm font-medium text-zinc-900">
                                                    {store.name}
                                                </h3>
                                                <span className="inline-block flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                                    Active
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-sm text-zinc-500">
                                                {store.url}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-zinc-50 px-6 py-3">
                                        <span className="text-xs font-medium text-zinc-500">
                                            Currency: {store.currency_code}
                                        </span>
                                        <span className="text-xs font-medium text-indigo-600 hover:text-indigo-500">
                                            Enter Dashboard &rarr;
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
