import { existsSync, lstatSync, readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import {
	CONNECTOR_MANIFEST_FILENAME,
	loadConnectorManifestFile,
	type ConnectorDiagnostic,
	type ConnectorManifest,
	type ConnectorOrigin,
} from './manifest';

export const DEFAULT_CONNECTOR_ENTRY_CANDIDATES = [
	'index.ts',
	'index.js',
	'index.mts',
	'index.mjs',
	'channel-entry.ts',
	'channel-entry.js',
] as const;

const IGNORED_SCAN_DIRS = new Set([
	'.git',
	'.hg',
	'.svn',
	'.cache',
	'.turbo',
	'build',
	'coverage',
	'dist',
	'node_modules',
]);

export interface ConnectorDiscoverySource {
	rootDir: string;
	origin: ConnectorOrigin;
	workspaceDir?: string;
}

export interface ConnectorManifestRecord {
	id: string;
	manifest: ConnectorManifest;
	manifestPath: string;
	rootDir: string;
	origin: ConnectorOrigin;
	source?: string;
	workspaceDir?: string;
}

export interface ConnectorDiscoveryResult {
	records: ConnectorManifestRecord[];
	diagnostics: ConnectorDiagnostic[];
}

export interface DiscoverConnectorManifestsOptions {
	roots: ConnectorDiscoverySource[];
	maxDepth?: number;
	ownershipUid?: number | null;
	entryCandidates?: readonly string[];
}

export function discoverConnectorManifests(
	options: DiscoverConnectorManifestsOptions
): ConnectorDiscoveryResult {
	const diagnostics: ConnectorDiagnostic[] = [];
	const records: ConnectorManifestRecord[] = [];
	const seen = new Set<string>();
	const maxDepth = options.maxDepth ?? 6;
	const entryCandidates = options.entryCandidates ?? DEFAULT_CONNECTOR_ENTRY_CANDIDATES;

	for (const root of options.roots) {
		const rootDir = path.resolve(root.rootDir);
		if (!existsSync(rootDir)) continue;
		const manifestPaths = findManifestPaths(rootDir, maxDepth, diagnostics);
		for (const manifestPath of manifestPaths) {
			const realManifestPath = safeRealpath(manifestPath);
			if (realManifestPath && seen.has(realManifestPath)) continue;
			if (realManifestPath) seen.add(realManifestPath);

			if (isUnsafeCandidate({ rootDir, source: manifestPath, origin: root.origin, diagnostics, ownershipUid: options.ownershipUid })) {
				continue;
			}
			const loaded = loadConnectorManifestFile(manifestPath);
			diagnostics.push(...loaded.diagnostics);
			if (!loaded.ok) continue;

			const pluginRootDir = path.dirname(loaded.manifestPath);
			const source = resolveRuntimeSource(loaded.manifest, pluginRootDir, entryCandidates);
			if (
				source &&
				isUnsafeCandidate({
					rootDir: pluginRootDir,
					source,
					origin: root.origin,
					diagnostics,
					ownershipUid: options.ownershipUid,
					pluginId: loaded.manifest.id,
				})
			) {
				continue;
			}

			records.push({
				id: loaded.manifest.id,
				manifest: loaded.manifest,
				manifestPath: loaded.manifestPath,
				rootDir: pluginRootDir,
				origin: root.origin,
				source,
				workspaceDir: root.workspaceDir,
			});
		}
	}

	return { records, diagnostics };
}

export function isPathInside(parentPath: string, candidatePath: string): boolean {
	const relative = path.relative(parentPath, candidatePath);
	return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function findManifestPaths(
	rootDir: string,
	maxDepth: number,
	diagnostics: ConnectorDiagnostic[]
): string[] {
	const output: string[] = [];
	const visit = (dir: string, depth: number): void => {
		if (depth < 0) return;
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch (error) {
			diagnostics.push({
				level: 'warn',
				code: 'discovery_scan_failed',
				source: dir,
				message: error instanceof Error ? error.message : 'Failed to scan connector directory.',
			});
			return;
		}
		for (const entry of entries) {
			if (IGNORED_SCAN_DIRS.has(entry.name)) continue;
			const fullPath = path.join(dir, entry.name);
			if (entry.name === CONNECTOR_MANIFEST_FILENAME) {
				output.push(fullPath);
				continue;
			}
			if (entry.isDirectory()) visit(fullPath, depth - 1);
		}
	};
	visit(rootDir, maxDepth);
	return output;
}

function resolveRuntimeSource(
	manifest: ConnectorManifest,
	rootDir: string,
	entryCandidates: readonly string[]
): string | undefined {
	if (manifest.runtimeEntry) return path.resolve(rootDir, manifest.runtimeEntry);
	for (const candidate of entryCandidates) {
		const fullPath = path.join(rootDir, candidate);
		if (existsSync(fullPath)) return fullPath;
	}
	return undefined;
}

function isUnsafeCandidate(params: {
	rootDir: string;
	source: string;
	origin: ConnectorOrigin;
	diagnostics: ConnectorDiagnostic[];
	ownershipUid?: number | null;
	pluginId?: string;
}): boolean {
	const rootReal = safeRealpath(params.rootDir);
	const sourceReal = safeRealpath(params.source);
	if (!rootReal || !sourceReal) {
		params.diagnostics.push({
			level: 'warn',
			code: 'path_stat_failed',
			pluginId: params.pluginId,
			source: params.source,
			message: `Blocked connector candidate because a path could not be resolved: ${params.source}`,
		});
		return true;
	}
	if (!isPathInside(rootReal, sourceReal)) {
		params.diagnostics.push({
			level: 'warn',
			code: 'source_escapes_root',
			pluginId: params.pluginId,
			source: params.source,
			message: `Blocked connector candidate because source escapes connector root: ${params.source}`,
			details: { rootRealPath: rootReal, sourceRealPath: sourceReal },
		});
		return true;
	}

	if (process.platform === 'win32') return false;
	for (const target of [params.rootDir, params.source]) {
		const issue = checkPathPermissions(target, params.origin, params.ownershipUid);
		if (!issue) continue;
		params.diagnostics.push({
			level: 'warn',
			code: issue.code,
			pluginId: params.pluginId,
			source: target,
			message: issue.message,
			details: issue.details,
		});
		return true;
	}
	return false;
}

function checkPathPermissions(
	target: string,
	origin: ConnectorOrigin,
	ownershipUid?: number | null
): { code: string; message: string; details?: Record<string, unknown> } | null {
	let stat;
	try {
		stat = lstatSync(target).isSymbolicLink() ? statSync(target) : statSync(target);
	} catch {
		return {
			code: 'path_stat_failed',
			message: `Blocked connector candidate because path could not be statted: ${target}`,
		};
	}
	const mode = stat.mode & 0o777;
	if (origin === 'bundled' && (mode & 0o002) !== 0) {
		return {
			code: 'path_world_writable',
			message: `Blocked bundled connector candidate because path is world-writable: ${target}`,
			details: { mode },
		};
	}
	const expectedUid = ownershipUid ?? currentUid();
	if (
		origin !== 'bundled' &&
		expectedUid !== null &&
		typeof stat.uid === 'number' &&
		stat.uid !== expectedUid &&
		stat.uid !== 0
	) {
		return {
			code: 'path_suspicious_ownership',
			message: `Blocked connector candidate because path ownership is suspicious: ${target}`,
			details: { foundUid: stat.uid, expectedUid },
		};
	}
	return null;
}

function safeRealpath(target: string): string | null {
	try {
		return realpathSync(target);
	} catch {
		return null;
	}
}

function currentUid(): number | null {
	if (process.platform === 'win32') return null;
	if (typeof process.getuid !== 'function') return null;
	return process.getuid();
}
