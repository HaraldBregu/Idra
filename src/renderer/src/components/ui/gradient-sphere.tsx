import { useRef, useEffect } from "react"
import * as THREE from "three"
import { cn } from "@/lib/utils"

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;

  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  uniform float uTime;

  vec3 hash3(vec3 p) {
    p = vec3(
      dot(p, vec3(127.1, 311.7, 74.7)),
      dot(p, vec3(269.5, 183.3, 246.1)),
      dot(p, vec3(113.5, 271.9, 124.6))
    );
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
        mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
      mix(
        mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
        mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y),
      u.z
    );
  }

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec3 normal = normalize(vNormal);

    float theta = atan(normal.z, normal.x);
    float phi = acos(normal.y);

    float u = (theta + 3.14159) / (2.0 * 3.14159);
    float v = phi / 3.14159;

    float n1 = noise3D(normal * 2.0 + uTime * 0.05);
    float n2 = noise3D(normal * 3.5 + vec3(5.0) + uTime * 0.03);
    float n3 = noise3D(normal * 1.5 + vec3(10.0) + uTime * 0.07);

    float distU = u + n1 * 0.15;
    float distV = v + n2 * 0.12;

    vec3 deepPlum   = vec3(0.30, 0.08, 0.28);
    vec3 magenta    = vec3(0.72, 0.15, 0.45);
    vec3 coral      = vec3(0.92, 0.42, 0.32);
    vec3 peach      = vec3(0.95, 0.65, 0.40);
    vec3 amber      = vec3(0.88, 0.55, 0.18);
    vec3 deepViolet = vec3(0.22, 0.05, 0.35);

    float zone1 = smoothstep(0.0, 0.5, distU + n3 * 0.2);
    float zone2 = smoothstep(0.3, 0.8, distV + n1 * 0.15);
    float zone3 = smoothstep(0.2, 0.7, distU * distV + n2 * 0.2);

    vec3 color = deepPlum;
    color = mix(color, magenta, zone1);
    color = mix(color, coral, smoothstep(0.2, 0.6, (1.0 - distV) * (1.0 - distU) + n2 * 0.1));
    color = mix(color, amber, zone2 * zone1);
    color = mix(color, peach, smoothstep(0.4, 0.8, distV) * smoothstep(0.2, 0.7, distU + n3 * 0.15));
    color = mix(color, deepViolet, smoothstep(0.5, 0.9, distU) * smoothstep(0.3, 0.7, distV));

    float glowCenter = 1.0 - length(vec2(distU - 0.45, distV - 0.65)) * 2.0;
    glowCenter = smoothstep(0.0, 0.6, glowCenter + n1 * 0.15);
    color = mix(color, peach * 1.3, glowCenter * 0.4);

    vec3 lightDir1 = normalize(vec3(-0.5, 0.8, 1.0));
    vec3 lightDir2 = normalize(vec3(0.6, -0.3, 0.8));
    float diff1 = max(dot(normal, lightDir1), 0.0) * 0.5;
    float diff2 = max(dot(normal, lightDir2), 0.0) * 0.3;
    float ambient = 0.45;
    float lighting = ambient + diff1 + diff2;

    vec3 viewDir = normalize(-vPosition);
    float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
    fresnel = pow(fresnel, 2.5);
    lighting *= (1.0 - fresnel * 0.35);

    color *= lighting;

    float grain = random(vUv * 800.0 + uTime * 0.5) * 0.12 - 0.06;
    float grain2 = random(vUv * 200.0 + uTime * 0.3) * 0.08 - 0.04;
    color += grain + grain2;

    color = mix(color * 0.7, color, 1.0 - fresnel * 0.5);
    color = pow(color, vec3(0.95));

    gl_FragColor = vec4(color, 1.0);
  }
`

type GradientSphereProps = {
  size?: number
  className?: string
  mode?: "webgl" | "css"
}

export function GradientSphere({ size = 20, className, mode = "webgl" }: GradientSphereProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const clockRef = useRef(new THREE.Clock())

  useEffect(() => {
    if (mode !== "webgl") return
    const container = mountRef.current
    if (!container) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.z = 4

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setClearColor(0, 0)
    renderer.setSize(size, size)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const geometry = new THREE.SphereGeometry(1.2, 128, 128)
    const uniforms = { uTime: { value: 0 } }
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    let mouseX = 0
    let mouseY = 0

    const onMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMouseMove)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const elapsed = clockRef.current.getElapsedTime()
      uniforms.uTime.value = elapsed

      const targetRotY = elapsed * 0.08 + mouseX * 0.3
      const targetRotX = mouseY * 0.2
      mesh.rotation.y += (targetRotY - mesh.rotation.y) * 0.02
      mesh.rotation.x += (targetRotX - mesh.rotation.x) * 0.02

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener("mousemove", onMouseMove)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [mode, size])

  if (mode === "css") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden rounded-full bg-[radial-gradient(circle_at_34%_26%,#ffe39b_0%,#f0a24a_28%,#b12767_56%,#351353_100%)] shadow-[inset_-4px_-6px_12px_rgba(18,8,34,0.38),inset_3px_3px_8px_rgba(255,238,176,0.35)]",
          className
        )}
        style={{ width: size, height: size }}
      >
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,246,198,0.72),transparent_42%)]" />
      </div>
    )
  }

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className={cn("inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    />
  )
}
