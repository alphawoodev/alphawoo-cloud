import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url); // Uses modern URL() - No Deprecation Warning
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const next = searchParams.get("next") ?? "/dashboard";

    if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });

        if (!error) {
            // Success: Redirect to the intended page (Dashboard)
            return NextResponse.redirect(new URL(next, request.url));
        }
    }

    // Error: Redirect to error page
    return NextResponse.redirect(new URL("/auth/auth-code-error", request.url));
}
