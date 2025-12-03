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
    const { data: existingUserId, error: rpcError } = await supabaseAdmin
      .rpc('get_user_id_by_email', { email_input: email });

    if (rpcError) throw rpcError;

    let targetUserId = existingUserId;
    let isNewUser = false;

    if (targetUserId) {
      isNewUser = false; 
    } else {
      isNewUser = true;
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: true,
        user_metadata: { source: "plugin_provision" }
      });
      if (createError) throw createError;
      targetUserId = newUser.user.id;
    }

    // 2. STORE LOGIC (Upsert / Handover)
    const { data: existingOrg } = await supabaseAdmin
      .from("organizations")
      .select("id, owner_user_id")
      .eq("url", site_url)
      .single();

    let orgId;

    if (existingOrg) {
      orgId = existingOrg.id;
      if (existingOrg.owner_user_id !== targetUserId) {
          await supabaseAdmin.from("organizations").update({ owner_user_id: targetUserId }).eq("id", orgId);
      }
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

    // 3. FIRST-PARTY INVITE (Replaces Magic Link)
    if (isNewUser) {
        console.log(`Sending First-Party Invite to ${email}`);
        
        // A. Generate Token (Type: Invite)
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: "invite",
            email: email,
        });

        if (!linkError && linkData.properties?.action_link) {
            // B. Extract Token
            const token = linkData.properties.email_otp || linkData.properties.action_link.split("token=")[1].split("&")[0];
            
            // C. Build Link
            const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password?type=invite&email=${encodeURIComponent(email)}&token=${token}`;

            // D. Postmark
            await fetch("https://api.postmarkapp.com/email", {
                method: "POST",
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN!
                },
                body: JSON.stringify({
                    From: process.env.POSTMARK_FROM_EMAIL,
                    To: email,
                    Subject: "Welcome to AlphaWoo - Activate your account",
                    HtmlBody: `
                      <h1>Welcome to AlphaWoo</h1>
                      <p>Your store has been connected. Click below to secure your account:</p>
                      <br/>
                      <a href="${inviteLink}" style="background:#000; color:#fff; padding:12px 24px; text-decoration:none; border-radius:4px;">Secure Account</a>
                    `,
                    MessageStream: "outbound"
                })
            });
        }
    }

    return NextResponse.json({ success: true, org_id: orgId });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
