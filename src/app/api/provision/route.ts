import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. Init Admin Client (Bypass RLS to create users/orgs)
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
    const { email, site_url, site_name } = body;

    if (!email || !site_url) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    console.log(`🔌 Provisioning request for: ${email}`);

    // 2. CHECK IDENTITY (The Smart Step)
    // Does this user already exist?
    const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    
    // Simple find (Optimization: Supabase doesn't have getUserByEmail in admin API directly, listUsers filters usually needed or exact match loop)
    // For MVP scale, filtering the list is fine. For scale, use RPC.
    let targetUser = users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    let isNewUser = false;

    // 3. HANDLE NEW USERS
    if (!targetUser) {
      console.log("👤 Creating NEW user...");
      isNewUser = true;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true, // Auto-confirm so they can login immediately via Magic Link
        user_metadata: { source: "plugin_provision" }
      });

      if (createError) throw createError;
      targetUser = newUser.user;
    } else {
      console.log(`👤 Found EXISTING user: ${targetUser.id}`);
    }

    if (!targetUser) throw new Error("User creation failed");

    // 4. CREATE ORGANIZATION (The Store)
    // Check if Org exists for this URL to prevent duplicates (The "Zombie" check)
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id, api_key") // Assuming you have an api_key column, or we generate one
      .eq("url", site_url) // Assuming you have a url column
      .single();

    let orgId, apiKey;

    if (existingOrg) {
      console.log("🏪 Store already exists. Reconnecting...");
      // SECURITY: In a strict model, we wouldn't just hand this back. 
      // But for "Trojan Horse" adoption, we assume possession of the WP Admin implies ownership.
      orgId = existingOrg.id;
      // Update owner if needed? No, leave original owner for now to prevent hijacking.
    } else {
      console.log("🏪 Creating NEW Store...");
      // Create the Org
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          owner_user_id: targetUser.id,
          name: site_name || "New Store",
          // url: site_url, // Ensure your DB has this column
          // api_key: crypto.randomUUID(), // If you use API keys
          subscription_status: 'inactive' // Start in Shadow Mode
        })
        .select()
        .single();

      if (orgError) throw orgError;
      orgId = newOrg.id;
    }

    // 5. SEND MAGIC LINK (Only if New User)
    // If it's you (Existing), we skip this. You just login normally.
    if (isNewUser) {
        await supabaseAdmin.auth.signInWithOtp({
            email: email,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
            }
        });
    }

    // 6. RETURN CREDENTIALS TO PLUGIN
    return NextResponse.json({
      success: true,
      org_id: orgId,
      user_status: isNewUser ? "new" : "existing",
      message: isNewUser ? "Check your email." : "Store connected to existing account."
    });

  } catch (err: any) {
    console.error("Provisioning Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
