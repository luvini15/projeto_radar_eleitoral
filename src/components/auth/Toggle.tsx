import { useEffect } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface ToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  stretch?: number
  speed?: number
  label: string
}

export function Toggle({ checked, onCheckedChange, disabled = false, stretch = 36, speed = 50, label }: ToggleProps) {
  const x = useMotionValue(checked ? 31 : 3)
  const chase = useSpring(x, { stiffness: 170 + speed * 2, damping: 22, mass: 0.9 })
  const dropX = useTransform(chase, value => value - Math.min(8, stretch / 6))

  useEffect(() => {
    x.set(checked ? 31 : 3)
  }, [checked, x])

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className="liquid-toggle"
      data-checked={checked}
    >
      <svg className="liquid-toggle__defs" aria-hidden="true">
        <defs>
          <filter id="data-sight-toggle-goo">
            <feGaussianBlur stdDeviation="5" result="smear" />
            <feColorMatrix in="smear" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" />
          </filter>
        </defs>
      </svg>
      <span className="liquid-toggle__track">
        <span className="liquid-toggle__goo">
          <motion.i className="liquid-toggle__drop" style={{ x: dropX }} />
          <motion.i
            className="liquid-toggle__thumb"
            animate={{ x: checked ? 31 : 3, scaleX: checked ? [1, 1.22, 1] : [1, 1.22, 1] }}
            transition={{ type: 'spring', stiffness: 170 + speed * 2, damping: 22, mass: 0.9 }}
          />
        </span>
      </span>
    </button>
  )
}
