import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Get User
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect("/auth/login");

  // 2. Get Organization & Subscription Status
  const { data: org } = (await supabase
    .from("organizations")
    // @ts-ignore: columns exist in runtime schema; local types are stale
    .select("id, name, subscription_status, stripe_customer_id, owner_user_id")
    .eq("owner_user_id", user.id)
    .single()) as { data: any };

  // Safety fallback if no org found (shouldn't happen in valid flow)
  if (!org) return <div>Organization not found.</div>;

  const isActive = org.subscription_status === "active";

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Dashboard
        </h1>
        <div className="text-sm text-zinc-500 font-mono">
          ORG_ID: {org.id.split('-')[0]}...
        </div>
      </div>

      {/* --- THE CONTROL CENTER CARD --- */}
      <Card className={`border ${isActive ? "border-emerald-500/50 bg-emerald-500/5" : "border-amber-500/50 bg-amber-500/5"}`}>
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Left: Status Indicator */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Protocol Status
              </h2>
              {isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 font-mono">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  ACTIVE_MODE
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-mono">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  PASSIVE_MODE
                </span>
              )}
            </div>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-xl">
              {isActive 
                ? "Server-side recovery is engaged. Revenue capture is automated." 
                : "Your store is observing revenue leakage but not capturing it. Initialize $Recovery to secure these funds."}
            </p>
          </div>

          {/* Right: The Trigger */}
          {!isActive && (
            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
              <SubscribeButton 
                priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID!} 
                organizationId={org.id} 
              />
              <p className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">
                $49.00/mo • Cancel Anytime
              </p>
            </div>
          )}
          
          {isActive && (
             <div className="text-right">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    Protection Active
                </p>
                <p className="text-xs text-zinc-500">
                    Next billing cycle: Auto-renew
                </p>
             </div>
          )}

        </CardContent>
      </Card>

      {/* Placeholder for Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-32 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
          Leakage Metric Chart
        </div>
        <div className="h-32 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
          Recovery Rate
        </div>
        <div className="h-32 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-400">
          Recent Events
        </div>
      </div>

    </div>
  );
}
