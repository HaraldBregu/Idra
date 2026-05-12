import { randomUUID } from 'node:crypto';
import type { StoreService } from '../store';
import type { LoggerService } from '../logger';
import {
	OPENAI_CONNECTOR_CATALOG,
	getConnectorCatalogItem,
	isOpenAiConnectorId,
	type ConnectorConfig,
	type ConnectorInput,
	type ConnectorStatus,
	type ConnectorTestResult,
	type ConnectorTool,
	type ConnectorUpdateInput,
	type ConnectorView,
} from '../../shared/connectors';

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function knownTools(connector: ConnectorConfig): ConnectorTool[] {
	const catalog = getConnectorCatalogItem(connector.connectorId);
	const allowed = new Set(connector.allowedTools);
	const names = catalog?.tools.filter((tool) => allowed.size === 0 || allowed.has(tool)) ?? [];

	return names.map((name) => ({
		name,
		requiresApproval:
			connector.requireApproval === 'always' ||
			(connector.requireApproval === 'never_for_allowed_tools' && !allowed.has(name)),
	}));
}

function statusFor(connector: ConnectorConfig): ConnectorStatus {
	if (!connector.enabled) return 'disabled';
	if (connector.lastError) return 'error';
	if (!connector.authorization.trim()) return 'missing_auth';
	return 'configured';
}

function toView(connector: ConnectorConfig): ConnectorView {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		serverLabel: connector.serverLabel,
		enabled: connector.enabled,
		status: statusFor(connector),
		requireApproval: connector.requireApproval,
		allowedToolsCount: connector.allowedTools.length,
		toolsCount: connector.tools.length,
		deferLoading: connector.deferLoading,
		lastRefreshedAt: connector.lastRefreshedAt,
		lastError: connector.lastError,
	};
}

function sanitizeInput(input: ConnectorInput): ConnectorInput {
	const name = input.name.trim();
	const connectorId = input.connectorId.trim();
	const authorization = input.authorization.trim();
	const serverLabel = input.serverLabel?.trim() || serverLabelFromName(name);
	const serverDescription = input.serverDescription?.trim();

	if (!name) throw new Error('Connector name is required.');
	if (!isOpenAiConnectorId(connectorId)) throw new Error(`Unsupported connector id: ${connectorId}`);
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}

	const catalog = getConnectorCatalogItem(connectorId);
	const knownToolNames = new Set<string>(catalog?.tools ?? []);
	const allowedTools = Array.from(
		new Set((input.allowedTools ?? []).map((tool) => tool.trim()).filter(Boolean))
	);
	const unknownTool = allowedTools.find((tool) => !knownToolNames.has(tool));
	if (unknownTool) {
		throw new Error(`Tool "${unknownTool}" is not available for ${catalog?.name ?? connectorId}.`);
	}

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription: serverDescription || catalog?.description,
		authorization,
		requireApproval: input.requireApproval ?? 'always',
		allowedTools,
		deferLoading: input.deferLoading ?? false,
		enabled: input.enabled ?? true,
	};
}

export class ConnectorsService {
	constructor(
		private readonly store: StoreService,
		private readonly logger: LoggerService
	) {}

	catalog(): typeof OPENAI_CONNECTOR_CATALOG {
		return OPENAI_CONNECTOR_CATALOG;
	}

	list(): ConnectorView[] {
		return this.store.getConnectors().map(toView);
	}

	get(id: string): ConnectorConfig {
		const connector = this.store.getConnectorById(id);
		if (!connector) throw new Error(`Connector not found: ${id}`);
		return connector;
	}

	restoreEnabledConnectors(): void {
		for (const connector of this.store.getConnectors()) {
			if (connector.enabled && connector.tools.length === 0) {
				this.replace({
					...connector,
					tools: knownTools(connector),
					lastRefreshedAt: new Date().toISOString(),
				});
			}
		}
	}

	async add(input: ConnectorInput): Promise<ConnectorConfig> {
		const sanitized = sanitizeInput(input);
		const now = new Date().toISOString();
		const connector: ConnectorConfig = {
			id: randomUUID(),
			...sanitized,
			tools: [],
			createdAt: now,
			updatedAt: now,
			enabled: sanitized.enabled ?? true,
		};
		const next = this.withKnownTools(connector);
		this.store.setConnectors([...this.store.getConnectors(), next]);
		return next;
	}

	async update(id: string, input: ConnectorUpdateInput): Promise<ConnectorConfig> {
		const current = this.get(id);
		const merged = sanitizeInput({
			name: input.name ?? current.name,
			connectorId: input.connectorId ?? current.connectorId,
			serverLabel: input.serverLabel ?? current.serverLabel,
			serverDescription: input.serverDescription ?? current.serverDescription,
			authorization: input.authorization ?? current.authorization,
			requireApproval: input.requireApproval ?? current.requireApproval,
			allowedTools: input.allowedTools ?? current.allowedTools,
			deferLoading: input.deferLoading ?? current.deferLoading,
			enabled: input.enabled ?? current.enabled,
		});
		const next = this.withKnownTools({
			...current,
			...merged,
			lastError: undefined,
			updatedAt: new Date().toISOString(),
		});
		this.replace(next);
		return next;
	}

	async remove(id: string): Promise<void> {
		this.store.setConnectors(this.store.getConnectors().filter((connector) => connector.id !== id));
	}

	async enable(id: string): Promise<ConnectorConfig> {
		return this.update(id, { enabled: true });
	}

	async disable(id: string): Promise<ConnectorConfig> {
		return this.update(id, { enabled: false });
	}

	async test(id: string): Promise<ConnectorTestResult> {
		const connector = this.get(id);
		const status = statusFor(connector);

		if (status === 'configured') {
			return { status, message: 'Connector is configured for Responses API requests.' };
		}

		if (status === 'missing_auth') {
			return { status, message: 'OAuth access token is required for this connector.' };
		}

		if (status === 'disabled') {
			return { status, message: 'Connector is disabled.' };
		}

		return { status, message: connector.lastError ?? 'Connector has a configuration error.' };
	}

	async reconnect(id: string): Promise<ConnectorTestResult> {
		return this.test(id);
	}

	async refreshTools(id: string): Promise<ConnectorTool[]> {
		const connector = this.withKnownTools(this.get(id));
		this.replace(connector);
		return connector.tools;
	}

	listTools(id: string): ConnectorTool[] {
		return this.get(id).tools;
	}

	async callTool(): Promise<unknown> {
		throw new Error('OpenAI connectors are executed by the Responses API, not local IPC.');
	}

	private withKnownTools(connector: ConnectorConfig): ConnectorConfig {
		return {
			...connector,
			tools: knownTools(connector),
			lastRefreshedAt: new Date().toISOString(),
		};
	}

	private replace(connector: ConnectorConfig): void {
		this.logger.debug('ConnectorsService', `Updated connector ${connector.name}`);
		this.store.setConnectors(
			this.store.getConnectors().map((item) => (item.id === connector.id ? connector : item))
		);
	}
}
