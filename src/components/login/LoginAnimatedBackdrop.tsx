import * as React from 'react'

type FlowPoint = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  phase: number
  pulseSpeed: number
}

type FlowLink = {
  from: number
  to: number
  progress: number
  active: boolean
}

type ProjectedPoint = {
  x: number
  y: number
  scale: number
}

const DEPTH = 620
const FIELD_WIDTH = 1320
const FIELD_HEIGHT = 780
const CONNECTION_DISTANCE = 190
const POINT_COUNT = 178
const REDUCED_POINT_COUNT = 92
const FOCAL_LENGTH = 760

function createPoint(): FlowPoint {
  return {
    x: (Math.random() - 0.5) * FIELD_WIDTH,
    y: (Math.random() - 0.5) * FIELD_HEIGHT,
    z: (Math.random() - 0.5) * DEPTH,
    vx: 0.2 + Math.random() * 0.36,
    vy: (Math.random() - 0.5) * 0.2,
    vz: (Math.random() - 0.5) * 0.28,
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.022 + Math.random() * 0.032,
  }
}

function resizeCanvas(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.max(1, rect.width)
  const height = Math.max(1, rect.height)

  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)

  return { width, height, dpr }
}

function wrapPoint(point: FlowPoint) {
  if (point.x > FIELD_WIDTH / 2) point.x = -FIELD_WIDTH / 2
  if (point.x < -FIELD_WIDTH / 2) point.x = FIELD_WIDTH / 2
  if (point.y > FIELD_HEIGHT / 2) point.y = -FIELD_HEIGHT / 2
  if (point.y < -FIELD_HEIGHT / 2) point.y = FIELD_HEIGHT / 2
  if (point.z > DEPTH / 2) point.z = -DEPTH / 2
  if (point.z < -DEPTH / 2) point.z = DEPTH / 2
}

function project(point: FlowPoint, width: number, height: number, yaw: number, pitch: number): ProjectedPoint {
  const cosYaw = Math.cos(yaw)
  const sinYaw = Math.sin(yaw)
  const cosPitch = Math.cos(pitch)
  const sinPitch = Math.sin(pitch)
  const rotatedX = point.x * cosYaw - point.z * sinYaw
  const rotatedZ = point.x * sinYaw + point.z * cosYaw
  const rotatedY = point.y * cosPitch - rotatedZ * sinPitch
  const depth = point.y * sinPitch + rotatedZ * cosPitch
  const scale = FOCAL_LENGTH / (FOCAL_LENGTH + depth + DEPTH * 0.5)

  return {
    x: width / 2 + rotatedX * scale,
    y: height / 2 + rotatedY * scale,
    scale,
  }
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
    const points = Array.from({ length: reducedMotion ? REDUCED_POINT_COUNT : POINT_COUNT }, createPoint)
    const projected = new Array<ProjectedPoint>(points.length)
    const linksByKey = new Map<string, FlowLink>()
    let size = resizeCanvas(canvas)
    let frame = 0
    let raf = 0

    const resizeObserver = new ResizeObserver(() => {
      size = resizeCanvas(canvas)
    })
    resizeObserver.observe(canvas)

    function drawLine(from: ProjectedPoint, to: ProjectedPoint, progress: number, alpha: number) {
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const endX = from.x + (to.x - from.x) * easedProgress
      const endY = from.y + (to.y - from.y) * easedProgress

      ctx.strokeStyle = `rgba(205, 217, 236, ${alpha})`
      ctx.lineWidth = 0.72
      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }

    function renderFrame() {
      const { width, height, dpr } = size
      const motionScale = reducedMotion ? 0.34 : 0.7
      const yaw = Math.sin(frame * 0.0032) * 0.2
      const pitch = Math.cos(frame * 0.0026) * 0.075

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const gradient = ctx.createRadialGradient(width * 0.53, height * 0.48, 0, width * 0.53, height * 0.48, width * 0.72)
      gradient.addColorStop(0, 'rgba(92, 118, 166, 0.07)')
      gradient.addColorStop(0.48, 'rgba(12, 14, 18, 0.03)')
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]
        const waveX = Math.sin(point.y * 0.006 + frame * 0.007 + point.phase) * 0.007
        const waveY = Math.cos(point.z * 0.008 + frame * 0.009 + point.phase) * 0.009
        const waveZ = Math.sin(point.x * 0.005 + frame * 0.006 + point.phase) * 0.011

        point.vx += waveX
        point.vy += waveY
        point.vz += waveZ

        const speed = Math.hypot(point.vx, point.vy, point.vz)
        const maxSpeed = 0.9
        if (speed > maxSpeed) {
          point.vx = (point.vx / speed) * maxSpeed
          point.vy = (point.vy / speed) * maxSpeed
          point.vz = (point.vz / speed) * maxSpeed
        }

        point.x += point.vx * motionScale
        point.y += point.vy * motionScale
        point.z += point.vz * motionScale
        point.phase += point.pulseSpeed
        wrapPoint(point)
        projected[i] = project(point, width, height, yaw, pitch)
      }

      for (const link of linksByKey.values()) {
        link.active = false
      }

      for (let i = 0; i < points.length; i += 1) {
        const first = points[i]

        for (let j = i + 1; j < points.length; j += 1) {
          const second = points[j]
          const distance = Math.hypot(first.x - second.x, first.y - second.y, (first.z - second.z) * 0.62)

          if (distance < CONNECTION_DISTANCE) {
            const key = `${i}-${j}`
            const link = linksByKey.get(key) ?? {
              from: i,
              to: j,
              progress: 0,
              active: false,
            }

            link.active = true
            link.progress = Math.min(1, link.progress + (reducedMotion ? 0.016 : 0.028))
            linksByKey.set(key, link)
          }
        }
      }

      for (const [key, link] of linksByKey) {
        if (!link.active) {
          link.progress -= reducedMotion ? 0.012 : 0.022

          if (link.progress <= 0) {
            linksByKey.delete(key)
            continue
          }
        }

        const first = points[link.from]
        const second = points[link.to]
        const from = projected[link.from]
        const to = projected[link.to]
        const distance = Math.hypot(first.x - second.x, first.y - second.y, (first.z - second.z) * 0.62)
        const alpha = Math.max(0.025, (1 - distance / CONNECTION_DISTANCE) * 0.22) * Math.min(1, link.progress + 0.2)

        drawLine(from, to, Math.max(0, Math.min(1, link.progress)), alpha)
      }

      for (let i = 0; i < points.length; i += 1) {
        const point = points[i]
        const current = projected[i]
        const pulse = 0.9 + Math.sin(point.phase) * 0.1
        const radius = Math.max(0.75, 2.25 * current.scale * pulse)
        const alpha = Math.min(0.85, 0.42 + current.scale * 0.24)

        ctx.fillStyle = `rgba(239, 244, 252, ${alpha})`
        ctx.beginPath()
        ctx.arc(current.x, current.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      frame += 1
      raf = window.requestAnimationFrame(renderFrame)
    }

    renderFrame()

    return () => {
      window.cancelAnimationFrame(raf)
      resizeObserver.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="login-particles pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true" />
}
