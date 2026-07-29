import fs from 'node:fs';
import path from 'node:path';
import type { PublicProvider } from '../../shared/providers_definitions';
import type { PluginWidgetSource, Widget } from '../../shared/widget_types';
import { realPath } from '../shared/real_path';
import { pluginManifestSchema, type PluginManifest } from './schema';
import { pluginsRoot } from './root';

export interface InstalledPlugin {
	readonly directory: string;
	readonly manifest: PluginManifest;
}

export interface PluginIssue {
	readonly pluginId: string;
	readonly manifestPath: string;
	readonly code: 'invalid-json' | 'invalid-manifest' | 'invalid-entry' | 'provider-conflict';
	readonly message: string;
}

export interface PluginScanResult {
	readonly plugins: readonly InstalledPlugin[];
	readonly issues: readonly PluginIssue[];
}

export interface PluginProvider extends PublicProvider {
	readonly pluginId: string;
	readonly protocol: 'openai-compatible';
	readonly models: readonly { readonly id: string; readonly name: string }[];
}

export interface PluginWidget extends Widget {
	readonly source: PluginWidgetSource;
}

export interface PluginRepositoryOptions {
	readonly root?: string;
	readonly reservedProviderIds?: Iterable<string>;
}

export class PluginRepository {
	readonly root: string;
	private readonly reservedProviderIds: ReadonlySet<string>;

	constructor(options: PluginRepositoryOptions = {}) {
		this.root = options.root ?? pluginsRoot();
		this.reservedProviderIds = new Set(options.reservedProviderIds);
	}

	ensure(): void {
		fs.mkdirSync(this.root, { recursive: true });
	}

	scan(): PluginScanResult {
		this.ensure();
		const plugins: InstalledPlugin[] = [];
		const issues: PluginIssue[] = [];
		const providerIds = new Set(this.reservedProviderIds);
		const directories = fs
			.readdirSync(this.root, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.sort((left, right) => left.name.localeCompare(right.name));

		for (const directory of directories) {
			const pluginId = directory.name;
			const pluginDirectory = path.join(this.root, pluginId);
			const manifestPath = path.join(pluginDirectory, 'manifest.json');
			let rawManifest: unknown;
			try {
				rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as unknown;
			} catch (error) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-json',
					message: error instanceof Error ? error.message : 'Could not read the plugin manifest.',
				});
				continue;
			}

			const parsed = pluginManifestSchema.safeParse(rawManifest);
			if (!parsed.success || parsed.data.id !== pluginId) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-manifest',
					message: parsed.success
						? `Manifest id "${parsed.data.id}" must match folder "${pluginId}".`
						: parsed.error.issues.map((issue) => issue.message).join(' '),
				});
				continue;
			}

			const invalidWidget = parsed.data.contributes.widgets.find((widget) => {
				try {
					const entry = this.resolveEntry(pluginDirectory, widget.entry);
					return !fs.statSync(entry).isFile();
				} catch {
					return true;
				}
			});
			if (invalidWidget) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-entry',
					message: `Widget entry is missing or outside the plugin folder: ${invalidWidget.entry}`,
				});
				continue;
			}

			const conflictingProvider = parsed.data.contributes.providers.find((provider) =>
				providerIds.has(provider.id)
			);
			if (conflictingProvider) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'provider-conflict',
					message: `Provider id is already registered: ${conflictingProvider.id}`,
				});
				continue;
			}

			plugins.push({ directory: pluginDirectory, manifest: parsed.data });
			parsed.data.contributes.providers.forEach((provider) => providerIds.add(provider.id));
		}

		return { plugins, issues };
	}

	list(): readonly InstalledPlugin[] {
		return this.scan().plugins;
	}

	get(id: string): InstalledPlugin | undefined {
		return this.list().find((plugin) => plugin.manifest.id === id);
	}

	providers(): readonly PluginProvider[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes.providers.map((provider) => ({
				pluginId: plugin.manifest.id,
				id: provider.id,
				name: provider.name,
				baseUrl: provider.baseUrl,
				capabilities: 'Chat',
				protocol: provider.protocol,
				models: provider.models,
				...(provider.apiKeyUrl
					? {
							apiConfiguration: {
								credentialType: 'API key',
								apiKeyManagementUrl: provider.apiKeyUrl,
								configurationDocsUrl: null,
								authMethod: 'HTTP Bearer token',
								recommendedEnvVars: [],
								baseUrls: [provider.baseUrl],
								importantNotes: [],
							},
						}
					: {}),
			}))
		);
	}

	widgets(): readonly PluginWidget[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes.widgets.map((widget) => ({
				id: `${plugin.manifest.id}/${widget.id}`,
				title: widget.title,
				description: widget.description,
				metadata: {
					version: widget.version ?? plugin.manifest.version,
					category: widget.category,
					entry: widget.entry,
				},
				source: {
					kind: 'plugin' as const,
					pluginId: plugin.manifest.id,
					widgetId: widget.id,
				},
			}))
		);
	}

	resolveWidgetEntry(source: PluginWidgetSource): string {
		const plugin = this.get(source.pluginId);
		const widget = plugin?.manifest.contributes.widgets.find(
			(contribution) => contribution.id === source.widgetId
		);
		if (!plugin || !widget)
			throw new Error(`Plugin widget not found: ${source.pluginId}/${source.widgetId}`);
		const entry = this.resolveEntry(plugin.directory, widget.entry);
		if (!fs.statSync(entry).isFile())
			throw new Error(`Plugin widget entry not found: ${source.pluginId}/${source.widgetId}`);
		return entry;
	}

	private resolveEntry(pluginDirectory: string, entry: string): string {
		const root = realPath(pluginDirectory);
		const resolved = realPath(path.resolve(pluginDirectory, ...entry.split('/')));
		if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
			throw new Error(`Plugin entry escapes its folder: ${entry}`);
		return resolved;
	}
}
