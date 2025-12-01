'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const supabase = createClient()

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')

        // This sends the standard Supabase Recovery email
        // It will direct the user to the URL defined in your Supabase Auth Settings
        // usually .../auth/callback?next=/account/update-password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/password`,
        })

        if (error) {
            setStatus('error')
            setErrorMsg(error.message)
        } else {
            setStatus('success')
        }
    }

    if (status === 'success') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
                <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-xl text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <svg
                            className="h-6 w-6 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-zinc-900">Check your email</h2>
                    <p className="mt-2 text-zinc-500 text-sm">
                        We sent a password reset link to <strong>{email}</strong>.
                    </p>
                    <Link
                        href="/login"
                        className="mt-6 block text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                        &larr; Back to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-200 bg-white p-10 shadow-xl">
                <div className="text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Reset Password</h2>
                    <p className="mt-2 text-sm text-zinc-500">
                        Enter your email to receive recovery instructions.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleReset}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                            Email address
                        </label>
                        <input
                            id="email"
                            type="email"
                            required
                            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {status === 'error' && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{errorMsg}</div>
                    )}

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="flex w-full justify-center rounded-md border border-transparent bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
                    >
                        {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <div className="text-center text-sm">
                    <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}
