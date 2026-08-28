import { cn } from '@/lib/utils'

interface DataSightLogoProps {
  className?: string
  showText?: boolean
  markClassName?: string
  textClassName?: string
}

export function DataSightLogo({
  className,
  showText = true,
  markClassName,
  textClassName,
}: DataSightLogoProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3 text-white', className)} aria-label="Data Sight">
      <svg
        className={cn('h-9 w-9 shrink-0', markClassName)}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-hidden="true"
      >
        <path
          d="M8 32c5.9-9.7 13.9-14.6 24-14.6S50.1 22.3 56 32c-5.9 9.7-13.9 14.6-24 14.6S13.9 41.7 8 32Z"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="32" r="8.2" stroke="currentColor" strokeWidth="3.4" />
        <path d="M18 19.5h7M39 44.5h7M44 19.5h4M16 44.5h4" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
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
