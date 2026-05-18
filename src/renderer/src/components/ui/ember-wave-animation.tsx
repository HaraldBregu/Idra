import { useEffect, useRef } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

const SEGS = 280

// Fast, energetic plateau envelope — amber-orange-rose palette
const WAVES = [
  { amp: 0.24, freq: 2.4, ph: 0.3, sp: 1.10, cL: [0.95, 0.55, 0.08], cM: [0.98, 0.35, 0.15], cR: [0.88, 0.18, 0.28] },
  { amp: 0.28, freq: 2.8, ph: 1.2, sp: 1.38, cL: [1.00, 0.65, 0.06], cM: [0.95, 0.30, 0.20], cR: [0.85, 0.12, 0.35] },
  { amp: 0.20, freq: 2.0, ph: 2.6, sp: 0.98, cL: [0.98, 0.50, 0.10], cM: [0.90, 0.42, 0.18], cR: [0.82, 0.20, 0.25] },
  { amp: 0.16, freq: 3.1, ph: 4.1, sp: 1.55, cL: [0.96, 0.60, 0.04], cM: [0.88, 0.28, 0.22], cR: [0.78, 0.15, 0.38] },
  { amp: 0.22, freq: 2.6, ph: 5.0, sp: 1.22, cL: [0.99, 0.72, 0.12], cM: [0.93, 0.38, 0.22], cR: [0.84, 0.18, 0.30] },
] as const

type WaveCfg = (typeof WAVES)[number]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function colorAt(u: number, L: readonly number[], M: readonly number[], R: readonly number[]) {
  return u < 0.5
    ? [lerp(L[0], M[0], u * 2),       lerp(L[1], M[1], u * 2),       lerp(L[2], M[2], u * 2)]
    : [lerp(M[0], R[0], (u-0.5) * 2), lerp(M[1], R[1], (u-0.5) * 2), lerp(M[2], R[2], (u-0.5) * 2)]
}

// Plateau envelope: (1-x²)^0.25 — flat center, exactly 0 at ±1 edges
function plateau(x: number) { return Math.pow(Math.max(0, 1 - x * x), 0.25) }

function bakeColors(geo: THREE.BufferGeometry, cfg: WaveCfg) {
  const C = geo.attributes.color.array as Float32Array
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS, x = u * 2 - 1
    const fade = plateau(x)
    const [r, g, b] = colorAt(u, cfg.cL, cfg.cM, cfg.cR)
    C[i*3] = r*fade; C[i*3+1] = g*fade; C[i*3+2] = b*fade
  }
  geo.attributes.color.needsUpdate = true
}

function updatePositions(geo: THREE.BufferGeometry, cfg: WaveCfg, t: number) {
  const P = geo.attributes.position.array as Float32Array
  // Faster, more erratic breathing
  const br = Math.max(0.25, 0.68 + 0.16 * Math.sin(t * 1.20 + cfg.ph * 0.25) + 0.16 * Math.sin(t * 2.10 + cfg.ph * 0.55))
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS, x = u * 2 - 1
    P[i*3]   = x
    P[i*3+1] = Math.sin(x * Math.PI * cfg.freq + cfg.ph + t * cfg.sp) * cfg.amp * br * plateau(x)
    P[i*3+2] = 0
  }
  geo.attributes.position.needsUpdate = true
}

type EmberWaveAnimationProps = {
  active?: boolean
  height?: number
  className?: string
}

export function EmberWaveAnimation({ active = true, height = 80, className }: EmberWaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)

  useEffect(() => { activeRef.current = active }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = Math.min(devicePixelRatio, 2)
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setClearColor(0, 0)

    const scene = new THREE.Scene()
    // Frustum ±0.38: max amp 0.28 × max br 1.0 with margin
    const camera = new THREE.OrthographicCamera(-1, 1, 0.38, -0.38, 0.1, 10)
    camera.position.z = 5

    const GY = 0.014
    const waveData: { geo: THREE.BufferGeometry; cfg: WaveCfg }[] = []

    WAVES.forEach((cfg, i) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGS+1)*3), 3))
      geo.setAttribute("color",    new THREE.BufferAttribute(new Float32Array((SEGS+1)*3), 3))
      bakeColors(geo, cfg)

      const glowMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false })
      const gT = new THREE.Line(geo, glowMat); gT.position.set(0,  GY, i*0.05)
      const gB = new THREE.Line(geo, glowMat); gB.position.set(0, -GY, i*0.05)
      scene.add(gT, gB)

      const coreMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false })
      const core = new THREE.Line(geo, coreMat); core.position.z = i*0.05 + 0.01
      scene.add(core)

      waveData.push({ geo, cfg })
    })

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

    let rafId = 0
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)
      if (activeRef.current) {
        waveData.forEach(({ geo, cfg }) => updatePositions(geo, cfg, now * 0.001))
      }
      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      waveData.forEach(({ geo }) => geo.dispose())
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
