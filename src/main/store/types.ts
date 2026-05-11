import { Provider } from "../../shared/providers";
import { Service } from "../../shared/service";
import { CronTask } from "../../shared/cron";
import { Channel } from "../../shared/channels";

export interface StoreSchema {
	providers: Provider[];
	service: Service;
	cronTasks: CronTask[];
	channel: Channel;
}

export type SettingsStore = {
	get<TKey extends keyof StoreSchema>(key: TKey): StoreSchema[TKey];
	get(key: string): unknown;
	set<TKey extends keyof StoreSchema>(key: TKey, value: StoreSchema[TKey]): void;
	set(key: string, value: unknown): void;
	delete: (key: string) => void;
};
