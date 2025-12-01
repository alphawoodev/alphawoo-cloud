'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        // This works because the Magic Link ALREADY established the session
        // before this component even loaded.
        const { error } = await supabase.auth.updateUser({
            password,
        })

        if (error) {
            alert('Error setting password: ' + error.message)
            setLoading(false)
        } else {
            // Success: Profile is now "Standard"
            // In V2, you set a 'password_set' flag here. We can add that later.
            router.push('/dashboard')
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
            <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-200 bg-white p-10 shadow-xl">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
                        <svg
                            className="h-6 w-6 text-indigo-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                        Secure your Account
                    </h2>
                    <p className="mt-2 text-sm text-zinc-500">
                        Please set a password to access your dashboard.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleUpdate}>
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-zinc-700"
                        >
                            New Password
                        </label>
                        <div className="mt-1">
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minLength={8}
                                className="block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full justify-center rounded-md border border-transparent bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
                    >
                        {loading ? 'Securing Account...' : 'Set Password & Enter Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    )
}
