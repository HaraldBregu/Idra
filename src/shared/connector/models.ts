import type { OpenAiConnectorId } from '../connectors';
import type { OpenAiConnectorCatalogEntry } from './types';
import type {
	ProviderConnectorDocsMetadata,
	ProviderConnectorRuntimeStatus,
} from './provider-docs';

export type ProviderConnectorId = OpenAiConnectorId;

export interface ProviderConnectorCatalogEntry
	extends Omit<OpenAiConnectorCatalogEntry, 'id' | 'docsPath' | 'docsLabel'>,
		ProviderConnectorDocsMetadata {
	readonly id: ProviderConnectorId;
	readonly docsPath: string;
	readonly docsLabel: string;
	readonly runtimeStatus: ProviderConnectorRuntimeStatus;
}
