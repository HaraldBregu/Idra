import { useEffect, useRef } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

const SEGS = 300

// Faithful to the dome-envelope HTML example: cos(x·π/2) envelope, teal-to-violet palette
const WAVES = [
  { amp: 0.28, freq: 1.6, ph: 0.8,  sp: 0.58, cL: [0.12, 0.70, 0.62], cM: [0.18, 0.58, 0.88], cR: [0.48, 0.25, 0.80] },
  { amp: 0.36, freq: 1.9, ph: 0.0,  sp: 0.90, cL: [0.16, 0.84, 0.76], cM: [0.10, 0.60, 1.00], cR: [0.44, 0.20, 0.93] },
  { amp: 0.30, freq: 1.7, ph: 2.1,  sp: 0.70, cL: [0.20, 0.90, 0.82], cM: [0.14, 0.66, 0.97], cR: [0.56, 0.33, 0.86] },
  { amp: 0.20, freq: 2.1, ph: 3.5,  sp: 0.82, cL: [0.42, 0.28, 0.88], cM: [0.18, 0.60, 0.95], cR: [0.44, 0.30, 0.88] },
] as const

type WaveCfg = (typeof WAVES)[number]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function colorAt(u: number, L: readonly number[], M: readonly number[], R: readonly number[]) {
  return u < 0.5
    ? [lerp(L[0], M[0], u * 2),       lerp(L[1], M[1], u * 2),       lerp(L[2], M[2], u * 2)]
    : [lerp(M[0], R[0], (u-0.5) * 2), lerp(M[1], R[1], (u-0.5) * 2), lerp(M[2], R[2], (u-0.5) * 2)]
}

// cos(x·π/2): 1.0 at center, exactly 0 at ±1 edges
function dome(x: number) { return Math.cos(x * Math.PI * 0.5) }

function bakeColors(geo: THREE.BufferGeometry, cfg: WaveCfg) {
  const C = geo.attributes.color.array as Float32Array
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS, x = u * 2 - 1
    const fade = dome(x)
    const [r, g, b] = colorAt(u, cfg.cL, cfg.cM, cfg.cR)
    C[i*3] = r*fade; C[i*3+1] = g*fade; C[i*3+2] = b*fade
  }
  geo.attributes.color.needsUpdate = true
}

function updatePositions(geo: THREE.BufferGeometry, cfg: WaveCfg, t: number) {
  const P = geo.attributes.position.array as Float32Array
  const br = Math.max(0.2, 0.64 + 0.22 * Math.sin(t * 0.68 + cfg.ph * 0.2) + 0.14 * Math.sin(t * 1.41 + cfg.ph * 0.5))
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS, x = u * 2 - 1
    P[i*3]   = x
    P[i*3+1] = Math.sin(x * Math.PI * cfg.freq + cfg.ph + t * cfg.sp) * cfg.amp * br * dome(x)
    P[i*3+2] = 0
  }
  geo.attributes.position.needsUpdate = true
}

type DomeWaveAnimationProps = {
  active?: boolean
  height?: number
  className?: string
}

export function DomeWaveAnimation({ active = true, height = 80, className }: DomeWaveAnimationProps) {
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
    // Frustum ±0.45: accommodates max amp 0.36 × max br 1.0 with margin
    const camera = new THREE.OrthographicCamera(-1, 1, 0.45, -0.45, 0.1, 10)
    camera.position.z = 5

    const GY = 0.018
    const waveData: { geo: THREE.BufferGeometry; cfg: WaveCfg }[] = []

    WAVES.forEach((cfg, i) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGS+1)*3), 3))
      geo.setAttribute("color",    new THREE.BufferAttribute(new Float32Array((SEGS+1)*3), 3))
      bakeColors(geo, cfg)

      const glowMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.20, depthWrite: false })
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
