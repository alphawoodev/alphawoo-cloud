'use client'

import { useState } from 'react'
import { Zap, ShieldCheck } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import { toggleShadowModeAction } from '../actions'

interface ShadowModeToggleProps {
  initialShadowMode: boolean
  storeId: string
}

export function ShadowModeToggle({ initialShadowMode, storeId }: ShadowModeToggleProps) {
  const [isEnabled, setIsEnabled] = useState(!initialShadowMode)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = async (checked: boolean) => {
    setIsLoading(true)
    setError(null)
    const newShadowModeState = !checked

    try {
      const result = await toggleShadowModeAction(storeId, newShadowModeState)
      if (result.success) {
        setIsEnabled(checked)
      } else {
        setError(result.error || 'Failed to update state.')
        setIsEnabled(!checked)
      }
    } catch (e: any) {
      setError(e?.message || 'An unexpected error occurred.')
      setIsEnabled(!checked)
    } finally {
      setIsLoading(false)
    }
  }

  const statusText = isEnabled ? 'Live/Active Mode' : 'Shadow/Test Mode'
  const statusColor = isEnabled ? 'text-emerald-500' : 'text-amber-500'

  return (
    <Card className="border-zinc-200 shadow-lg dark:border-zinc-800">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold">
            <ShieldCheck className="mr-2 inline h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Operational Mode
          </CardTitle>
          <CardDescription>Control live rescue sequences and data processing.</CardDescription>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${statusColor}`}>{statusText}</p>
        </div>
      </CardHeader>

      <CardContent className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Switch id="shadow-mode" checked={isEnabled} onCheckedChange={handleToggle} disabled={isLoading} />
          <Label htmlFor="shadow-mode" className="text-sm">
            Toggle Live Activation
          </Label>
        </div>

        {isLoading && <Zap className="h-5 w-5 animate-pulse text-indigo-500" />}

        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      </CardContent>
    </Card>
  )
}
