import type { SmtpProvider } from '../../shared/email_types';
import type { StoredBotProvider } from '../../shared/channels_types';
import type { StoredProvider } from '../../shared/provider_types';
import type { StorageConfig } from '../../shared/storage_types';
import type { McpRecord } from '../mcp/mcp_types';

export type StoredStorage = Omit<StorageConfig, 'forcePathStyle'> & {
	baseUrl: string;
	forcePathStyle?: boolean;
};

export type ProvidersStoreState = {
	databases: StoredProvider[];
	search_engines: StoredProvider[];
	smtp: SmtpProvider[];
	storages: StoredStorage[];
	channels: StoredBotProvider[];
	mcp_servers: McpRecord[];
};
