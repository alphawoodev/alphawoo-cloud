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

    // 1. IDENTITY
    const { data: existingUserId, error: rpcError } = await supabaseAdmin
      .rpc('get_user_id_by_email', { email_input: email });

    if (rpcError) throw rpcError;

    let targetUserId = existingUserId;
    let isNewUser = false;

    if (!targetUserId) {
      isNewUser = true;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { source: "plugin_provision" }
      });
      if (createError) throw createError;
      targetUserId = newUser.user.id;
    }

    // 2. STORE LOOKUP
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_user_id")
      .eq("url", site_url)
      .single();

    let orgId;
    let transferLog = "No Transfer Needed"; // Default state

    if (existingOrg) {
      orgId = existingOrg.id;
      const oldOwner = existingOrg.owner_user_id;

      // 3. THE HANDOVER CHECK
      if (oldOwner !== targetUserId) {
          console.log(`🔄 Transfer Initiated: ${oldOwner} -> ${targetUserId}`);
          
          // PERFORM UPDATE AND RETURN RESULT
          const { data: updatedData, error: updateError } = await supabaseAdmin
            .from("organizations")
            .update({ owner_user_id: targetUserId })
            .eq("id", orgId)
            .select() // <--- CRITICAL: Prove it changed
            .single();

          if (updateError) {
              transferLog = `FAILED: ${updateError.message}`;
              console.error("Transfer Failed", updateError);
          } else {
              transferLog = `SUCCESS: Changed from ${oldOwner} to ${updatedData.owner_user_id}`;
          }
      } else {
          transferLog = `SKIPPED: Owner is already ${targetUserId}`;
      }
    } else {
      // Create New
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
      transferLog = "New Store Created";
    }

    // 4. EMAIL
    if (isNewUser) {
        await supabaseAdmin.auth.signInWithOtp({
            email: email,
            options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
        });
    }

    // RETURN DEBUG DATA IN RESPONSE
    return NextResponse.json({
      success: true,
      org_id: orgId,
      message: "Connected.",
      debug_transfer: transferLog, // <--- READ THIS IN NETWORK TAB
      debug_user_id: targetUserId
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
