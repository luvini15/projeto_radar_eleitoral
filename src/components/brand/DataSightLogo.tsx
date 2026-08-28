import { cn } from '@/lib/utils'

interface DataSightLogoProps {
  className?: string
  showText?: boolean
  animated?: boolean
  markClassName?: string
  textClassName?: string
}

export function DataSightLogo({
  className,
  showText = true,
  animated = false,
  markClassName,
  textClassName,
}: DataSightLogoProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3 text-white', className)} aria-label="Data Sight">
      <svg
        className={cn('h-9 w-9 shrink-0', animated && 'data-sight-logo--animated', markClassName)}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <path
          d="M8 32c5.9-9.7 13.9-14.6 24-14.6S50.1 22.3 56 32c-5.9 9.7-13.9 14.6-24 14.6S13.9 41.7 8 32Z"
          stroke="currentColor"
          strokeWidth="2.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="data-sight-logo__iris" cx="32" cy="32" r="8" stroke="currentColor" strokeWidth="2.15" />
        <circle className="data-sight-logo__glint" cx="29.5" cy="28.8" r="1.4" fill="currentColor" />
        <path d="M18 19.5h6M40 44.5h6M44 19.5h3.4M16.6 44.5H20" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" />
      </svg>

      {showText && (
        <div className={cn('min-w-0 leading-none', textClassName)}>
          <p className="truncate text-[15px] font-semibold tracking-normal">Data Sight</p>
          <p className="mt-1 truncate text-[11px] font-medium text-current/55">Inteligencia digital</p>
        </div>
      )}
    </div>
  )
}
