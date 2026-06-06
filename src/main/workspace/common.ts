import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import type { WorkspaceFileName } from './types';

export const DEFAULT_AGENTS_FILENAME = 'AGENTS.md';
export const DEFAULT_SOUL_FILENAME = 'SOUL.md';
export const DEFAULT_TOOLS_FILENAME = 'TOOLS.md';
export const DEFAULT_IDENTITY_FILENAME = 'IDENTITY.md';
export const DEFAULT_USER_FILENAME = 'USER.md';
export const DEFAULT_HEARTBEAT_FILENAME = 'HEARTBEAT.md';
export const DEFAULT_BOOTSTRAP_FILENAME = 'BOOTSTRAP.md';
export const DEFAULT_MEMORY_FILENAME = 'MEMORY.md';

export const WORKSPACE_CONTEXT_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_TOOLS_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
	DEFAULT_BOOTSTRAP_FILENAME,
	DEFAULT_MEMORY_FILENAME,
] as const;

export const SEEDED_WORKSPACE_FILE_NAMES = [
	DEFAULT_AGENTS_FILENAME,
	DEFAULT_SOUL_FILENAME,
	DEFAULT_TOOLS_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
	DEFAULT_HEARTBEAT_FILENAME,
] as const;

export const DEFAULT_WORKSPACE_CONTEXT_MAX_CHARS = 12_000;
export const DEFAULT_WORKSPACE_CONTEXT_TOTAL_MAX_CHARS = 60_000;
export const MAX_WORKSPACE_CONTEXT_FILE_BYTES = 2 * 1024 * 1024;

export const BUNDLED_TEMPLATES: Record<string, string> = Object.fromEntries(
	[
		...Object.entries(
			import.meta.glob('../../../../resources/agent/templates/*.md', {
				query: '?raw',
				eager: true,
				import: 'default',
			}) as Record<string, string>
		),
	].map(([templatePath, content]) => [path.basename(templatePath), stripFrontMatter(content)])
);

export const FALLBACK_TEMPLATE_DIRS = [
	path.resolve(process.cwd(), 'resources', 'agent', 'templates'),
];

export const workspaceFileNames = new Set<string>(WORKSPACE_CONTEXT_FILE_NAMES);

export const PROFILE_FILE_NAMES = [
	DEFAULT_SOUL_FILENAME,
	DEFAULT_IDENTITY_FILENAME,
	DEFAULT_USER_FILENAME,
] as const satisfies readonly WorkspaceFileName[];

export const CONTEXT_FILE_PROMPT_ORDER = new Map<WorkspaceFileName, number>([
	[DEFAULT_AGENTS_FILENAME, 10],
	[DEFAULT_SOUL_FILENAME, 20],
	[DEFAULT_IDENTITY_FILENAME, 30],
	[DEFAULT_USER_FILENAME, 40],
	[DEFAULT_TOOLS_FILENAME, 50],
	[DEFAULT_BOOTSTRAP_FILENAME, 60],
	[DEFAULT_MEMORY_FILENAME, 70],
	[DEFAULT_HEARTBEAT_FILENAME, 80],
]);

export const execFileAsync = promisify(execFile);

export function stripFrontMatter(content: string): string {
	if (!content.startsWith('---')) return content;
	const endIndex = content.indexOf('\n---', 3);
	if (endIndex === -1) return content;
	return content.slice(endIndex + '\n---'.length).replace(/^\s+/, '');
}
