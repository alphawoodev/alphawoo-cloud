'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'

function MagicLoginForm() {
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const emailParam = searchParams.get('email')
        if (emailParam) setEmail(emailParam)
    }, [searchParams])

    const handleMagicLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const nextUrl = searchParams.get('next') || '/dashboard'
        const origin = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
        const redirectUrl = `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`

        const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: redirectUrl,
            },
        })

        if (otpError) {
            setError(otpError.message)
            setIsLoading(false)
        } else {
            setIsSent(true)
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl">
                <CardHeader className="space-y-1">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-lg mb-4 mx-auto flex items-center justify-center">
                        <Mail className="w-6 h-6 text-indigo-600" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center tracking-tight">One-Click Access</CardTitle>
                    <CardDescription className="text-center">
                        {isSent ? 'Check your inbox' : 'We will email you a secure entry link.'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {isSent ? (
                        <div className="text-center space-y-4">
                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-md text-sm border border-emerald-100">
                                <p>We sent a magic link to <strong>{email}</strong>.</p>
                                <p className="mt-2">Click it to access your dashboard instantly.</p>
                            </div>
                            <Button variant="outline" className="w-full" onClick={() => setIsSent(false)}>
                                Try a different email
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleMagicLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-white dark:bg-zinc-900"
                                />
                            </div>

                            {error && (
                                <div className="text-sm text-rose-500 text-center bg-rose-50 p-2 rounded border border-rose-100">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Send Magic Link'}
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm">
                        <Link href="/login" className="text-zinc-500 hover:text-zinc-900">
                            Back to Password Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function MagicLoginPage() {
    return (
        <Suspense fallback={null}>
            <MagicLoginForm />
        </Suspense>
    )
}
