export { PluginRepository } from './repository';
export type {
	InstalledPlugin,
	PluginChannel,
	PluginIssue,
	PluginLanguage,
	PluginMcpServer,
	PluginProvider,
	PluginRepositoryOptions,
	PluginScanResult,
	PluginSkill,
	PluginTheme,
	PluginExtension,
} from './repository';
export { pluginManifestSchema } from './schema';
export type {
	PluginChannelContribution,
	PluginLanguageContribution,
	PluginManifest,
	PluginMcpServerContribution,
	PluginProviderContribution,
	PluginSkillContribution,
	PluginThemeContribution,
	PluginExtensionContribution,
} from './schema';
export { pluginsRoot } from './root';
export { installPlugins } from './install';
export { pluginSummary } from './summary';
