import * as React from 'react'
import { animate } from 'animejs'
import 'animejs/adapters/three'
import * as THREE from 'three'

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

const DEPTH = 520
const FIELD_WIDTH = 1280
const FIELD_HEIGHT = 760
const CONNECTION_DISTANCE = 178
const POINT_COUNT = 190
const REDUCED_POINT_COUNT = 94

function createPoint(): FlowPoint {
  return {
    x: (Math.random() - 0.5) * FIELD_WIDTH,
    y: (Math.random() - 0.5) * FIELD_HEIGHT,
    z: (Math.random() - 0.5) * DEPTH,
    vx: 0.34 + Math.random() * 0.72,
    vy: (Math.random() - 0.5) * 0.34,
    vz: (Math.random() - 0.5) * 0.52,
    phase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.025 + Math.random() * 0.035,
  }
}

function createDotTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(32, 32, 21, 0, Math.PI * 2)
  ctx.fill()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function resizeRenderer(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, element: HTMLElement) {
  const { width, height } = element.getBoundingClientRect()
  const nextWidth = Math.max(1, width)
  const nextHeight = Math.max(1, height)

  renderer.setSize(nextWidth, nextHeight, false)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  camera.aspect = nextWidth / nextHeight
  camera.updateProjectionMatrix()
}

export function LoginAnimatedBackdrop() {
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const points = Array.from({ length: reducedMotion ? REDUCED_POINT_COUNT : POINT_COUNT }, createPoint)
    const maxSegments = points.length * 7
    const pointPositions = new Float32Array(points.length * 3)
    const linePositions = new Float32Array(maxSegments * 2 * 3)

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    })
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(54, 1, 1, 1800)
    camera.position.set(0, 0, 780)

    const field = new THREE.Group()
    field.rotation.x = THREE.MathUtils.degToRad(-3)
    field.rotation.y = THREE.MathUtils.degToRad(-10)
    scene.add(field)

    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3))

    const dotTexture = createDotTexture()
    const pointMaterial = new THREE.PointsMaterial({
      color: 0xe8eef7,
      depthWrite: false,
      map: dotTexture ?? undefined,
      opacity: 0.78,
      size: 4.4,
      sizeAttenuation: true,
      transparent: true,
    })

    const pointCloud = new THREE.Points(pointGeometry, pointMaterial)
    field.add(pointCloud)

    const lineGeometry = new THREE.BufferGeometry()
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
    lineGeometry.setDrawRange(0, 0)

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xc8d6ec,
      opacity: 0.18,
      transparent: true,
    })

    const links = new THREE.LineSegments(lineGeometry, lineMaterial)
    field.add(links)

    resizeRenderer(renderer, camera, container)

    const resizeObserver = new ResizeObserver(() => {
      resizeRenderer(renderer, camera, container)
    })
    resizeObserver.observe(container)

    const spin = animate(field, {
      rotateY: [-10, 8, -10],
      rotateX: [-3, 4, -3],
      duration: reducedMotion ? 16000 : 10500,
      ease: 'inOutSine',
      loop: true,
    })

    const cameraBreath = animate(camera, {
      z: [780, 690, 780],
      duration: reducedMotion ? 14000 : 9000,
      ease: 'inOutSine',
      loop: true,
    })

    let frame = 0
    let raf = 0
    function renderFrame() {
        frame += 1
        const motionScale = reducedMotion ? 0.55 : 1

        for (let i = 0; i < points.length; i += 1) {
          const point = points[i]
          const waveX = Math.sin(point.y * 0.006 + frame * 0.015 + point.phase) * 0.018
          const waveY = Math.cos(point.z * 0.008 + frame * 0.018 + point.phase) * 0.022
          const waveZ = Math.sin(point.x * 0.005 + frame * 0.012 + point.phase) * 0.026

          point.vx += waveX
          point.vy += waveY
          point.vz += waveZ

          const speed = Math.hypot(point.vx, point.vy, point.vz)
          const maxSpeed = 2.15
          if (speed > maxSpeed) {
            point.vx = (point.vx / speed) * maxSpeed
            point.vy = (point.vy / speed) * maxSpeed
            point.vz = (point.vz / speed) * maxSpeed
          }

          point.x += point.vx * motionScale
          point.y += point.vy * motionScale
          point.z += point.vz * motionScale
          point.phase += point.pulseSpeed

          if (point.x > FIELD_WIDTH / 2) point.x = -FIELD_WIDTH / 2
          if (point.x < -FIELD_WIDTH / 2) point.x = FIELD_WIDTH / 2
          if (point.y > FIELD_HEIGHT / 2) point.y = -FIELD_HEIGHT / 2
          if (point.y < -FIELD_HEIGHT / 2) point.y = FIELD_HEIGHT / 2
          if (point.z > DEPTH / 2) point.z = -DEPTH / 2
          if (point.z < -DEPTH / 2) point.z = DEPTH / 2

          const depthScale = THREE.MathUtils.mapLinear(point.z, -DEPTH / 2, DEPTH / 2, 0.72, 1.18)
          const pulse = 0.9 + Math.sin(point.phase) * 0.1
          pointPositions[i * 3] = point.x
          pointPositions[i * 3 + 1] = point.y
          pointPositions[i * 3 + 2] = point.z * depthScale * pulse
        }

        let segment = 0
        for (let i = 0; i < points.length; i += 1) {
          const first = points[i]

          for (let j = i + 1; j < points.length && segment < maxSegments; j += 1) {
            const second = points[j]
            const distance = Math.hypot(first.x - second.x, first.y - second.y, (first.z - second.z) * 0.7)

            if (distance < CONNECTION_DISTANCE) {
              const index = segment * 6
              linePositions[index] = first.x
              linePositions[index + 1] = first.y
              linePositions[index + 2] = first.z
              linePositions[index + 3] = second.x
              linePositions[index + 4] = second.y
              linePositions[index + 5] = second.z
              segment += 1
            }
          }
        }

        pointGeometry.attributes.position.needsUpdate = true
        lineGeometry.attributes.position.needsUpdate = true
        lineGeometry.setDrawRange(0, segment * 2)
        renderer.render(scene, camera)
        raf = window.requestAnimationFrame(renderFrame)
    }

    renderFrame()

    return () => {
      window.cancelAnimationFrame(raf)
      spin.pause()
      cameraBreath.pause()
      resizeObserver.disconnect()
      pointGeometry.dispose()
      lineGeometry.dispose()
      pointMaterial.dispose()
      lineMaterial.dispose()
      dotTexture?.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={containerRef} className="login-particles pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true" />
}
