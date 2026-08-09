import type { AppTheme, DiagramLayout, DiagramLook } from './types';

export const themeChoices = [
	'auto',
	'default',
	'base',
	'dark',
	'forest',
	'neutral',
	'neo',
	'neo-dark',
	'redux',
	'redux-dark',
	'redux-color',
	'redux-dark-color',
	'null',
] as const satisfies readonly AppTheme[];

export const lookChoices = [
	'classic',
	'handDrawn',
	'neo',
] as const satisfies readonly DiagramLook[];

export const layoutChoices = [
	'auto',
	'dagre',
	'elk',
	'elk.stress',
	'elk.force',
	'elk.mrtree',
	'elk.sporeOverlap',
	'cose-bilkent',
	'tidy-tree',
] as const satisfies readonly DiagramLayout[];
