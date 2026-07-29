export type WidgetMetadata = {
	version: string;
	category: string;
	entry: string;
	[key: string]: unknown;
};

export type WidgetManifest = {
	title: string;
	description: string;
	metadata: WidgetMetadata;
};

export type PluginWidgetSource = {
	kind: 'plugin';
	pluginId: string;
	widgetId: string;
};

export type Widget = WidgetManifest & {
	id: string;
	source?: PluginWidgetSource;
};

export type WidgetSettings = {
	enabled: boolean;
};
