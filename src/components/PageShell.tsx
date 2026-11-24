import type { ReactNode } from 'react'

export function PageShell({
  centered = false,
  children,
}: {
  centered?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative min-h-svh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_70%)]" />
      <main
        className={
          centered
            ? 'relative mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-6 py-16 text-start'
            : 'relative mx-auto w-full max-w-lg px-6 py-10 text-start'
        }
      >
        {children}
      </main>
    </div>
  )
}
