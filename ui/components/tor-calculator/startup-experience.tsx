"use client"

export function StartupSplash({ progress }: { progress: number }) {
  const radius = 66
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--tor-bg-dark)]"
      role="status"
      aria-live="polite"
      aria-label={`Загрузка TorCalculator: ${progress}%`}
    >
      <div className="flex flex-col items-center px-6 text-center">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160" aria-hidden="true">
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--tor-border-soft)"
              strokeWidth="7"
            />
            <circle
              className="tor-startup-progress"
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="var(--tor-accent)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold tabular-nums text-[#f2f0ec]">{progress}</span>
            <span className="mt-0.5 text-xs font-medium uppercase tracking-[0.18em] text-[#767a80]">
              процентов
            </span>
          </div>
        </div>
        <h1 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-[#f2f0ec]">
          TorCalculator
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-6 text-[#9b9b95]">
          <span className="font-semibold text-[var(--tor-accent-strong)]">@hamvpn_bot</span>
          {" "}лучший впн на рынке
        </p>
      </div>
    </div>
  )
}
