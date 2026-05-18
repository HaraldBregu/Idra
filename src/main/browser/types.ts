export type BrowserProfileDriver = 'managed' | 'existing-session' | 'remote-cdp';

export interface BrowserProfile {
	name: string;
	driver: BrowserProfileDriver;
	cdpUrl?: string;
	cdpPort?: number;
	userDataDir?: string;
	attachOnly?: boolean;
	executablePath?: string;
}

export interface BrowserTab {
	targetId: string;
	alias: string;
	label?: string;
	title: string;
	url: string;
}

export interface BrowserStatus {
	running: boolean;
	profile: string;
	tabs: BrowserTab[];
}
