import type { MermaidConfig, RenderResult } from 'mermaid';

export type AppTheme = 'auto' | 'default' | 'base' | 'dark' | 'forest' | 'neutral' | 'neo' | 'neo-dark' | 'redux' | 'redux-dark' | 'redux-color' | 'redux-dark-color';
export type DiagramLook = 'classic' | 'handDrawn' | 'neo';
export type DiagramLayout = 'auto' | 'dagre' | 'elk' | 'elk.layered' | 'elk.stress' | 'elk.force' | 'elk.mrtree' | 'elk.sporeOverlap' | 'tidy-tree';
export type EditorTab = 'source' | 'config';
export type ViewMode = 'split' | 'source' | 'preview';

export interface DiagramState {
	source: string;
	configText: string;
	theme: AppTheme;
	look: DiagramLook;
	layout: DiagramLayout;
	live: boolean;
	view: ViewMode;
}

export interface DiagramOptions {
	config: MermaidConfig;
	theme: Exclude<AppTheme, 'auto'>;
	look: DiagramLook;
	layout: DiagramLayout;
}

export interface DiagramResult {
	svg: string;
	type: string;
	bindFunctions?: RenderResult['bindFunctions'];
}

export interface Example {
	name: string;
	source: string;
}
