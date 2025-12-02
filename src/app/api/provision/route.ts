import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const site_url = (body.site_url || "").trim();

    if (!email || !site_url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // 1. IDENTITY CHECK (RPC)
    // "Does this user exist?"
    const { data: existingUserId, error: rpcError } = await supabaseAdmin
      .rpc('get_user_id_by_email', { email_input: email });

    if (rpcError) throw rpcError;

    let targetUserId = existingUserId;
    let isNewUser = false;

    if (targetUserId) {
      console.log(`✅ User Recognized: ${targetUserId}`);
      isNewUser = false; // <--- THIS PREVENTS THE EMAIL
    } else {
      console.log(`👤 User New. Creating account...`);
      isNewUser = true;
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { source: "plugin_provision" }
      });

      if (createError) throw createError;
      targetUserId = newUser.user.id;
    }

    // 2. STORE CHECK
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_user_id")
      .eq("url", site_url)
      .single();

    let orgId;

    if (existingOrg) {
      orgId = existingOrg.id;
      // Transfer logic (if connecting with different email)
      if (existingOrg.owner_user_id !== targetUserId) {
          console.log("🔄 Transferring Ownership...");
          await supabaseAdmin
            .from("organizations")
            .update({ owner_user_id: targetUserId })
            .eq("id", orgId);
      }
    } else {
      // Create New Store
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          owner_user_id: targetUserId,
          name: body.site_name || "New Store",
          url: site_url, 
          subscription_status: 'inactive'
        })
        .select()
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    // 3. EMAIL LOGIC (The Guard Rail)
    if (isNewUser) {
        // Only sends if we actually created the user in Step 1
        await supabaseAdmin.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
        });
    }

    return NextResponse.json({
      success: true,
      org_id: orgId,
      message: "Connected."
    });

  } catch (err: any) {
    console.error("Provisioning Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
