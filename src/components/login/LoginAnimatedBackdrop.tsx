import * as React from 'react'
import { tsParticles } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import type { Container } from '@tsparticles/engine'

export function LoginAnimatedBackdrop() {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let particlesContainer: Container | undefined
    const id = `login-particles-${Math.random().toString(36).slice(2)}`
    container.id = id

    async function init() {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      await loadSlim(tsParticles)
      if (cancelled) return

      particlesContainer = await tsParticles.load({
        id,
        options: {
          fullScreen: { enable: false },
          detectRetina: true,
          fpsLimit: 60,
          background: {
            color: 'transparent',
          },
          particles: {
            number: {
              value: reducedMotion ? 42 : 118,
              density: {
                enable: true,
                width: 1100,
                height: 820,
              },
            },
            color: {
              value: ['#f8fafc', '#c9d1dc', '#8291a8', '#6688c8'],
            },
            opacity: {
              value: { min: 0.18, max: 0.72 },
              animation: {
                enable: true,
                speed: reducedMotion ? 0.35 : 1.8,
                sync: false,
              },
            },
            size: {
              value: { min: 1, max: 2.8 },
              animation: {
                enable: !reducedMotion,
                speed: 3.2,
                sync: false,
              },
            },
            links: {
              enable: true,
              distance: 104,
              color: '#dce5f2',
              opacity: 0.13,
              width: 1,
              blink: false,
            },
            move: {
              enable: !reducedMotion,
              speed: 2.65,
              direction: 'right',
              random: false,
              straight: false,
              drift: { min: -0.45, max: 0.45 },
              angle: {
                offset: 0,
                value: 12,
              },
              outModes: {
                default: 'out',
              },
            },
          },
          interactivity: {
            detectsOn: 'canvas',
            events: {
              onHover: {
                enable: false,
              },
              resize: {
                enable: true,
              },
            },
          },
        },
      })
    }

    init()

    return () => {
      cancelled = true
      particlesContainer?.destroy()
    }
  }, [])

  return <div ref={containerRef} className="login-particles pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
}
