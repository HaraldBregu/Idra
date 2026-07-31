import fs from 'node:fs';
import path from 'node:path';
import {
	providerInfoSchema,
	providerModelsSchema,
	type PluginProviderInfo,
	type PluginProviderModels,
} from './schema';

export interface PluginProviderFiles extends PluginProviderInfo {
	readonly models: PluginProviderModels;
}

export function readPluginProvider(pluginDirectory: string, id: string): PluginProviderFiles {
	const directory = path.join(pluginDirectory, 'providers', id);
	const info = providerInfoSchema.safeParse(readJson(id, path.join(directory, 'info.json')));
	if (!info.success) {
		throw new Error(
			`Provider "${id}" has an invalid info.json: ${info.error.issues.map((issue) => issue.message).join(' ')}`
		);
	}
	const models = providerModelsSchema.safeParse(readJson(id, path.join(directory, 'models.json')));
	if (!models.success) {
		throw new Error(
			`Provider "${id}" has an invalid models.json: ${models.error.issues.map((issue) => issue.message).join(' ')}`
		);
	}
	return { ...info.data, models: models.data };
}

function readJson(id: string, file: string): unknown {
	try {
		return JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Could not read the file.';
		throw new Error(`Provider "${id}" is missing ${path.basename(file)}: ${message}`);
	}
}
