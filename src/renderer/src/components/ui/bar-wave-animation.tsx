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
  mediaStream?: MediaStream | null
}

function readAnalyserAmps(
  target: Float32Array,
  analyser: AnalyserNode,
  dataArray: Uint8Array
) {
  analyser.getByteTimeDomainData(dataArray)
  const samplesPerBar = Math.max(1, Math.floor(dataArray.length / target.length))

  for (let i = 0; i < target.length; i++) {
    const start = i * samplesPerBar
    const end = Math.min(dataArray.length, start + samplesPerBar)
    let sum = 0

    for (let j = start; j < end; j++) {
      sum += Math.abs((dataArray[j] - 128) / 128)
    }

    const raw = end > start ? sum / (end - start) : 0
    const gated = raw < 0.015 ? 0.006 : Math.min(1, raw * 4.8)
    target[i] = target[i] * 0.62 + gated * 0.38
  }
}

function decayAmps(target: Float32Array) {
  for (let i = 0; i < target.length; i++) {
    target[i] = target[i] * 0.82 + 0.006 * 0.18
  }
}

export function BarWaveAnimation({
  active = true,
  height = 80,
  className,
  mediaStream,
}: BarWaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeRef = useRef(active)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    activeRef.current = active
  }, [active])

  useEffect(() => {
    if (!mediaStream) {
      analyserRef.current = null
      dataArrayRef.current = null
      return
    }

    const AudioContextCtor = window.AudioContext
    if (!AudioContextCtor) return

    const audioContext = new AudioContextCtor()
    const source = audioContext.createMediaStreamSource(mediaStream)
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.72
    source.connect(analyser)

    analyserRef.current = analyser
    dataArrayRef.current = new Uint8Array(analyser.fftSize)
    void audioContext.resume().catch(() => undefined)

    return () => {
      analyserRef.current = null
      dataArrayRef.current = null
      source.disconnect()
      analyser.disconnect()
      void audioContext.close().catch(() => undefined)
    }
  }, [mediaStream])

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
      const analyser = analyserRef.current
      const dataArray = dataArrayRef.current
      if (activeRef.current && analyser && dataArray) {
        readAnalyserAmps(ampBuf, analyser, dataArray)
        redraw()
      } else if (activeRef.current) {
        ampBuf.copyWithin(0, 1)
        ampBuf[NUM - 1] = getAmp(phase)
        phase += 0.22
        redraw()
      } else {
        decayAmps(ampBuf)
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
