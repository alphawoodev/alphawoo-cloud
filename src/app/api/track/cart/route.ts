import { createClient } from "@supabase/supabase-js"; // DIRECT IMPORT
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Initialize ADMIN Client (Bypasses RLS/Auth checks)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const body = await req.json();

    const { 
      organization_id, 
      email, 
      cart_key, 
      cart_total, 
      currency, 
      checkout_url, 
      items 
    } = body;

    // 2. "No Email No Lead" Guard
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: true, ignored: true }, { status: 202 });
    }

    // 3. Call the Smart RPC using Admin Client
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabaseAdmin as any).rpc("ingest_cart_v3", {
      p_organization_id: organization_id,
      p_email: email,
      p_cart_key: cart_key,
      p_currency: currency,
      p_amount: cart_total,
      p_items: items,
      p_checkout_url: checkout_url
    });

    if (error) {
      console.error("RPC Error:", error);
      // Log the actual error to Vercel logs so we can see it if it fails again
      return NextResponse.json({ ok: true, error: error.message }, { status: 202 });
    }

    return NextResponse.json({ ok: true, status: "captured" }, { status: 200 });

  } catch (err: any) {
    console.error("Fatal Error:", err);
    return NextResponse.json({ ok: true, error: err.message }, { status: 202 });
  }
}
