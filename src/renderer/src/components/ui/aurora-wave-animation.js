import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
const SEGS = 280;
// Slow, dreamy Gaussian bell-curve envelope — blue-indigo palette
const WAVES = [
    { amp: 0.22, freq: 0.9, ph: 0.5, sp: 0.28, cL: [0.08, 0.45, 0.75], cM: [0.15, 0.65, 0.95], cR: [0.42, 0.28, 0.88] },
    { amp: 0.18, freq: 1.2, ph: 1.8, sp: 0.35, cL: [0.10, 0.60, 0.85], cM: [0.12, 0.52, 0.98], cR: [0.50, 0.22, 0.82] },
    { amp: 0.25, freq: 0.7, ph: 3.2, sp: 0.22, cL: [0.05, 0.70, 0.80], cM: [0.10, 0.58, 0.95], cR: [0.38, 0.30, 0.90] },
];
function lerp(a, b, t) { return a + (b - a) * t; }
function colorAt(u, L, M, R) {
    return u < 0.5
        ? [lerp(L[0], M[0], u * 2), lerp(L[1], M[1], u * 2), lerp(L[2], M[2], u * 2)]
        : [lerp(M[0], R[0], (u - 0.5) * 2), lerp(M[1], R[1], (u - 0.5) * 2), lerp(M[2], R[2], (u - 0.5) * 2)];
}
// Gaussian bell curve: soft center peak, ~5% at ±1 edges
function gaussian(x) { return Math.exp(-x * x * 3.0); }
function bakeColors(geo, cfg) {
    const C = geo.attributes.color.array;
    for (let i = 0; i <= SEGS; i++) {
        const u = i / SEGS, x = u * 2 - 1;
        const fade = gaussian(x);
        const [r, g, b] = colorAt(u, cfg.cL, cfg.cM, cfg.cR);
        C[i * 3] = r * fade;
        C[i * 3 + 1] = g * fade;
        C[i * 3 + 2] = b * fade;
    }
    geo.attributes.color.needsUpdate = true;
}
function updatePositions(geo, cfg, t) {
    const P = geo.attributes.position.array;
    // Very slow, meditative breathing
    const br = Math.max(0.3, 0.60 + 0.18 * Math.sin(t * 0.35 + cfg.ph * 0.3) + 0.10 * Math.sin(t * 0.72 + cfg.ph * 0.6));
    for (let i = 0; i <= SEGS; i++) {
        const u = i / SEGS, x = u * 2 - 1;
        P[i * 3] = x;
        P[i * 3 + 1] = Math.sin(x * Math.PI * cfg.freq + cfg.ph + t * cfg.sp) * cfg.amp * br * gaussian(x);
        P[i * 3 + 2] = 0;
    }
    geo.attributes.position.needsUpdate = true;
}
export function AuroraWaveAnimation({ active = true, height = 80, className }) {
    const canvasRef = useRef(null);
    const activeRef = useRef(active);
    useEffect(() => { activeRef.current = active; }, [active]);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const dpr = Math.min(devicePixelRatio, 2);
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setClearColor(0, 0);
        const scene = new THREE.Scene();
        // Frustum ±0.32: max amp 0.25 × max br 0.88 = 0.22, with margin
        const camera = new THREE.OrthographicCamera(-1, 1, 0.32, -0.32, 0.1, 10);
        camera.position.z = 5;
        const GY = 0.012;
        const waveData = [];
        WAVES.forEach((cfg, i) => {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
            geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
            bakeColors(geo, cfg);
            const glowMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false });
            const gT = new THREE.Line(geo, glowMat);
            gT.position.set(0, GY, i * 0.05);
            const gB = new THREE.Line(geo, glowMat);
            gB.position.set(0, -GY, i * 0.05);
            scene.add(gT, gB);
            const coreMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.90, depthWrite: false });
            const core = new THREE.Line(geo, coreMat);
            core.position.z = i * 0.05 + 0.01;
            scene.add(core);
            waveData.push({ geo, cfg });
        });
        function resize(w) {
            renderer.setSize(w * dpr, height * dpr, false);
        }
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width;
            if (w && w > 0)
                resize(w);
        });
        ro.observe(canvas);
        const initialW = canvas.getBoundingClientRect().width;
        if (initialW > 0)
            resize(initialW);
        let rafId = 0;
        const tick = (now) => {
            rafId = requestAnimationFrame(tick);
            if (activeRef.current) {
                waveData.forEach(({ geo, cfg }) => updatePositions(geo, cfg, now * 0.001));
            }
            renderer.render(scene, camera);
        };
        rafId = requestAnimationFrame(tick);
        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            waveData.forEach(({ geo }) => geo.dispose());
            renderer.dispose();
        };
    }, [height]);
    return (_jsx("canvas", { ref: canvasRef, "aria-hidden": "true", className: cn("block", className), style: { width: "100%", height } }));
}
