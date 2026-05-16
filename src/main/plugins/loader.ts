import { pathToFileURL } from 'node:url';
import { buildOpenClawConnectorApi } from './api-builder';
import type { ConnectorDiagnostic } from './manifest';
import type { ConnectorManifestRecord } from './discovery';
import {
	OpenClawConnectorRegistry,
	type ConnectorRegistrationMode,
} from './registry';
import type { OpenClawConnectorEntry } from './entry';

export interface LoadConnectorOptions {
	record: ConnectorManifestRecord;
	registry: OpenClawConnectorRegistry;
	mode: ConnectorRegistrationMode;
	importer?: ConnectorEntryImporter;
	pluginConfig?: Record<string, unknown>;
}

export type ConnectorEntryImporter = (source: string) => Promise<unknown>;

export interface LoadConnectorResult {
	ok: boolean;
	entry?: OpenClawConnectorEntry;
	diagnostics: ConnectorDiagnostic[];
}

export async function loadConnectorEntry(options: LoadConnectorOptions): Promise<LoadConnectorResult> {
	const diagnostics: ConnectorDiagnostic[] = [];
	const source = options.record.source;
	if (!source) {
		diagnostics.push({
			level: 'warn',
			code: 'runtime_entry_missing',
			pluginId: options.record.id,
			source: options.record.manifestPath,
			message: `Connector ${options.record.id} has no runtime entry.`,
		});
		return { ok: false, diagnostics };
	}

	try {
		const moduleValue = await (options.importer ?? defaultImporter)(source);
		const entry = resolveConnectorEntry(moduleValue);
		if (!entry) {
			diagnostics.push({
				level: 'error',
				code: 'runtime_entry_invalid',
				pluginId: options.record.id,
				source,
				message: `Connector ${options.record.id} runtime entry is invalid.`,
			});
			return { ok: false, diagnostics };
		}
		if (entry.id !== options.record.id) {
			diagnostics.push({
				level: 'error',
				code: 'runtime_entry_id_mismatch',
				pluginId: options.record.id,
				source,
				message: `Connector runtime id ${entry.id} does not match manifest id ${options.record.id}.`,
			});
			return { ok: false, entry, diagnostics };
		}
		const api = buildOpenClawConnectorApi({
			record: options.record,
			registry: options.registry,
			registrationMode: options.mode,
			pluginConfig: options.pluginConfig,
		});
		await entry.register(api);
		return { ok: true, entry, diagnostics };
	} catch (error) {
		diagnostics.push({
			level: 'error',
			code: 'runtime_entry_import_failed',
			pluginId: options.record.id,
			source,
			message: error instanceof Error ? error.message : 'Failed to load connector runtime entry.',
		});
		return { ok: false, diagnostics };
	}
}

function resolveConnectorEntry(moduleValue: unknown): OpenClawConnectorEntry | undefined {
	const candidates = [
		moduleValue,
		getObjectValue(moduleValue, 'default'),
		getObjectValue(moduleValue, 'entry'),
		getObjectValue(moduleValue, 'plugin'),
	];
	return candidates.find(isConnectorEntry);
}

function isConnectorEntry(value: unknown): value is OpenClawConnectorEntry {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as Partial<OpenClawConnectorEntry>;
	return (
		typeof candidate.id === 'string' &&
		typeof candidate.name === 'string' &&
		typeof candidate.description === 'string' &&
		typeof candidate.register === 'function'
	);
}

function getObjectValue(value: unknown, key: string): unknown {
	if (typeof value !== 'object' || value === null) return undefined;
	return (value as Record<string, unknown>)[key];
}

async function defaultImporter(source: string): Promise<unknown> {
	return import(pathToFileURL(source).href);
}
