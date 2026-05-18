import { Provider } from "../../shared/providers";
import { Service } from "../../shared/service";
import { CronTask } from "../../shared/cron";
import type { CronStoreState } from "../cron/core/cron.types";
import type { OpenClawCronStoreState } from "../cron/openclaw/store";
import { Channel } from "../../shared/channels";
import { ConnectorConfig } from "../../shared/connectors";

export interface StoreSchema {
	providers: Provider[];
	service: Service;
	cronTasks: CronTask[];
	cronScheduler: CronStoreState;
	openClawCron: OpenClawCronStoreState;
	channel: Channel;
	connectors: ConnectorConfig[];
}

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
