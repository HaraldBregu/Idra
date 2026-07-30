export interface PluginSummary {
	id: string;
	name: string;
	version: string;
	description: string;
	contributions: number;
}

export interface PluginInstallSkipped {
	name: string;
	reason: string;
}

export interface PluginInstallResult {
	installed: PluginSummary[];
	skipped: PluginInstallSkipped[];
}
