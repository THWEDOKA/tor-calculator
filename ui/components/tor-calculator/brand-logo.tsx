"use client"

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = "w-7 h-7" }: BrandLogoProps) {
  return (
    <div
      className={`tor-logo-shell ${className} relative shrink-0 overflow-hidden rounded-lg border border-[var(--tor-border-strong)] bg-[var(--tor-bg-card)]`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" className="h-full w-full object-cover opacity-90" />
      <span className="absolute inset-0 rounded-lg border border-white/5" />
    </div>
  )
}
