import { Service } from 'typedi';
import { Config } from './core/config';
import { SettingsStore } from './core/store.settings';
import { CronStore } from './core/store.cron';
import { StoreSkills } from './core/skills.store';
import { McpStore } from './mcp/store';
import { agentLocation } from './shared/location';

@Service()
export class Store {
	private readonly config = new Config({ location: agentLocation() });
	readonly settings = new SettingsStore(this.config);
	readonly cron = new CronStore(this.config);
	readonly skills = new StoreSkills(this.config);
	readonly mcp = new McpStore();
}
