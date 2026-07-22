export type WidgetConfiguration = {
	id: string;
};

export type WidgetManifest = {
	name: string;
	description: string;
	metadata: Record<string, unknown>;
};

export type Widget = WidgetConfiguration & WidgetManifest;

export type WidgetsSettings = {
	widgets: WidgetConfiguration[];
};
