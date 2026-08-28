import * as React from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  baseSize: number
  pulse: number
  pulseSpeed: number
  drift: number
}

const LINK_DISTANCE = 138
const TRIANGLE_DISTANCE = 104
const FLOW_FORCE = 0.045
const MAX_SPEED = 2.35

function createParticle(width: number, height: number): Particle {
  const angle = Math.random() * Math.PI * 2
  const speed = 0.85 + Math.random() * 1.2

  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: Math.cos(angle) * speed + 0.52,
    vy: Math.sin(angle) * speed * 0.78,
    baseSize: 1.15 + Math.random() * 2.15,
    pulse: Math.random() * Math.PI * 2,
    pulseSpeed: 0.024 + Math.random() * 0.034,
    drift: Math.random() * Math.PI * 2,
  }
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)

  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))

  return { width: rect.width, height: rect.height, dpr }
}

export function LoginAnimatedBackdrop() {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return
    const ctx = context

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let raf = 0
    let size = resizeCanvas(canvas)
    const motionScale = reducedMotion ? 0.45 : 1
    let particles = Array.from({ length: reducedMotion ? 72 : 148 }, () => createParticle(size.width, size.height))

    const resizeObserver = new ResizeObserver(() => {
      size = resizeCanvas(canvas)
      particles = Array.from({ length: reducedMotion ? 72 : 148 }, () => createParticle(size.width, size.height))
    })

    resizeObserver.observe(canvas)

    function draw() {
      const { width, height, dpr } = size
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const gradient = ctx.createRadialGradient(width * 0.56, height * 0.44, 0, width * 0.56, height * 0.44, width * 0.72)
      gradient.addColorStop(0, 'rgba(91, 124, 183, 0.08)')
      gradient.addColorStop(0.48, 'rgba(18, 23, 33, 0.04)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      for (const particle of particles) {
        {
          const flowX = Math.sin(particle.y * 0.01 + frame * 0.028 + particle.drift) * FLOW_FORCE
          const flowY = Math.cos(particle.x * 0.008 + frame * 0.022 + particle.drift) * FLOW_FORCE

          particle.vx += flowX + 0.0028
          particle.vy += flowY

          const speed = Math.hypot(particle.vx, particle.vy)
          if (speed > MAX_SPEED) {
            particle.vx = (particle.vx / speed) * MAX_SPEED
            particle.vy = (particle.vy / speed) * MAX_SPEED
          }

          particle.x += particle.vx * motionScale
          particle.y += particle.vy * motionScale
          particle.pulse += particle.pulseSpeed
          particle.drift += 0.012 * motionScale
        }

        if (particle.x > width + LINK_DISTANCE) particle.x = -LINK_DISTANCE
        if (particle.x < -LINK_DISTANCE) particle.x = width + LINK_DISTANCE
        if (particle.y > height + LINK_DISTANCE) particle.y = -LINK_DISTANCE
        if (particle.y < -LINK_DISTANCE) particle.y = height + LINK_DISTANCE
      }

      for (let i = 0; i < particles.length; i += 1) {
        const first = particles[i]

        for (let j = i + 1; j < particles.length; j += 1) {
          const second = particles[j]
          const dx = first.x - second.x
          const dy = first.y - second.y
          const distance = Math.hypot(dx, dy)

          if (distance < LINK_DISTANCE) {
            const alpha = (1 - distance / LINK_DISTANCE) * 0.24
            ctx.strokeStyle = `rgba(210, 222, 241, ${alpha})`
            ctx.lineWidth = 0.85
            ctx.beginPath()
            ctx.moveTo(first.x, first.y)
            ctx.lineTo(second.x, second.y)
            ctx.stroke()
          }
        }
      }

      for (let i = 0; i < particles.length - 2; i += 5) {
        const first = particles[i]
        const second = particles[i + 1]
        const third = particles[i + 2]
        const a = Math.hypot(first.x - second.x, first.y - second.y)
        const b = Math.hypot(second.x - third.x, second.y - third.y)
        const c = Math.hypot(third.x - first.x, third.y - first.y)

        if (a < TRIANGLE_DISTANCE && b < TRIANGLE_DISTANCE && c < TRIANGLE_DISTANCE) {
          const alpha = (1 - Math.max(a, b, c) / TRIANGLE_DISTANCE) * 0.05
          ctx.fillStyle = `rgba(108, 139, 191, ${alpha})`
          ctx.beginPath()
          ctx.moveTo(first.x, first.y)
          ctx.lineTo(second.x, second.y)
          ctx.lineTo(third.x, third.y)
          ctx.closePath()
          ctx.fill()
        }
      }

      for (const particle of particles) {
        const pulse = 0.72 + Math.sin(particle.pulse) * 0.28
        const radius = particle.baseSize * (1 + pulse * 0.28)

        ctx.fillStyle = `rgba(242, 246, 252, ${0.42 + pulse * 0.26})`
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      frame += 1
      raf = window.requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.cancelAnimationFrame(raf)
      resizeObserver.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="login-particles pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true" />
}
