import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ServerClient } from 'postmark'
import { render } from '@react-email/render'
import AlphaWooMagicLink from '@/emails/magic-link'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const postmarkToken = process.env.POSTMARK_SERVER_TOKEN
const postmark = postmarkToken ? new ServerClient(postmarkToken) : null

export async function POST(req: NextRequest) {
    try {
        const { email, nextUrl } = await req.json()

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 })
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        // 1. Generate OTP Token via Admin API
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email: email,
        })

        if (error) {
            throw error
        }

        // 2. Extract the OTP Token
        const token = data.properties?.email_otp
        const type = 'magiclink'

        if (!token) {
            return NextResponse.json({ error: 'Failed to generate OTP token' }, { status: 500 })
        }

        // 3. Construct FIRST-PARTY Link (Direct to our domain)
        const magicLinkUrl = `${baseUrl}/auth/callback?token=${encodeURIComponent(token)}&type=${type}&email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextUrl || '/dashboard')}`

        console.log(`[Auth] Generated OTP Link for ${email}`)

        // 4. Render Email
        const emailHtml = await render(
            <AlphaWooMagicLink loginUrl={magicLinkUrl} userEmail={email} />
        )

        if (!postmark) {
            console.error('POSTMARK_SERVER_TOKEN is not configured.')
            return NextResponse.json({ error: 'Email service not configured' }, { status: 500 })
        }

        await postmark.sendEmail({
            From: 'system@alphawoo.com',
            To: email,
            Subject: 'Log in to AlphaWoo',
            HtmlBody: emailHtml,
            MessageStream: 'outbound',
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Magic Link Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
