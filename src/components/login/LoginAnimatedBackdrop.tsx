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
              value: reducedMotion ? 28 : 64,
              density: {
                enable: true,
                width: 1200,
                height: 900,
              },
            },
            color: {
              value: ['#f4f4f5', '#a1a1aa', '#7f8aa1'],
            },
            opacity: {
              value: { min: 0.2, max: 0.6 },
              animation: {
                enable: true,
                speed: 0.8,
                sync: false,
              },
            },
            size: {
              value: { min: 1, max: 2.2 },
            },
            links: {
              enable: true,
              distance: 72,
              color: '#f4f4f5',
              opacity: 0.08,
              width: 1,
            },
            move: {
              enable: !reducedMotion,
              speed: 1.85,
              direction: 'none',
              random: true,
              straight: false,
              outModes: {
                default: 'bounce',
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
