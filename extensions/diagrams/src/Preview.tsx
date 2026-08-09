import { useEffect, useRef, type MouseEvent } from 'react';
import { app, isFriday } from '@friday/sdk';
import type { RenderResult } from 'mermaid';

interface PreviewProps {
	svg: string;
	error: string;
	rendering: boolean;
	zoom: number;
	bindFunctions?: RenderResult['bindFunctions'];
	onZoomChange: (zoom: number) => void;
	onFit: () => void;
	onCopy: () => void;
	onSvg: () => void;
	onPng: () => void;
	onPrint: () => void;
}

export default function Preview({
	svg,
	error,
	rendering,
	zoom,
	bindFunctions,
	onZoomChange,
	onFit,
	onCopy,
	onSvg,
	onPng,
	onPrint,
}: PreviewProps) {
	const previewRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (svg && previewRef.current) bindFunctions?.(previewRef.current);
	}, [bindFunctions, svg]);
	const openLink = (event: MouseEvent<HTMLDivElement>) => {
		const anchor = (event.target as Element).closest('a');
		const href = anchor?.getAttribute('href') ?? anchor?.getAttribute('xlink:href');
		if (!href || !/^https?:\/\//i.test(href)) return;
		event.preventDefault();
		if (isFriday()) void app.openExternalUrl(href);
		else window.open(href, '_blank', 'noopener,noreferrer');
	};
	return (
		<section className="preview-panel" aria-label="Diagram preview">
			<div className="panel-bar preview-bar">
				<span>Preview</span>
				<div className="preview-actions">
					<button aria-label="Zoom out" title="Zoom out" onClick={() => onZoomChange(zoom - 0.1)}>
						−
					</button>
					<output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
					<button aria-label="Zoom in" title="Zoom in" onClick={() => onZoomChange(zoom + 0.1)}>
						+
					</button>
					<button onClick={onFit}>Fit</button>
					<span className="divider" />
					<button disabled={!svg} onClick={onCopy}>
						Copy SVG
					</button>
					<button disabled={!svg} onClick={onSvg}>
						SVG
					</button>
					<button disabled={!svg} onClick={onPng}>
						PNG
					</button>
					<button disabled={!svg} onClick={onPrint}>
						Print
					</button>
				</div>
			</div>
			<div className="preview-scroll" data-testid="diagram-preview">
				{rendering && <div className="rendering">Rendering…</div>}
				{error ? (
					<div className="error-card" role="alert">
						<strong>Syntax or configuration error</strong>
						<pre>{error}</pre>
					</div>
				) : svg ? (
					<div
						ref={previewRef}
						className="diagram-output"
						style={{ transform: `scale(${zoom})` }}
						onClickCapture={openLink}
						dangerouslySetInnerHTML={{ __html: svg }}
					/>
				) : (
					<div className="empty-state">Write Mermaid source, then render the diagram.</div>
				)}
			</div>
		</section>
	);
}
