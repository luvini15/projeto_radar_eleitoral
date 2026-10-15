import * as React from 'react'
import { motion } from 'framer-motion'

interface OtpProps {
  value: string
  onChange: (value: string) => void
  length?: number
  disabled?: boolean
  invalid?: boolean
  label?: string
}

export function Otp({ value, onChange, length = 6, disabled = false, invalid = false, label = 'Código de autenticação' }: OtpProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const digits = Array.from({ length }, (_, index) => value[index] ?? '')

  return (
    <div className="otp" data-complete={value.length === length} data-invalid={invalid} onClick={() => inputRef.current?.focus()}>
      <div className="otp-row" aria-hidden="true">
        {digits.map((digit, index) => (
          <motion.span
            key={index}
            className="otp-slot"
            data-active={index === value.length}
            animate={invalid ? { x: [0, -4, 4, -3, 3, 0] } : { x: 0 }}
            transition={{ duration: .34, delay: index * .025 }}
          >
            {digit ? <motion.b initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{digit}</motion.b> : null}
          </motion.span>
        ))}
      </div>
      <input
        ref={inputRef}
        aria-label={label}
        className="otp-field"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        disabled={disabled}
        value={value}
        onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, length))}
      />
    </div>
  )
}
