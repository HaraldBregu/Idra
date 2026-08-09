import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { app, isFriday } from '@friday/sdk';

import Editor from './Editor';
import Preview from './Preview';
import { defaultState } from './defaults';
import { downloadFile } from './download';
import { renderDiagram } from './engine';
import { getDiagramTypes } from './inventory';
import { loadState } from './load';
import { errorMessage } from './message';
import { parseConfig } from './config';
import { svgToPng } from './png';
import { saveState } from './save';
import { examples } from './samples';
import { useFridayTheme } from './theme';
import type { AppTheme, DiagramLayout, DiagramLook, DiagramState, EditorTab, ViewMode } from './types';

const themeChoices: AppTheme[] = ['auto', 'default', 'base', 'dark', 'forest', 'neutral', 'neo', 'neo-dark', 'redux', 'redux-dark', 'redux-color', 'redux-dark-color'];
const lookChoices: DiagramLook[] = ['classic', 'handDrawn', 'neo'];
const layoutChoices: DiagramLayout[] = ['auto', 'dagre', 'elk', 'elk.layered', 'elk.stress', 'elk.force', 'elk.mrtree', 'elk.sporeOverlap'];

export default function App() {
	const fridayTheme = useFridayTheme();
	const [state, setState] = useState<DiagramState>(defaultState);
	const [tab, setTab] = useState<EditorTab>('source');
	const [svg, setSvg] = useState('');
	const [diagramType, setDiagramType] = useState('');
	const [diagramTypes, setDiagramTypes] = useState<string[]>([]);
	const [error, setError] = useState('');
	const [rendering, setRendering] = useState(false);
	const [hydrated, setHydrated] = useState(false);
	const [zoom, setZoom] = useState(1);
	const [saved, setSaved] = useState(true);
	const [bindFunctions, setBindFunctions] = useState<Awaited<ReturnType<typeof renderDiagram>>['bindFunctions']>();
	const generation = useRef(0);
	const effectiveTheme = state.theme === 'auto' ? (fridayTheme.isDark ? 'dark' : 'default') : state.theme;
	const hasAccessibilityText = /(^|\n)\s*accTitle\s*:/i.test(state.source) && /(^|\n)\s*accDescr(?:\s*\{)?\s*:/i.test(state.source);
	const workspaceClass = useMemo(() => `workspace view-${state.view}`, [state.view]);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', fridayTheme.isDark);
		for (const [name, value] of Object.entries(fridayTheme.colors)) document.documentElement.style.setProperty(`--${name}`, value);
	}, [fridayTheme]);

	useEffect(() => {
		let active = true;
		loadState().then((value) => {
			if (!active) return;
			setState(value);
			setHydrated(true);
		});
		getDiagramTypes().then((types) => active && setDiagramTypes(types)).catch(() => undefined);
		return () => { active = false; };
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		setSaved(false);
		const timeout = window.setTimeout(() => {
			saveState(state).then(() => setSaved(true)).catch(() => setSaved(false));
		}, 500);
		return () => window.clearTimeout(timeout);
	}, [hydrated, state]);

	const renderNow = useCallback(async () => {
		const current = ++generation.current;
		setRendering(true);
		try {
			const result = await renderDiagram(state.source, {
				config: parseConfig(state.configText),
				theme: effectiveTheme,
				look: state.look,
				layout: state.layout,
			});
			if (current !== generation.current) return;
			setSvg(result.svg);
			setDiagramType(result.type);
			setBindFunctions(() => result.bindFunctions);
			setError('');
		} catch (reason) {
			if (current !== generation.current) return;
			setError(errorMessage(reason));
		} finally {
			if (current === generation.current) setRendering(false);
		}
	}, [effectiveTheme, state.configText, state.layout, state.look, state.source]);

	useEffect(() => {
		if (!hydrated || !state.live) return;
		const timeout = window.setTimeout(() => void renderNow(), 350);
		return () => window.clearTimeout(timeout);
	}, [hydrated, renderNow, state.live]);

	useEffect(() => {
		const keydown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) return;
			if (event.key === 'Enter') {
				event.preventDefault();
				void renderNow();
			}
			if (event.key.toLowerCase() === 's') {
				event.preventDefault();
				downloadFile('diagram.mmd', state.source, 'text/plain;charset=utf-8');
			}
		};
		window.addEventListener('keydown', keydown);
		return () => window.removeEventListener('keydown', keydown);
	}, [renderNow, state.source]);

	const update = <K extends keyof DiagramState>(key: K, value: DiagramState[K]) => setState((current) => ({ ...current, [key]: value }));
	const importFile = (file: File) => void file.text().then((source) => {
		update('source', source);
		setTab('source');
	});
	const openDocs = () => {
		const url = 'https://mermaid.js.org/intro/';
		if (isFriday()) void app.openExternalUrl(url);
		else window.open(url, '_blank', 'noopener,noreferrer');
	};
	const copySvg = () => void navigator.clipboard.writeText(svg).catch((reason) => setError(errorMessage(reason)));
	const exportSvg = () => downloadFile('diagram.svg', svg, 'image/svg+xml;charset=utf-8');
	const exportPng = () => void svgToPng(svg).then((png) => downloadFile('diagram.png', png, 'image/png')).catch((reason) => setError(errorMessage(reason)));
	const fit = () => {
		const element = document.querySelector<SVGSVGElement>('.diagram-output svg');
		const container = document.querySelector<HTMLElement>('.preview-scroll');
		if (!element || !container) return setZoom(1);
		const bounds = element.getBoundingClientRect();
		setZoom(Math.max(0.2, Math.min(1, (container.clientWidth - 64) / (bounds.width / zoom), (container.clientHeight - 64) / (bounds.height / zoom))));
	};

	return (
		<main className="diagrams">
			<header className="app-bar">
				<div className="brand"><span className="brand-mark" aria-hidden="true">◇</span><strong>Diagrams</strong></div>
				<label>Example<select defaultValue="" onChange={(event) => { const example = examples[Number(event.target.value)]; if (example) update('source', example.source); event.target.value = ''; }}><option value="" disabled>Choose…</option>{examples.map((example, index) => <option key={example.name} value={index}>{example.name}</option>)}</select></label>
				<div className="view-switch" role="group" aria-label="Workspace view">{(['source', 'split', 'preview'] as ViewMode[]).map((view) => <button key={view} className={state.view === view ? 'active' : ''} onClick={() => update('view', view)}>{view}</button>)}</div>
				<div className="spacer" />
				<label className="live"><input type="checkbox" checked={state.live} onChange={(event) => update('live', event.target.checked)} /> Live</label>
				<button onClick={openDocs}>Mermaid docs</button>
				<button className="primary" disabled={rendering} onClick={() => void renderNow()}>Render <kbd>⌘↵</kbd></button>
			</header>
			<div className="options-bar">
				<label>Theme<select value={state.theme} onChange={(event) => update('theme', event.target.value as AppTheme)}>{themeChoices.map((theme) => <option key={theme}>{theme}</option>)}</select></label>
				<label>Look<select value={state.look} onChange={(event) => update('look', event.target.value as DiagramLook)}>{lookChoices.map((look) => <option key={look}>{look}</option>)}</select></label>
				<label>Layout<select value={state.layout} onChange={(event) => update('layout', event.target.value as DiagramLayout)}>{layoutChoices.map((layout) => <option key={layout}>{layout}</option>)}</select></label>
				<span className="renderer-count" title={diagramTypes.join(', ')}>{diagramTypes.length || '…'} registered renderers</span>
				<span className="spacer" />
				<button onClick={() => downloadFile('diagram.mmd', state.source, 'text/plain;charset=utf-8')}>Save source <kbd>⌘S</kbd></button>
			</div>
			<div className={workspaceClass}>
				<Editor tab={tab} source={state.source} configText={state.configText} onTabChange={setTab} onSourceChange={(value) => update('source', value)} onConfigChange={(value) => update('configText', value)} onImport={importFile} />
				<Preview svg={svg} error={error} rendering={rendering} zoom={zoom} bindFunctions={bindFunctions} onZoomChange={(value) => setZoom(Math.max(0.2, Math.min(4, value)))} onFit={fit} onCopy={copySvg} onSvg={exportSvg} onPng={exportPng} onPrint={() => window.print()} />
			</div>
			<footer className="status-bar" aria-live="polite">
				<span className={error ? 'status-error' : 'status-ok'}>{error ? 'Render failed' : rendering ? 'Rendering…' : svg ? 'Diagram ready' : 'Ready'}</span>
				{diagramType && <span>{diagramType}</span>}
				{!hasAccessibilityText && <span className="status-warning" title="Add accTitle and accDescr to the Mermaid source for an accessible exported SVG.">Accessibility text missing</span>}
				<span className="spacer" />
				<span>{saved ? 'Saved' : 'Saving…'}</span>
				<span>{state.source.length.toLocaleString()} characters</span>
			</footer>
		</main>
	);
}
