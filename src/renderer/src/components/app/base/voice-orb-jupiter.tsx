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
    vec3 p = position + uTime * 0.06;
    float n = fbm(p * 1.8) * 0.5 + fbm(p * 3.5 + uTime * 0.03) * 0.25;
    vLocalPos = position + normal * n * 0.04 * uIntensity;
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

    float turb = fbm(vec3(pos.x + uTime * 0.04, pos.y, pos.z + uTime * 0.025) * 3.8);
    float lat = pos.y + turb * 0.20;

    float band     = sin(lat * 9.5  + turb * 1.8) * 0.5 + 0.5;
    float fineBand = sin(lat * 24.0 + turb * 3.0) * 0.5 + 0.5;
    float micro    = sin(lat * 48.0 + turb * 1.5) * 0.5 + 0.5;

    vec3 cDark   = vec3(0.48, 0.26, 0.07);
    vec3 cOrange = vec3(0.86, 0.50, 0.18);
    vec3 cCream  = vec3(0.97, 0.91, 0.76);
    vec3 cTan    = vec3(0.76, 0.58, 0.32);
    vec3 cPale   = vec3(0.90, 0.80, 0.60);
    vec3 cRed    = vec3(0.65, 0.16, 0.05);

    vec3 col = mix(cDark, cCream, smoothstep(0.18, 0.82, band));
    col = mix(col, cOrange, smoothstep(0.52, 0.78, fineBand) * 0.60);
    col = mix(col, cTan,    smoothstep(0.25, 0.58, band)     * 0.40);
    col = mix(col, cPale,   smoothstep(0.70, 0.92, micro)    * 0.20);

    // Great Red Spot
    float lon  = atan(pos.z, pos.x);
    float dLon = mod(lon - 1.3 + 3.14159265, 6.28318530) - 3.14159265;
    float dLat = pos.y + 0.20;
    float spotDist = sqrt(dLon * dLon * 3.5 + dLat * dLat * 24.0);
    float spotCore = smoothstep(0.26, 0.04, spotDist);
    float spotEdge = smoothstep(0.42, 0.26, spotDist) - spotCore;
    col = mix(col, cRed,          spotCore * 0.92);
    col = mix(col, cOrange * 1.1, spotEdge * 0.72);

    // Polar darkening
    float polar = abs(pos.y);
    col = mix(col, cDark * 0.60, smoothstep(0.62, 0.96, polar) * 0.52);

    // Limb darkening
    float viewDot = clamp(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
    float limb = pow(1.0 - viewDot, 2.0);
    col = mix(col, cDark * 0.30, limb * 0.70);
    col += pow(1.0 - viewDot, 4.0) * vec3(0.52, 0.28, 0.08) * 0.25;

    // Specular
    float spec = pow(max(dot(vNormal, normalize(vec3(0.8, 1.0, 1.6))), 0.0), 30.0);
    col += spec * 0.20 * vec3(1.0, 0.95, 0.85);

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
		speed: 0.003,
		intensity: 0.7,
		label: 'Tap to activate',
		message: 'How can I help you today?',
		dotColor: 'rgba(210,138,42,0.65)',
		blink: false,
		ringPulse: false,
		pulseFreq: 4.5,
		waveform: false,
	},
	listening: {
		speed: 0.011,
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
		speed: 0.022,
		intensity: 1.35,
		label: 'Speaking…',
		message: 'Ask me anything!',
		dotColor: '#e07820',
		blink: false,
		ringPulse: true,
		pulseFreq: 7.5,
		waveform: true,
	},
};

const BAR_COUNT = 22;
const MODE_KEYS = Object.keys(MODES) as VoiceOrbMode[];

export function VoiceOrbJupiter(): ReactElement {
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

		// Planet (slightly oblate like Jupiter)
		const geom = new THREE.SphereGeometry(1, 80, 80);
		const uniforms = {
			uTime: { value: 0 },
			uIntensity: { value: 1.0 },
		};
		const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms });
		const mesh = new THREE.Mesh(geom, mat);
		mesh.scale.set(1, 0.92, 1);
		scene.add(mesh);

		// Ring system
		const ringGeom = new THREE.RingGeometry(1.28, 1.62, 80);
		const ringMat = new THREE.MeshBasicMaterial({
			color: 0xb8762a,
			transparent: true,
			opacity: 0.28,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		const planetRing = new THREE.Mesh(ringGeom, ringMat);
		planetRing.rotation.x = Math.PI * 0.12;
		scene.add(planetRing);

		// Warm ambient glow
		const glowGeom = new THREE.PlaneGeometry(2.8, 2.8);
		const glowMat = new THREE.MeshBasicMaterial({
			color: 0xb06020,
			transparent: true,
			opacity: 0.09,
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
				cx.fillStyle = `rgba(200,128,40,${a.toFixed(2)})`;
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
			mesh.rotation.x = Math.sin(t * 0.3) * 0.04;

			planetRing.rotation.z += cfg.speed * 0.08;

			glowMat.opacity = 0.07 + Math.sin(t * 2.2) * 0.03;

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
				aria-label={`Voice agent (Jupiter), mode: ${mode}. Click to change.`}
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
						border: '1.5px solid rgba(200,130,40,0.55)',
						opacity: 0,
						transition: 'opacity 0.06s',
					}}
				/>
				<div
					ref={ring2Ref}
					className="pointer-events-none absolute rounded-full"
					style={{
						inset: -38,
						border: '1px solid rgba(180,110,30,0.28)',
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
						animation: cfg.blink ? 'voiceOrbJupiterBlink 1.3s ease-in-out infinite' : 'none',
					}}
				/>
				<span
					className="text-sm italic"
					style={{
						color: 'rgba(160,90,20,0.88)',
						animation: cfg.blink ? 'voiceOrbJupiterBlink 1.3s ease-in-out infinite' : 'none',
					}}
				>
					{cfg.label}
				</span>
			</div>
			<p
				className="text-center text-sm"
				style={{ color: 'rgba(100,60,15,0.68)', maxWidth: 288, lineHeight: 1.68, minHeight: 72 }}
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
				@keyframes voiceOrbJupiterBlink {
					0%, 100% { opacity: 1; }
					50% { opacity: 0.18; }
				}
			`}</style>
		</div>
	);
}
