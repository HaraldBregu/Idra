export interface LoadedSkill {
	id: string;
	name: string;
	canonicalRoot: string;
	instructions: string;
	trust: 'user-controlled';
	hash: string;
	resources: string[];
	warnings?: { code: string; message: string }[];
}

export interface FileToolState {
	toolName: string;
	path: string;
	directory: string;
}

export interface FileAccessContext {
	readDirectories: Set<string>;
	createdFiles: Set<string>;
}

import type { FileHistory } from '../history/types';

export interface RunContext {
	loadedSkills: LoadedSkill[];
	fileAccess: FileAccessContext;
	fileHistory: FileHistory;
}
