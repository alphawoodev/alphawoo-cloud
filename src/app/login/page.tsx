import { Zap } from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { signInAction } from './actions'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <Card className="w-full max-w-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader className="text-center">
          <div className="mx-auto h-8 w-8 text-indigo-600 dark:text-emerald-500">
            <Zap className="h-full w-full" />
          </div>
          <CardTitle className="text-2xl font-bold text-zinc-900 dark:text-white">AlphaWoo Access</CardTitle>
          <CardDescription className="text-zinc-600 dark:text-zinc-400">
            Sign in to your Revenue Insurance Platform
          </CardDescription>
        </CardHeader>

        <form action={signInAction}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="cto@dtc-brand.com" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              Sign In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
