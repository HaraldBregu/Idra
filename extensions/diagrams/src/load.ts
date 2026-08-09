import { app, isFriday } from '@friday/sdk';

import { defaultState } from './defaults';
import type { AppTheme, DiagramLayout, DiagramLook, DiagramState, ViewMode } from './types';

const themes: AppTheme[] = ['auto', 'default', 'base', 'dark', 'forest', 'neutral', 'neo', 'neo-dark', 'redux', 'redux-dark', 'redux-color', 'redux-dark-color'];
const looks: DiagramLook[] = ['classic', 'handDrawn', 'neo'];
const layouts: DiagramLayout[] = ['auto', 'dagre', 'elk', 'elk.layered', 'elk.stress', 'elk.force', 'elk.mrtree', 'elk.sporeOverlap'];
const views: ViewMode[] = ['split', 'source', 'preview'];

export async function loadState(): Promise<DiagramState> {
	let stored: unknown;
	try {
		stored = isFriday()
			? await app.getExtensionStoreValue('editor')
			: JSON.parse(localStorage.getItem('friday-diagrams-editor') ?? 'null');
	} catch {
		return defaultState;
	}
	if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return defaultState;
	const value = stored as Partial<DiagramState>;
	return {
		source: typeof value.source === 'string' ? value.source : defaultState.source,
		configText: typeof value.configText === 'string' ? value.configText : defaultState.configText,
		theme: themes.includes(value.theme as AppTheme) ? (value.theme as AppTheme) : defaultState.theme,
		look: looks.includes(value.look as DiagramLook) ? (value.look as DiagramLook) : defaultState.look,
		layout: layouts.includes(value.layout as DiagramLayout) ? (value.layout as DiagramLayout) : defaultState.layout,
		live: typeof value.live === 'boolean' ? value.live : defaultState.live,
		view: views.includes(value.view as ViewMode) ? (value.view as ViewMode) : defaultState.view,
	};
}
