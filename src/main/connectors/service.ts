import type { ConnectorRecord } from '../../shared/connectors';
import type { LoggerService } from '../observability';
import { ConnectorRepository } from './repository';

type ConnectorEntry = ConnectorRecord[string];

export class ConnectorsService {
	private readonly repository: ConnectorRepository;

	constructor(logger: LoggerService) {
		this.repository = new ConnectorRepository(logger);
	}

	list(): ConnectorRecord {
		return this.repository.list();
	}

	get(id: string): ConnectorRecord {
		return this.repository.get(id);
	}

	save(input: unknown): ConnectorRecord {
		if (!Array.isArray(input)) throw new Error('Connector settings must be an array.');
		const next: ConnectorRecord = {};
		for (const item of input) {
			const connector = connectorFromInput(item);
			if (connector) next[connector.id] = connector.entry;
		}
		this.repository.write(next);
		return this.list();
	}

	upsert(input: unknown): ConnectorRecord {
		const current = this.repository.list();
		const connector = connectorFromInput(input);
		if (!connector) throw new Error('Connector serverUrl is required.');
		const existing = current[connector.id];
		this.repository.write({
			...current,
			[connector.id]: {
				...connector.entry,
				created_at: existing?.created_at ?? connector.entry.created_at,
			},
		});
		return this.get(connector.id);
	}

	getConnectorSettings(): ConnectorRecord {
		return this.list();
	}
}

function connectorFromInput(input: unknown): { id: string; entry: ConnectorEntry } | undefined {
	const raw = readRecord(input);
	if (!raw) throw new Error('Connector configuration is required.');
	const now = new Date().toISOString();
	const name = readString(raw.name) ?? '';
	const connectorId = readString(raw.connectorId) ?? '';
	const serverLabel = readString(raw.serverLabel) ?? serverLabelFromName(name);
	const serverUrl = readString(raw.serverUrl);
	const authorization = readString(raw.authorization);
	if (!name) throw new Error('Connector name is required.');
	if (!connectorId) throw new Error('Connector id is required.');
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}
	if (!serverUrl) {
		if (authorization) throw new Error(`Connector serverUrl is required before storing ${name}.`);
		return undefined;
	}
	const id = readString(raw.id) ?? storeKeyPart(serverLabel) ?? storeKeyPart(connectorId) ?? connectorId;
	const requireApproval = readString(raw.requireApproval) === 'never' ? 'never' : undefined;
	return {
		id,
		entry: {
			type: 'mcp',
			server_label: serverLabel,
			server_url: serverUrl,
			...(readString(raw.serverDescription) ? { server_description: readString(raw.serverDescription) } : {}),
			...(authorization ? { authorization } : {}),
			...(requireApproval ? { require_approval: requireApproval } : {}),
			...(raw.deferLoading === true ? { defer_loading: true } : {}),
			...(raw.enabled === false ? { enabled: false } : {}),
			created_at: readString(raw.createdAt) ?? now,
			updated_at: now,
		},
	};
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === 'object' && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function readString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function storeKeyPart(value: string): string | undefined {
	const key = value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '');
	return key || undefined;
}
