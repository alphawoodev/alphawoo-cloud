'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function AuthCallbackPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const [status, setStatus] = useState('Verifying secure link...')
    const [isError, setIsError] = useState(false)

    useEffect(() => {
        const handleAuth = async () => {
            // 1. Get Params from URL (First-Party OTP Flow)
            const token = searchParams.get('token')
            const type = searchParams.get('type') as
                | 'magiclink'
                | 'recovery'
                | 'signup'
                | 'invite'
            const email = searchParams.get('email')
            const next = searchParams.get('next') || '/dashboard'

            // 2. Fallback: Check for Hash Fragment (Legacy/Implicit Flow)
            const hash = window.location.hash
            if (hash && hash.includes('access_token')) {
                const { data } = await supabase.auth.getSession()
                if (data.session) {
                    finalizeLogin(next)
                    return
                }
            }

            // 3. Primary Flow: Verify OTP Token
            if (token && type && email) {
                setStatus('Establishing secure session...')

                const { data, error } = await supabase.auth.verifyOtp({
                    email,
                    token,
                    type,
                })

                if (error) {
                    console.error('OTP Verification Error:', error)
                    setIsError(true)
                    setStatus('Link expired or invalid. Please try again.')
                } else if (data.session) {
                    finalizeLogin(next)
                }
            } else {
                // No token found? Check if we are already logged in
                const { data } = await supabase.auth.getSession()
                if (data.session) {
                    finalizeLogin(next)
                } else {
                    setIsError(true)
                    setStatus('Invalid login link.')
                }
            }
        }

        handleAuth()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const finalizeLogin = (destination: string) => {
        setStatus('Success! Redirecting...')
        // Use window.location to force a hard refresh ensuring cookies are set everywhere
        window.location.href = decodeURIComponent(destination)
    }

    if (isError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-800 p-4">
                <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
                <h1 className="text-xl font-bold mb-2">Authentication Failed</h1>
                <p className="text-zinc-500 mb-6">{status}</p>
                <button
                    onClick={() => router.push('/login')}
                    className="px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800 transition"
                >
                    Return to Login
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
            <p className="font-medium text-zinc-600">{status}</p>
        </div>
    )
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 text-zinc-500">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-indigo-600" />
                    <p className="font-medium text-zinc-600">Preparing secure link...</p>
                </div>
            }
        >
            <AuthCallbackPageContent />
        </Suspense>
    )
}
