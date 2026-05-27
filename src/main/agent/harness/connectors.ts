import type {
	AgentHarnessConnector,
	AgentHarnessConnectorRegistry,
	AgentHarnessConnectorStatus,
	AgentHarnessEventSink,
	AgentHarnessTool,
} from './types';
import { AgentHarnessError, toHarnessErrorShape } from './errors';

export interface ConnectorCredential {
	type: 'api_key' | 'oauth';
	value?: string;
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
}

export interface ConnectorCredentialProvider {
	get(connectorId: string): Promise<ConnectorCredential | null>;
	refresh?(connectorId: string, credential: ConnectorCredential): Promise<ConnectorCredential>;
}

export class DefaultAgentHarnessConnectorRegistry implements AgentHarnessConnectorRegistry {
	private readonly connectors = new Map<string, AgentHarnessConnector>();

	register(connector: AgentHarnessConnector): void {
		if (!connector.id.trim()) {
			throw new AgentHarnessError({ code: 'config_invalid', message: 'Connector id is required.' });
		}
		this.connectors.set(connector.id, connector);
	}

	get(id: string): AgentHarnessConnector | undefined {
		return this.connectors.get(id);
	}

	list(): AgentHarnessConnector[] {
		return [...this.connectors.values()];
	}
}

export class NativeAgentHarnessConnector implements AgentHarnessConnector {
	private currentStatus: AgentHarnessConnectorStatus = 'configured';
	private error: string | undefined;

	constructor(
		readonly id: string,
		readonly name: string,
		private readonly options: {
			credentialProvider?: ConnectorCredentialProvider;
			tools?: AgentHarnessTool[] | (() => Promise<AgentHarnessTool[]>);
			events?: AgentHarnessEventSink;
		} = {}
	) {}

	async status(): Promise<{ status: AgentHarnessConnectorStatus; error?: string }> {
		return { status: this.currentStatus, error: this.error };
	}

	async connect(): Promise<void> {
		this.currentStatus = 'connecting';
		this.emit();
		try {
			await this.options.credentialProvider?.get(this.id);
			this.currentStatus = 'connected';
			this.error = undefined;
			this.emit();
		} catch (error) {
			this.currentStatus = 'error';
			this.error = error instanceof Error ? error.message : String(error);
			this.emit(error);
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		this.currentStatus = 'disconnected';
		this.emit();
	}

	async tools(): Promise<AgentHarnessTool[]> {
		const tools = this.options.tools;
		if (!tools) return [];
		return typeof tools === 'function' ? tools() : tools;
	}

	private emit(error?: unknown): void {
		this.options.events?.emit({
			type: 'connector.status',
			connectorId: this.id,
			status: this.currentStatus,
			...(error ? { error: toHarnessErrorShape(error) } : {}),
		});
	}
}
