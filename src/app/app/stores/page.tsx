import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Plus, Store, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function StoresPage() {
  const supabase = await createClient();
  // Note: We use getUser() here, which is safer than getSession() in a Server Component
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch Organization & Stores
  const { data: organization } = await supabase
    .from('organizations')
    .select('id, stores (*)')
    .eq('owner_id', user.id)
    .single();

  const stores = (organization?.stores || []).filter((store: any) => !store.deleted_at);

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Stores</h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Manage your connected WooCommerce instances.
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
          <Link href="/app/stores/setup">
            <Plus className="mr-2 h-4 w-4" /> Connect Store
          </Link>
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card className="border-dashed border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-indigo-100 p-3 mb-4 dark:bg-indigo-900/20">
              <Store className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No stores connected</h3>
            <p className="text-sm text-zinc-500 max-w-sm mb-6">
              Start by connecting your first store.
            </p>
            <Button asChild variant="outline">
              <Link href="/app/stores/setup">Connect First Store</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store: any) => (
            /* FIX: Ensure Link wrapper is present */
            <Link key={store.id} href={`/app/stores/${store.id}`} className="block h-full transition-opacity hover:opacity-90">
              <Card className="hover:border-indigo-500 transition-colors h-full cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium truncate pr-4" title={store.woocommerce_domain}>
                      {store.woocommerce_domain}
                    </CardTitle>
                    <Zap className={`h-4 w-4 flex-shrink-0 ${store.shadow_mode ? 'text-amber-500' : 'text-emerald-500'}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{store.shadow_mode ? 'Shadow Mode' : 'Active'}</div>
                    <p className="text-xs text-zinc-500 mt-1 font-mono">ID: {store.id.substring(0, 8)}...</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
