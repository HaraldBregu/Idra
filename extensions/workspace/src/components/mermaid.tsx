import mermaid from 'mermaid';
import { useEffect, useId, useState } from 'react';

interface MermaidPreviewProps {
	content: string;
	isDark: boolean;
}

export function MermaidPreview({ content, isDark }: MermaidPreviewProps) {
	const renderId = `mermaid-${useId().replaceAll(':', '')}`;
	const [svg, setSvg] = useState('');
	const [error, setError] = useState('');

	useEffect(() => {
		let active = true;
		setSvg('');
		setError('');
		if (!content.trim()) return () => undefined;

		mermaid.initialize({
			securityLevel: 'strict',
			startOnLoad: false,
			suppressErrorRendering: true,
			theme: isDark ? 'dark' : 'default',
		});
		void mermaid
			.render(renderId, content)
			.then((result) => {
				if (active) setSvg(result.svg);
			})
			.catch((renderError: unknown) => {
				if (!active) return;
				setError(renderError instanceof Error ? renderError.message : 'Unable to render diagram.');
			});

		return () => {
			active = false;
		};
	}, [content, isDark, renderId]);

	if (!content.trim()) {
		return (
			<div className="flex min-h-full items-center justify-center px-6 text-sm text-muted-foreground">
				Add Mermaid syntax in the source view to create a diagram.
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-full items-center justify-center px-6 text-center">
				<p className="max-w-xl whitespace-pre-wrap text-sm text-destructive">{error}</p>
			</div>
		);
	}

	if (!svg) {
		return (
			<div className="flex min-h-full items-center justify-center text-sm text-muted-foreground">
				Rendering diagram...
			</div>
		);
	}

	return (
		<div
			className="flex min-h-full items-center justify-center overflow-auto p-6 [&_svg]:h-auto [&_svg]:max-w-full"
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
