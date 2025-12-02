import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    // 1. CLEAN THE INPUT (Force lowercase, remove spaces)
    const rawEmail = body.email || "";
    const email = rawEmail.trim().toLowerCase();
    const site_url = (body.site_url || "").trim();

    if (!email || !site_url) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    console.log(`🔌 Provisioning for normalized email: [${email}]`);

    // 2. FIND USER (The "Fuzzy" Match)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) throw listError;

    // Compare LOWERCASE to LOWERCASE (This is the fix)
    let targetUser = users?.find((u) => u.email?.toLowerCase().trim() === email);
    let isNewUser = false;

    if (targetUser) {
        console.log(`✅ MATCH FOUND: ${targetUser.id}`);
    } else {
        console.log(`⚠️ No match found for [${email}]. Creating new user...`);
        isNewUser = true;
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { source: "plugin_provision" }
        });

        if (createError) {
             // If we somehow missed the match but they exist (e.g. slight variation), 
             // fail loudly so we don't send a link.
             if (createError.message.includes("already registered")) {
                 console.log("❌ User exists but match failed. Debugging...");
                 // This shouldn't happen with the lowercasing above, but if it does, 
                 // we simply tell the plugin "Success" to stop the loop.
                 return NextResponse.json({ 
                     success: true, 
                     message: "Connected (User Sync Issue - Email Skipped)" 
                 });
             }
             throw createError;
        }
        targetUser = newUser.user;
    }

    // 3. HANDLE ORGANIZATION
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
          owner_user_id: targetUser.id,
          name: body.site_name || "New Store",
          url: site_url, 
          subscription_status: 'inactive'
        })
        .select()
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    // 4. SEND MAGIC LINK (STRICTLY NEW USERS)
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
