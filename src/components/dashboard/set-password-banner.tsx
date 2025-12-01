'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function SetPasswordBanner() {
    const [password, setPassword] = useState('')
    const [status, setStatus] = useState<'idle' | 'saving' | 'success'>('idle')
    const supabase = createClient()

    const handleSave = async () => {
        setStatus('saving')
        const { error } = await supabase.auth.updateUser({ password })
        if (!error) {
            setStatus('success')
            setPassword('')
        } else {
            setStatus('idle')
            alert('Error setting password. Try again.')
        }
    }

    if (status === 'success') {
        return (
            <div className="bg-emerald-50 border-b border-emerald-200 p-3">
                <div className="max-w-6xl mx-auto flex items-center gap-2 text-emerald-700 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Password set successfully. You can now log in normally.
                </div>
            </div>
        )
    }

    return (
        <div className="bg-amber-50 border-b border-amber-200 p-4 dark:bg-amber-900/20 dark:border-amber-800">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-900">Finish setting up your account</p>
                        <p className="text-xs text-amber-800">Create a password so you can log in directly without WordPress.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Input
                        type="password"
                        placeholder="Set new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-white max-w-xs h-9 text-sm"
                    />
                    <Button
                        onClick={handleSave}
                        disabled={password.length < 6 || status === 'saving'}
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white border-0 h-9"
                    >
                        {status === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Password'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
