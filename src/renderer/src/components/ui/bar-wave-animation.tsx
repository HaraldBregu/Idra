import { useEffect, useRef } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

const NUM = 140
const MAX_H = 0.132
const CYCLE = 26

const WORDS: [number, number][] = [
  [2.5, 2.0],
  [6.5, 2.8],
  [12, 3.2],
  [17.5, 2.5],
  [22, 2.2],
]

function getAmp(phase: number): number {
  const t = (phase * 0.22) % CYCLE
  let env = 0
  for (const [c, hw] of WORDS) {
    const d = Math.abs(t - c)
    if (d < hw) env = Math.max(env, Math.cos((d / hw) * Math.PI * 0.5))
  }
  if (env < 0.05) return 0.005 + 0.004 * Math.abs(Math.sin(phase * 7.9))
  const micro = 0.25 + 0.75 * Math.abs(Math.sin(phase * 5.1))
  const fine = 0.82 + 0.18 * Math.abs(Math.sin(phase * 11.3 + 0.5))
  return env * micro * fine
}

type BarWaveAnimationProps = {
  active?: boolean
  height?: number
  className?: string
}

export function BarWaveAnimation({ active = true, height = 80, className }: BarWaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(devicePixelRatio, 2)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setClearColor(0, 0)

    const scene = new THREE.Scene()
    // Fixed Y frustum ±0.15 — larger than MAX_H (0.132) so bars never clip
    const camera = new THREE.OrthographicCamera(-1, 1, 0.15, -0.15, 0.1, 10)
    camera.position.z = 5

    // Center hairline
    const hairGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
    ])
    const hairLine = new THREE.Line(
      hairGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13 })
    )
    scene.add(hairLine)

    // Bars — NUM vertical line segments
    const ampBuf = new Float32Array(NUM).fill(0.007)
    const posArr = new Float32Array(NUM * 6)
    const barGeo = new THREE.BufferGeometry()
    barGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3))
    const barMesh = new THREE.LineSegments(
      barGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 })
    )
    scene.add(barMesh)

    let phase = 0

    function redraw() {
      const pitch = 2 / NUM
      for (let i = 0; i < NUM; i++) {
        const x = -1 + (i + 0.5) * pitch
        const h = ampBuf[i] * MAX_H
        posArr[i * 6]     = x; posArr[i * 6 + 1] = -h; posArr[i * 6 + 2] = 0
        posArr[i * 6 + 3] = x; posArr[i * 6 + 4] =  h; posArr[i * 6 + 5] = 0
      }
      barGeo.attributes.position.needsUpdate = true
    }

    function resize(w: number) {
      renderer.setSize(w * dpr, height * dpr, false)
    }

    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w && w > 0) resize(w)
    })
    ro.observe(canvas)

    const initialW = canvas.getBoundingClientRect().width
    if (initialW > 0) resize(initialW)

    redraw()

    let rafId = 0
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      if (activeRef.current) {
        ampBuf.copyWithin(0, 1)
        ampBuf[NUM - 1] = getAmp(phase)
        phase += 0.22
        redraw()
      }
      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      hairGeo.dispose()
      barGeo.dispose()
      renderer.dispose()
    }
  }, [height])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block", className)}
      style={{ width: "100%", height }}
    />
  )
}
