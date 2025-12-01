'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Mail, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'

function LoginForm() {
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [isSent, setIsSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const emailParam = searchParams.get('email')
        if (emailParam) {
            setEmail(emailParam)
        }
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const nextUrl = searchParams.get('next') || '/dashboard'
        const redirectUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`

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
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500 to-emerald-500 mb-3" />
                    <CardTitle className="text-2xl font-bold tracking-tight">AlphaWoo</CardTitle>
                    <CardDescription>
                        {isSent ? 'Check your inbox' : 'Sign in to your Revenue Dashboard'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {isSent ? (
                        <div className="text-center space-y-4">
                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-md text-sm">
                                <Mail className="w-6 h-6 mx-auto mb-2" />
                                We sent a magic link to <strong>{email}</strong>.
                                <br />
                                Click it to access your dashboard.
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setIsSent(false)}
                            >
                                Use a different email
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-4">
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
                                <div className="text-sm text-rose-500 text-center bg-rose-50 p-2 rounded">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...
                                    </>
                                ) : (
                                    'Send Magic Link'
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    )
}
