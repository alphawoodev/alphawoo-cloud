'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (signInError) {
            setError(signInError.message)
            setIsLoading(false)
        } else {
            router.push(searchParams.get('next') || '/dashboard')
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md border-zinc-200 dark:border-zinc-800 shadow-xl">
                <CardHeader className="space-y-1">
                    <div className="w-12 h-12 bg-white border border-zinc-200 rounded-lg mb-4 mx-auto flex items-center justify-center shadow-sm">
                        <KeyRound className="w-6 h-6 text-zinc-900" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center tracking-tight">AlphaWoo</CardTitle>
                    <CardDescription className="text-center">
                        Sign in to your Revenue Dashboard
                    </CardDescription>
                </CardHeader>

                <CardContent>
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
                        <div className="space-y-2">
                            <Input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
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
                            className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm space-y-3">
                        <Link
                            href="/login/magic"
                            className="block text-zinc-500 hover:text-zinc-900 underline underline-offset-4"
                        >
                            Use Magic Link (First Time Login)
                        </Link>
                        <Link href="/forgot-password" className="block text-zinc-400 hover:text-zinc-600">
                            Forgot Password?
                        </Link>
                    </div>
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
