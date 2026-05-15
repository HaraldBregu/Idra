import type { ReactElement } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const vert = `
  uniform float uTime;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vLocalPos;

  float h3(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float vn(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p) {
    float v=0.0; float a=0.5;
    for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.0+vec3(17.7,9.2,8.3);a*=0.5;}
    return v;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 p = position + uTime * 0.07;
    float n = fbm(p * 2.0) * 0.5 + fbm(p * 4.0 + uTime * 0.04) * 0.25;
    vLocalPos = position + normal * n * 0.05 * uIntensity;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(vLocalPos, 1.0);
  }
`;

const frag = `
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vLocalPos;

  float h3(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract((p.x + p.y) * p.z);
  }
  float vn(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
      mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);
  }
  float fbm(vec3 p) {
    float v=0.0; float a=0.5;
    for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.0+vec3(17.7,9.2,8.3);a*=0.5;}
    return v;
  }

  void main() {
    vec3 pos = normalize(vLocalPos);

    // Fast-moving turbulence — Neptune has the solar system's strongest winds
    float turb = fbm(vec3(pos.x + uTime * 0.09, pos.y, pos.z + uTime * 0.06) * 4.2);
    float lat = pos.y + turb * 0.14;

    // Subtle banding
    float band = sin(lat * 7.0 + turb * 2.2) * 0.5 + 0.5;

    // Wispy high-altitude cloud layer
    float cloud = fbm(vec3(pos.x + uTime * 0.07, pos.y * 2.2, pos.z + uTime * 0.03) * 5.5);

    // Neptune color palette
    vec3 cDeep   = vec3(0.04, 0.10, 0.48);  // deep cobalt
    vec3 cMid    = vec3(0.10, 0.28, 0.72);  // azure blue
    vec3 cBright = vec3(0.18, 0.50, 0.90);  // bright blue
    vec3 cCloud  = vec3(0.72, 0.88, 0.98);  // white-blue cirrus
    vec3 cDark   = vec3(0.02, 0.05, 0.24);  // Great Dark Spot

    vec3 col = mix(cDeep, cMid, smoothstep(0.20, 0.80, band));
    col = mix(col, cBright, smoothstep(0.58, 0.85, band) * 0.48);
    // Wispy cloud streaks
    col = mix(col, cCloud, smoothstep(0.70, 0.92, cloud) * 0.58);

    // Great Dark Spot
    float lon  = atan(pos.z, pos.x);
    float dLon = mod(lon - 2.0 + 3.14159265, 6.28318530) - 3.14159265;
    float dLat = pos.y - 0.15;
    float spotDist = sqrt(dLon * dLon * 2.8 + dLat * dLat * 20.0);
    float spotCore = smoothstep(0.28, 0.04, spotDist);
    float spotEdge = smoothstep(0.44, 0.28, spotDist) - spotCore;
    col = mix(col, cDark,         spotCore * 0.90);
    col = mix(col, cBright * 0.8, spotEdge * 0.48);

    // Polar brightening (Neptune has bright polar hazes)
    float polar = abs(pos.y);
    col = mix(col, cCloud * 0.80, smoothstep(0.72, 0.97, polar) * 0.32);

    // Limb darkening
    float viewDot = clamp(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    float limb = pow(1.0 - viewDot, 2.2);
    col = mix(col, cDeep * 0.25, limb * 0.78);
    col += pow(1.0 - viewDot, 4.0) * vec3(0.10, 0.25, 0.62) * 0.28;

    // Specular
    float spec = pow(max(dot(vNormal, normalize(vec3(0.8, 1.0, 1.6))), 0.0), 28.0);
    col += spec * 0.22 * vec3(0.85, 0.95, 1.0);

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

type VoiceOrbMode = 'idle' | 'listening' | 'speaking';

interface ModeConfig {
	speed: number;
	intensity: number;
	label: string;
	message: string;
	dotColor: string;
	blink: boolean;
	ringPulse: boolean;
	pulseFreq: number;
	waveform: boolean;
}

const MODES: Record<VoiceOrbMode, ModeConfig> = {
	idle: {
		speed: 0.004,
		intensity: 0.68,
		label: 'Tap to activate',
		message: 'How can I help you today?',
		dotColor: 'rgba(60,120,220,0.65)',
		blink: false,
		ringPulse: false,
		pulseFreq: 4.5,
		waveform: false,
	},
	listening: {
		speed: 0.013,
		intensity: 1.05,
		label: 'Listening…',
		message: '"Hello! I can help you answer questions, explain topics, write content, or just chat casually."',
		dotColor: '#5dd87e',
		blink: true,
		ringPulse: true,
		pulseFreq: 4.5,
		waveform: false,
	},
	speaking: {
		speed: 0.024,
		intensity: 1.38,
		label: 'Speaking…',
		message: 'Ask me anything!',
		dotColor: '#40aaee',
		blink: false,
		ringPulse: true,
		pulseFreq: 7.5,
		waveform: true,
	},
};

const BAR_COUNT = 22;
const MODE_KEYS = Object.keys(MODES) as VoiceOrbMode[];

export function VoiceOrbNeptune(): ReactElement {
	const [mode, setMode] = useState<VoiceOrbMode>('idle');
	const mountRef = useRef<HTMLDivElement>(null);
	const ring1Ref = useRef<HTMLDivElement>(null);
	const ring2Ref = useRef<HTMLDivElement>(null);
	const waveRef = useRef<HTMLCanvasElement>(null);
	const modeRef = useRef<VoiceOrbMode>(mode);
	const afRef = useRef(0);
	const tRef = useRef(0);
	const barH = useRef<number[]>(new Array(BAR_COUNT).fill(0));

	useEffect(() => {
		modeRef.current = mode;
	}, [mode]);

	useEffect(() => {
		const container = mountRef.current;
		if (!container) return;

		const SIZE = 260;
		const scene = new THREE.Scene();
		const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
		camera.position.z = 2.85;

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setSize(SIZE, SIZE);
		renderer.setClearColor(0x000000, 0);
		container.appendChild(renderer.domElement);

		const geom = new THREE.SphereGeometry(1, 80, 80);
		const uniforms = {
			uTime: { value: 0 },
			uIntensity: { value: 1.0 },
		};
		const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
		const mesh = new THREE.Mesh(geom, mat);
		scene.add(mesh);

		// Neptune's narrow, faint rings
		const ringGeom = new THREE.RingGeometry(1.24, 1.38, 80);
		const ringMat = new THREE.MeshBasicMaterial({
			color: 0x2255aa,
			transparent: true,
			opacity: 0.22,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const planetRing = new THREE.Mesh(ringGeom, ringMat);
		planetRing.rotation.x = Math.PI * 0.10;
		scene.add(planetRing);

		// Deep blue ambient glow
		const glowGeom = new THREE.PlaneGeometry(2.8, 2.8);
		const glowMat = new THREE.MeshBasicMaterial({
			color: 0x0a2880,
			transparent: true,
			opacity: 0.10,
			depthWrite: false,
		});
		const glow = new THREE.Mesh(glowGeom, glowMat);
		glow.position.z = -0.5;
		scene.add(glow);

		function drawWaveform(cfg: ModeConfig): void {
			const c = waveRef.current;
			if (!c) return;
			const cx = c.getContext('2d');
			if (!cx) return;
			const WW = 300, WH = 44;
			cx.clearRect(0, 0, WW, WH);
			const bw = 9, gap = 5;
			const totalW = BAR_COUNT * (bw + gap) - gap;
			const sx = (WW - totalW) / 2;
			const t = tRef.current;
			for (let i = 0; i < BAR_COUNT; i++) {
				const target = cfg.waveform
					? 6 + Math.abs(Math.sin(t * 5 + i * 0.6) * 14 + Math.sin(i * 0.3 + t * 2) * 5)
					: 3;
				barH.current[i] += (target - barH.current[i]) * 0.18;
				const bh = Math.max(3, barH.current[i]);
				const x = sx + i * (bw + gap);
				const y = (WH - bh) / 2;
				const a = cfg.waveform ? 0.35 + (barH.current[i] / 30) * 0.55 : 0.2;
				cx.fillStyle = `rgba(60,140,230,${a.toFixed(2)})`;
				cx.beginPath();
				cx.roundRect(x, y, bw, bh, 3);
				cx.fill();
			}
		}

		function loop(): void {
			afRef.current = requestAnimationFrame(loop);
			const cfg = MODES[modeRef.current];
			tRef.current += cfg.speed;
			const t = tRef.current;

			uniforms.uTime.value = t;
			uniforms.uIntensity.value += (cfg.intensity - uniforms.uIntensity.value) * 0.035;

			mesh.rotation.y += cfg.speed * 0.5;
			mesh.rotation.x = Math.sin(t * 0.32) * 0.05;

			planetRing.rotation.z += cfg.speed * 0.06;

			glowMat.opacity = 0.07 + Math.sin(t * 2.3) * 0.03;

			if (ring1Ref.current && ring2Ref.current) {
				if (cfg.ringPulse) {
					const p = (Math.sin(t * cfg.pulseFreq * 10) + 1) / 2;
					ring1Ref.current.style.opacity = String(p * 0.9);
					ring2Ref.current.style.opacity = String(p * 0.5);
				} else {
					ring1Ref.current.style.opacity = '0';
					ring2Ref.current.style.opacity = '0';
				}
			}

			drawWaveform(cfg);
			renderer.render(scene, camera);
		}

		loop();

		return () => {
			cancelAnimationFrame(afRef.current);
			if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
			renderer.dispose();
			geom.dispose();
			mat.dispose();
			ringGeom.dispose();
			ringMat.dispose();
			glowGeom.dispose();
			glowMat.dispose();
		};
	}, []);

	const cycleMode = useCallback((): void => {
		setMode((prev) => MODE_KEYS[(MODE_KEYS.indexOf(prev) + 1) % MODE_KEYS.length]);
	}, []);

	const cfg = MODES[mode];

	return (
		<div className="flex flex-col items-center gap-4">
			<div
				role="button"
				tabIndex={0}
				aria-label={`Voice assistant (Neptune), mode: ${mode}. Click to change.`}
				className="relative cursor-pointer"
				style={{ width: 260, height: 260 }}
				onClick={cycleMode}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') cycleMode();
				}}
			>
				<div
					ref={mountRef}
					style={{ width: 260, height: 260, borderRadius: '50%', overflow: 'hidden' }}
				/>
				<div
					ref={ring1Ref}
					className="pointer-events-none absolute rounded-full"
					style={{
						inset: -18,
						border: '1.5px solid rgba(60,130,230,0.55)',
						opacity: 0,
						transition: 'opacity 0.06s',
					}}
				/>
				<div
					ref={ring2Ref}
					className="pointer-events-none absolute rounded-full"
					style={{
						inset: -38,
						border: '1px solid rgba(40,100,200,0.28)',
						opacity: 0,
						transition: 'opacity 0.06s',
					}}
				/>
			</div>
			<div className="flex items-center gap-2" style={{ height: 22 }}>
				<div
					className="size-2 rounded-full"
					style={{
						background: cfg.dotColor,
						transition: 'background 0.4s',
						animation: cfg.blink ? 'voiceOrbNeptuneBlink 1.3s ease-in-out infinite' : 'none',
					}}
				/>
				<span
					className="text-sm italic"
					style={{
						color: 'rgba(30,80,200,0.88)',
						animation: cfg.blink ? 'voiceOrbNeptuneBlink 1.3s ease-in-out infinite' : 'none',
					}}
				>
					{cfg.label}
				</span>
			</div>
			<p
				className="text-center text-sm"
				style={{ color: 'rgba(20,55,150,0.68)', maxWidth: 288, lineHeight: 1.68, minHeight: 72 }}
			>
				{cfg.message}
			</p>
			<canvas
				ref={waveRef}
				width={300}
				height={44}
				style={{ width: 150, height: 22, opacity: cfg.waveform ? 1 : 0, transition: 'opacity 0.4s' }}
			/>
			<style>{`
				@keyframes voiceOrbNeptuneBlink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.18; }
				}
			`}</style>
		</div>
	);
}
