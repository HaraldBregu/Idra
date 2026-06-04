import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { LoggerService } from '../observability';
import type {
	ConnectorConnectInput,
	ConnectorConfig,
	ConnectorOAuthCredential,
	ConnectorView,
} from '../../shared/connector';
import {
	readOptionalString,
	requireObject,
	sanitizeInput,
	serverLabelFromName,
} from './components/validation';
import {
	cloneValue,
	redactConnectorSecrets,
	toConnectorView,
} from './components/runtime';
import { ConnectorRepository } from './components/repository';
import type { ConnectorsServiceOptions } from './types';

export class ConnectorsService {
	private readonly repository: ConnectorRepository;
	private readonly options: ConnectorsServiceOptions;

	constructor(logger: LoggerService, options?: ConnectorsServiceOptions) {
		this.options = options ?? {};
		this.repository = new ConnectorRepository(logger);
	}

	list(): ConnectorView[] {
		return this.connectors().map((connector) => toConnectorView(connector, this.env()));
	}

	get(id: string): ConnectorConfig {
		return redactConnectorSecrets(this.repository.get(id));
	}

	async save(input: unknown): Promise<ConnectorConfig[]> {
		if (!Array.isArray(input)) throw new Error('Connector settings must be an array.');
		const next: ConnectorConfig[] = [];
		for (const item of input) {
			next.push(await this.connectorFromInput(item));
		}
		this.repository.write(next);
		return next.map(redactConnectorSecrets);
	}

	getConnectorSettings(): ConnectorConfig[] {
		return this.connectors().map(redactConnectorSecrets);
	}

	listStored(): ConnectorConfig[] {
		return this.connectors();
	}

	getStored(id: string): ConnectorConfig {
		return this.repository.get(id);
	}

	replaceStored(connector: ConnectorConfig): void {
		this.repository.replace(connector);
	}

	private connectors(): ConnectorConfig[] {
		return this.repository.list();
	}

	private env(): NodeJS.ProcessEnv {
		return this.options.env ?? process.env;
	}

	private async connectorFromInput(input: unknown): Promise<ConnectorConfig> {
		const raw = requireObject(input, 'Connector configuration');
		const now = new Date().toISOString();
		const id = readOptionalString(raw, 'id')?.trim() || randomUUID();
		const createdAt = readOptionalString(raw, 'createdAt')?.trim() || now;
		const sanitized = sanitizeInput(input);
		const connector: ConnectorConfig = {
			id,
			name: sanitized.name,
			connectorId: sanitized.connectorId,
			serverLabel: sanitized.serverLabel ?? serverLabelFromName(sanitized.name),
			serverDescription: sanitized.serverDescription,
			serverUrl: sanitized.serverUrl,
			enabled: sanitized.enabled ?? true,
			authorization: sanitized.authorization ?? '',
			mcp: cloneValue(sanitized.mcp),
			oauth: undefined,
			requireApproval: sanitized.requireApproval ?? 'always',
			allowedTools: sanitized.allowedTools ?? [],
			deferLoading: sanitized.deferLoading ?? false,
			tools: [],
			createdAt,
			updatedAt: now,
		};
		return connector;
	}
}
