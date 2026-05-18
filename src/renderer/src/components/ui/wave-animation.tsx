import { useEffect, useRef } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

const SEGS = 240

const WAVES = [
  { amp: 0.06, freq: 1.75, ph: 0.8, sp: 0.58, cL: [0.12, 0.70, 0.62], cM: [0.18, 0.58, 0.88], cR: [0.48, 0.25, 0.80] },
  { amp: 0.095, freq: 2.00, ph: 0.0, sp: 0.93, cL: [0.16, 0.84, 0.76], cM: [0.10, 0.60, 1.0], cR: [0.44, 0.20, 0.93] },
  { amp: 0.074, freq: 1.85, ph: 2.1, sp: 0.71, cL: [0.20, 0.90, 0.82], cM: [0.14, 0.66, 0.97], cR: [0.56, 0.33, 0.86] },
  { amp: 0.05, freq: 2.18, ph: 3.5, sp: 0.84, cL: [0.42, 0.28, 0.88], cM: [0.18, 0.60, 0.95], cR: [0.44, 0.30, 0.88] },
] as const

type WaveCfg = (typeof WAVES)[number]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function colorAt(u: number, L: readonly number[], M: readonly number[], R: readonly number[]) {
  return u < 0.5
    ? [lerp(L[0], M[0], u * 2), lerp(L[1], M[1], u * 2), lerp(L[2], M[2], u * 2)]
    : [lerp(M[0], R[0], (u - 0.5) * 2), lerp(M[1], R[1], (u - 0.5) * 2), lerp(M[2], R[2], (u - 0.5) * 2)]
}

function bakeColors(geo: THREE.BufferGeometry, cfg: WaveCfg) {
  const C = geo.attributes.color.array as Float32Array
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS
    const ea = Math.pow(Math.sin(u * Math.PI), 0.3)
    const [r, g, b] = colorAt(u, cfg.cL, cfg.cM, cfg.cR)
    C[i * 3] = r * ea
    C[i * 3 + 1] = g * ea
    C[i * 3 + 2] = b * ea
  }
  geo.attributes.color.needsUpdate = true
}

function updatePositions(geo: THREE.BufferGeometry, cfg: WaveCfg, t: number) {
  const P = geo.attributes.position.array as Float32Array
  const br =
    Math.max(0.18, 0.63 + 0.24 * Math.sin(t * 0.68 + cfg.ph * 0.2) + 0.13 * Math.sin(t * 1.43 + cfg.ph * 0.5))
  for (let i = 0; i <= SEGS; i++) {
    const u = i / SEGS
    const x = u * 2 - 1
    const fd = Math.pow(Math.sin(u * Math.PI), 0.65)
    P[i * 3] = x
    P[i * 3 + 1] = Math.sin(x * Math.PI * cfg.freq + cfg.ph + t * cfg.sp) * cfg.amp * br * fd
    P[i * 3 + 2] = 0
  }
  geo.attributes.position.needsUpdate = true
}

type WaveAnimationProps = {
  active?: boolean
  height?: number
  className?: string
}

export function WaveAnimation({ active = true, height = 64, className }: WaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const W = canvas.parentElement?.clientWidth ?? 300
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(W, height)
    renderer.setClearColor(0, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, height / W, -(height / W), 0.1, 10)
    camera.position.z = 5

    const GY = 0.0095
    const waveData: { geo: THREE.BufferGeometry; cfg: WaveCfg }[] = []

    WAVES.forEach((cfg, i) => {
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3))
      geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3))
      bakeColors(geo, cfg)

      const glowMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      })
      const gT = new THREE.Line(geo, glowMat)
      const gB = new THREE.Line(geo, glowMat)
      gT.position.set(0, GY, i * 0.05)
      gB.position.set(0, -GY, i * 0.05)
      scene.add(gT, gB)

      const coreMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      })
      const core = new THREE.Line(geo, coreMat)
      core.position.z = i * 0.05 + 0.01
      scene.add(core)

      waveData.push({ geo, cfg })
    })

    let rafId = 0

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick)
      if (activeRef.current) {
        waveData.forEach(({ geo, cfg }) => updatePositions(geo, cfg, now * 0.001))
      }
      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(tick)

    const handleResize = () => {
      const W = canvas.parentElement?.clientWidth ?? 300
      renderer.setSize(W, height)
      camera.top = height / W
      camera.bottom = -(height / W)
      camera.updateProjectionMatrix()
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", handleResize)
      waveData.forEach(({ geo }) => geo.dispose())
      renderer.dispose()
    }
  }, [height])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("block w-full", className)}
      style={{ height }}
    />
  )
}
