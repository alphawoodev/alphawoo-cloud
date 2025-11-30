'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

type AlertDialogContextType = {
  open: boolean
  setOpen: (value: boolean) => void
}

const AlertDialogContext = React.createContext<AlertDialogContextType | undefined>(undefined)

export function AlertDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  return <AlertDialogContext.Provider value={{ open, setOpen }}>{children}</AlertDialogContext.Provider>
}

export function AlertDialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactElement }) {
  const ctx = React.useContext(AlertDialogContext)
  if (!ctx) throw new Error('AlertDialogTrigger must be used within AlertDialog')
  const child = React.Children.only(children)
  if (asChild) {
    return React.cloneElement(child as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        ;(child as any)?.props?.onClick?.(e)
        ctx.setOpen(true)
      },
    })
  }
  return (
    <button type="button" onClick={() => ctx.setOpen(true)}>
      {children}
    </button>
  )
}

export function AlertDialogContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(AlertDialogContext)
  if (!ctx || !ctx.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-md border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        {children}
      </div>
    </div>
  )
}

export function AlertDialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1">{children}</div>
}

export function AlertDialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
}

export function AlertDialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
}

export function AlertDialogDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-600 dark:text-zinc-400">{children}</p>
}

export function AlertDialogCancel({
  children,
  disabled,
}: {
  children: React.ReactNode
  disabled?: boolean
}) {
  const ctx = React.useContext(AlertDialogContext)
  if (!ctx) throw new Error('AlertDialogCancel must be used within AlertDialog')
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => ctx.setOpen(false)}
      className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
    >
      {children}
    </button>
  )
}

export function AlertDialogAction({
  children,
  onClick,
  disabled,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
}) {
  const ctx = React.useContext(AlertDialogContext)
  if (!ctx) throw new Error('AlertDialogAction must be used within AlertDialog')
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onClick?.()
      }}
      className={cn(
        'inline-flex items-center justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}
