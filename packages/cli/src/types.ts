import type { installPlugin } from './install.js';
import type { launchFriday } from './launch.js';

export interface CliDependencies {
	readonly install: typeof installPlugin;
	readonly launch: typeof launchFriday;
	readonly tui: () => Promise<void>;
}

export interface InstallOptions {
	readonly dataDir?: string;
	readonly force?: boolean;
}

export interface InstallResult {
	readonly id: string;
	readonly name: string;
	readonly version: string;
	readonly destination: string;
	readonly restartRequired: true;
}
