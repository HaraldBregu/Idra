import { Service } from 'typedi';
import { Config } from './core/config';
import { SettingsStore } from './core/store.settings';
import { CronStore } from './cron/store';
import { SkillsStore } from './skills/store';
import { HealthStore } from './health/store';
import { McpStore } from './mcp/store';

@Service()
export class Store {
	readonly settings: SettingsStore;
	readonly cron: CronStore;
	readonly skills: SkillsStore;
	readonly health: HealthStore;
	readonly mcp: McpStore;

	constructor(private readonly config: Config) {
		this.settings = new SettingsStore(this.config);
		this.cron = new CronStore(this.config);
		this.skills = new SkillsStore(this.config);
		this.health = new HealthStore(this.config);
		this.mcp = new McpStore(this.config);
	}
}
