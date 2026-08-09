import mermaid from 'mermaid';

import { pluginsReady } from './plugins';
import type { DiagramOptions, DiagramResult } from './types';

let renderId = 0;
let queue = Promise.resolve();

export function renderDiagram(source: string, options: DiagramOptions): Promise<DiagramResult> {
	const job = queue.then(async () => {
		await pluginsReady;
		mermaid.initialize({
			...options.config,
			startOnLoad: false,
			securityLevel: 'strict',
			suppressErrorRendering: true,
			theme: options.theme,
			look: options.look,
			layout: options.layout,
		});
		const parsed = await mermaid.parse(source);
		const rendered = await mermaid.render(`friday-diagram-${++renderId}`, source);
		return {
			svg: rendered.svg,
			type: rendered.diagramType ?? parsed.diagramType,
			bindFunctions: rendered.bindFunctions,
		};
	});
	queue = job.then(
		() => undefined,
		() => undefined
	);
	return job;
}
