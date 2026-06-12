import type {
	ConnectorInput,
	ConnectorOAuthAuthorizationResult,
	ConnectorOAuthDefaults,
	ConnectorSettingsRecord,
} from '../../../shared/connector';

export abstract class Settings {
	abstract list(): ConnectorSettingsRecord;
	abstract get(id: string): ConnectorSettingsRecord;
	abstract save(connectors: ConnectorSettingsRecord): ConnectorSettingsRecord;
	abstract upsert(input: ConnectorInput): ConnectorSettingsRecord;
	abstract authorizeOAuth(
		input: ConnectorOAuthDefaults
	): Promise<ConnectorOAuthAuthorizationResult>;
}
