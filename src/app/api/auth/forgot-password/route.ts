import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ success: true });

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. GENERATE RECOVERY TOKEN
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email,
    });

    if (error || !data?.properties) {
      console.error("OTP Gen Failed:", error);
      return NextResponse.json({ success: true }); 
    }

    // 2. EXTRACT TOKEN & BUILD LINK
    const token = data.properties.email_otp || data.properties.action_link.split("token=")[1].split("&")[0];
    const recoveryLink = `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password?type=recovery&email=${encodeURIComponent(email)}&token=${token}`;

    // 3. SEND VIA POSTMARK
    await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN!
      },
      body: JSON.stringify({
        From: process.env.POSTMARK_FROM_EMAIL,
        To: email,
        Subject: "Reset your AlphaWoo password",
        HtmlBody: `
          <p>You requested a password reset.</p>
          <a href="${recoveryLink}"><strong>Click here to set a new password</strong></a>
        `,
        MessageStream: "outbound"
      })
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json({ success: true });
  }
}
