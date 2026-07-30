export type ExtensionMetadata = {
	version: string;
	category: string;
	entry: string;
	[key: string]: unknown;
};

export type ExtensionManifest = {
	title: string;
	description: string;
	metadata: ExtensionMetadata;
};

export type PluginExtensionSource = {
	kind: 'plugin';
	pluginId: string;
	extensionId: string;
};

export type Extension = ExtensionManifest & {
	id: string;
	source?: PluginExtensionSource;
};

export type ExtensionSettings = {
	enabled: boolean;
};
