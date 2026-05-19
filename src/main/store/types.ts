import { Provider } from "../../shared/providers";
import { Service } from "../../shared/service";
import { CronTask } from "../../shared/cron";
import type { CronStoreState } from "../cron/core/cron.types";
import type { FridayCronStoreState } from "../cron/friday/store";
import type { HeartbeatStoreState } from "../../shared/heartbeat";
import { Channel } from "../../shared/channels";
import { ConnectorConfig } from "../../shared/connectors";
import type { AppPermissionSettings } from "../../shared/app-permissions";
import type { AppSettings } from "../../shared/app-settings";

export interface StoreSchema {
	providers: Provider[];
	service: Service;
	cronTasks: CronTask[];
	cronScheduler: CronStoreState;
	fridayCron: FridayCronStoreState;
	heartbeat: HeartbeatStoreState;
	channel: Channel;
	connectors: ConnectorConfig[];
	appPermissions: AppPermissionSettings;
	appSettings: AppSettings;
}

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
