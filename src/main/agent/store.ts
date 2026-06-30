import { Service } from 'typedi';
import { Config } from './core/config';
import { SettingsStore } from './core/store.settings';
import { CronStore } from './cron/store';
import { StoreSkills } from './core/skills.store';
import { HealthStore } from './health/store';
import { McpStore } from './mcp/store';
import { agentLocation } from './shared/location';

@Service()
export class Store {
	private readonly config: Config;
	readonly settings: SettingsStore;
	readonly cron: CronStore;
	readonly skills: StoreSkills;
	readonly health: HealthStore;
	readonly mcp: McpStore;

	constructor() {
		this.config = new Config({ location: agentLocation() });
		this.settings = new SettingsStore(this.config);
		this.cron = new CronStore(this.config);
		this.skills = new StoreSkills(this.config);
		this.health = new HealthStore(this.config);
		this.mcp = new McpStore(this.config);
	}
}
