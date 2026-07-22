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

export type Widget = WidgetManifest & {
	id: string;
};

export type WidgetSettings = {
	enabled: boolean;
};
