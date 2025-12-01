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

        if (!email || !nextUrl) {
            return NextResponse.json({ error: 'Missing email or nextUrl' }, { status: 400 })
        }

        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'magiclink',
            email,
            options: {
                redirectTo: nextUrl,
            },
        })

        if (error) {
            throw error
        }

        const action_link = data?.properties?.action_link

        if (!action_link) {
            return NextResponse.json({ error: 'Failed to generate magic link' }, { status: 500 })
        }

        const emailHtml = await render(
            <AlphaWooMagicLink loginUrl={action_link} userEmail={email} />
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
