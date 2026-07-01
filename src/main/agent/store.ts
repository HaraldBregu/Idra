import { Service } from 'typedi';
import { Config } from './core/config';
import { SettingsStore, type SettingsSchema } from './core/store.settings';
import { CronStore } from './cron/store';
import { SkillsStore, type SkillsSchema } from './skills/store';
import { HealthStore } from './health/store';
import { McpStore, type ConnectorStoreSchema } from './mcp/store';
import type { PersistedCronState } from './cron/cron';
import type { HealthSettings } from './health/types';

const DEFAULT_AGENT_SETTINGS: SettingsSchema = {
	providerId: undefined,
	modelId: undefined,
};

const DEFAULT_CRON_STATE: PersistedCronState = { schedules: [] };
const DEFAULT_SKILLS: SkillsSchema = { skills: {} };

const DEFAULT_HEALTH_SETTINGS: HealthSettings = {
	every: '30m',
	target: 'last',
	directPolicy: 'allow',
	lightContext: true,
	isolatedSession: true,
	skipWhenBusy: true,
};

const DEFAULT_MCP_SETTINGS: ConnectorStoreSchema = { mcpServers: {}, oauth: {} };

@Service()
export class Store {
	readonly settings: SettingsStore;
	readonly cron: CronStore;
	readonly skills: SkillsStore;
	readonly health: HealthStore;
	readonly mcp: McpStore;

	constructor(readonly config: Config) {
		this.settings = new SettingsStore(this.config, DEFAULT_AGENT_SETTINGS);
		this.cron = new CronStore(this.config, DEFAULT_CRON_STATE);
		this.skills = new SkillsStore(this.config, DEFAULT_SKILLS);
		this.health = new HealthStore(this.config, DEFAULT_HEALTH_SETTINGS);
		this.mcp = new McpStore(this.config, DEFAULT_MCP_SETTINGS);
	}
}
