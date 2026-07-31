import fs from 'node:fs';
import path from 'node:path';
import type { PublicProvider } from '../../shared/provider_types';
import type { PluginExtensionSource, Extension } from '../../shared/extension_types';
import { realPath } from '../shared/real_path';
import {
	pluginManifestSchema,
	type PluginManifest,
	type PluginMcpServerContribution,
} from './schema';
import { readPluginProvider } from './provider';
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

export interface PluginSkill {
	readonly pluginId: string;
	readonly id: string;
	readonly directory: string;
	readonly skillPath: string;
}

export type PluginMcpServer = PluginMcpServerContribution & {
	readonly pluginId: string;
};

export interface PluginLanguage {
	readonly pluginId: string;
	readonly id: string;
	readonly name: string;
	readonly file: string;
}

export interface PluginTheme {
	readonly pluginId: string;
	readonly id: string;
	readonly name: string;
	readonly file: string;
}

export interface PluginChannel {
	readonly pluginId: string;
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly entry: string;
}

export interface PluginExtension extends Extension {
	readonly source: PluginExtensionSource;
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

			const invalidExtension = parsed.data.contributes.extensions.find((extension) => {
				try {
					const entry = this.resolveEntry(pluginDirectory, extension.entry);
					return !fs.statSync(entry).isFile();
				} catch {
					return true;
				}
			});
			if (invalidExtension) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-entry',
					message: `Extension entry is missing or outside the plugin folder: ${invalidExtension.entry}`,
				});
				continue;
			}

			const invalidSkill = parsed.data.contributes.skills.find((skill) => {
				try {
					const skillPath = this.resolveEntry(pluginDirectory, `${skill.path}/SKILL.md`);
					return !fs.statSync(skillPath).isFile();
				} catch {
					return true;
				}
			});
			if (invalidSkill) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-entry',
					message: `Skill is missing SKILL.md or outside the plugin folder: ${invalidSkill.path}`,
				});
				continue;
			}

			const fileContributions = [
				...parsed.data.contributes.languages.map((item) => ({ kind: 'Language', ...item })),
				...parsed.data.contributes.themes.map((item) => ({ kind: 'Theme', ...item })),
				...parsed.data.contributes.channels.map((item) => ({
					kind: 'Channel',
					...item,
				})),
			];
			const invalidFile = fileContributions.find((item) => {
				try {
					return !fs.statSync(this.resolveEntry(pluginDirectory, item.entry)).isFile();
				} catch {
					return true;
				}
			});
			if (invalidFile) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-entry',
					message: `${invalidFile.kind} entry is missing or outside the plugin folder: ${invalidFile.entry}`,
				});
				continue;
			}

			let invalidProvider: string | undefined;
			for (const provider of parsed.data.contributes.providers) {
				try {
					readPluginProvider(pluginDirectory, provider.id);
				} catch (error) {
					invalidProvider =
						error instanceof Error ? error.message : `Provider is invalid: ${provider.id}`;
					break;
				}
			}
			if (invalidProvider) {
				issues.push({
					pluginId,
					manifestPath,
					code: 'invalid-entry',
					message: invalidProvider,
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

	skills(): readonly PluginSkill[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes.skills.map((skill) => {
				const directory = this.resolveEntry(plugin.directory, skill.path);
				return {
					pluginId: plugin.manifest.id,
					id: skill.id,
					directory,
					skillPath: this.resolveEntry(plugin.directory, `${skill.path}/SKILL.md`),
				};
			})
		);
	}

	mcpServers(): readonly PluginMcpServer[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes.mcpServers.map((server) => ({
				pluginId: plugin.manifest.id,
				...server,
			}))
		);
	}

	languages(): readonly PluginLanguage[] {
		return this.fileCatalog<PluginLanguage>('languages');
	}

	themes(): readonly PluginTheme[] {
		return this.fileCatalog<PluginTheme>('themes');
	}

	channels(): readonly PluginChannel[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes.channels.map((channel) => ({
				pluginId: plugin.manifest.id,
				id: channel.id,
				name: channel.name,
				description: channel.description,
				entry: this.resolveEntry(plugin.directory, channel.entry),
			}))
		);
	}

	extensions(): readonly PluginExtension[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes.extensions.map((extension) => ({
				id: `${plugin.manifest.id}/${extension.id}`,
				title: extension.title,
				description: extension.description,
				metadata: {
					version: extension.version ?? plugin.manifest.version,
					category: extension.category,
					entry: extension.entry,
				},
				source: {
					kind: 'plugin' as const,
					pluginId: plugin.manifest.id,
					extensionId: extension.id,
				},
			}))
		);
	}

	resolveExtensionEntry(source: PluginExtensionSource): string {
		const plugin = this.get(source.pluginId);
		const extension = plugin?.manifest.contributes.extensions.find(
			(contribution) => contribution.id === source.extensionId
		);
		if (!plugin || !extension)
			throw new Error(`Plugin extension not found: ${source.pluginId}/${source.extensionId}`);
		const entry = this.resolveEntry(plugin.directory, extension.entry);
		if (!fs.statSync(entry).isFile())
			throw new Error(`Plugin extension entry not found: ${source.pluginId}/${source.extensionId}`);
		return entry;
	}

	private fileCatalog<
		TResult extends { pluginId: string; id: string; name: string; file: string },
	>(kind: 'languages' | 'themes'): readonly TResult[] {
		return this.list().flatMap((plugin) =>
			plugin.manifest.contributes[kind].map(
				(contribution) =>
					({
						pluginId: plugin.manifest.id,
						id: contribution.id,
						name: contribution.name,
						file: this.resolveEntry(plugin.directory, contribution.entry),
					}) as TResult
			)
		);
	}

	private resolveEntry(pluginDirectory: string, entry: string): string {
		const root = realPath(pluginDirectory);
		const resolved = realPath(path.resolve(pluginDirectory, ...entry.split('/')));
		if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
			throw new Error(`Plugin entry escapes its folder: ${entry}`);
		return resolved;
	}
}
