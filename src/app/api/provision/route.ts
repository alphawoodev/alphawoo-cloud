import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Setup Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 2. Get Input
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const site_url = (body.site_url || "").trim();

    if (!email || !site_url) {
      return NextResponse.json({ error: "Missing Email or URL" }, { status: 400 });
    }

    console.log(`🔌 BASIC PROVISION: ${email} @ ${site_url}`);

    // 3. Resolve User (The Boring Way)
    let userId;
    
    // Try to get user by email using the Admin API
    // (We use listUsers with a filter because it's the standard API method)
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    // Manual find because listUsers filtering is notoriously weird
    const existingUser = users?.find(u => u.email?.toLowerCase() === email);

    if (existingUser) {
      console.log(`✅ User Found: ${existingUser.id}`);
      userId = existingUser.id;
    } else {
      console.log(`👤 Creating New User...`);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { source: "plugin" }
      });
      
      if (createError) throw createError;
      userId = newUser.user.id;
      
      // Only send magic link if we actually created a new user
      await supabaseAdmin.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` }
      });
    }

    // 4. Resolve Store (The Boring Way)
    // Check if store exists by URL
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("url", site_url)
      .single();

    let orgId;

    if (existingOrg) {
      console.log(`✅ Store Found: ${existingOrg.id}`);
      orgId = existingOrg.id;
      
      // Force update owner to current user (Basic "Takeover" logic)
      await supabaseAdmin
        .from("organizations")
        .update({ owner_user_id: userId })
        .eq("id", orgId);
        
    } else {
      console.log(`🏪 Creating New Store...`);
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          owner_user_id: userId,
          name: body.site_name || "My Store",
          url: site_url,
          subscription_status: 'inactive'
        })
        .select()
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    // 5. Return Keys
    return NextResponse.json({
      success: true,
      org_id: orgId,
      user_id: userId,
      message: "Connected."
    });

  } catch (err: any) {
    console.error("PROVISION ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
