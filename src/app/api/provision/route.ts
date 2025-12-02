import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Init Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const site_url = (body.site_url || "").trim();

    if (!email || !site_url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    console.log(`🔌 RPC Provisioning for: [${email}]`);

    // 2. THE NUCLEAR CHECK (RPC)
    // Ask the DB directly: "Who owns this email?"
    const { data: existingUserId, error: rpcError } = await supabaseAdmin
      .rpc('get_user_id_by_email', { email_input: email });

    if (rpcError) throw rpcError;

    let targetUserId = existingUserId;
    let isNewUser = false;

    // 3. LOGIC BRANCH
    if (targetUserId) {
      console.log(`✅ User Exists via RPC: ${targetUserId}`);
      isNewUser = false; 
    } else {
      console.log(`👤 User NOT found via RPC. Creating...`);
      isNewUser = true;
      
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { source: "plugin_provision" }
      });

      if (createError) throw createError;
      targetUserId = newUser.user.id;
    }

    // 4. HANDLE ORGANIZATION
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("url", site_url)
      .single();

    let orgId;

    if (existingOrg) {
      orgId = existingOrg.id;
    } else {
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

    // 5. SEND EMAIL (Strictly New Users)
    if (isNewUser) {
        await supabaseAdmin.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            }
        });
    }

    return NextResponse.json({
      success: true,
      org_id: orgId,
      user_status: isNewUser ? "new" : "existing",
      message: "Connected."
    });

  } catch (err: any) {
    console.error("Provisioning Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
