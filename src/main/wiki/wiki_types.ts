import type { WikiRunResult } from '../../shared/wiki_types';

export interface WikiSource {
	absolutePath: string;
	relativePath: string;
	content: string;
	hash: string;
}

export interface WikiPageUpdate {
	path: string;
	title: string;
	summary: string;
	content: string;
	sources: string[];
}

export interface WikiUpdate {
	pages: WikiPageUpdate[];
}

export interface WikiApplyResult {
	createdPages: number;
	updatedPages: number;
}

export interface WikiState {
	sources: Record<string, string>;
	lastRun?: WikiRunResult;
}
