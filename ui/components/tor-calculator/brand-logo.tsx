"use client"

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = "w-7 h-7" }: BrandLogoProps) {
  return (
    <div
      className={`tor-logo-shell ${className} relative shrink-0 overflow-hidden rounded-lg border border-[#e81c5a]/45 bg-[#101010] shadow-[0_0_14px_rgba(232,28,90,0.18)]`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.png" alt="" className="tor-logo-image h-full w-full object-cover" />
      <span className="tor-logo-sheen absolute -left-[55%] top-0 h-full w-[45%] rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <span className="absolute inset-0 rounded-lg border border-white/10" />
    </div>
  )
}
