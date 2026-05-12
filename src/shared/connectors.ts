export type ConnectorTransport = 'stdio' | 'http';
export type ConnectorStatus = 'connected' | 'disconnected' | 'error' | 'unknown';
export type ConnectorRisk = 'low' | 'high';

export interface ConnectorTool {
	name: string;
	description?: string;
	risk: ConnectorRisk;
}

export interface ConnectorConfig {
	id: string;
	name: string;
	transport: ConnectorTransport;
	enabled: boolean;
	connectionStatus: ConnectorStatus;
	command: string;
	args: string[];
	env: Record<string, string>;
	cwd?: string;
	tools: ConnectorTool[];
	lastRefreshedAt?: string;
	createdAt: string;
	updatedAt: string;
	lastError?: string;
}

export interface ConnectorView {
	id: string;
	name: string;
	transport: ConnectorTransport;
	enabled: boolean;
	connectionStatus: ConnectorStatus;
	toolsCount: number;
	lastRefreshedAt?: string;
	lastError?: string;
}

export interface ConnectorInput {
	name: string;
	transport: ConnectorTransport;
	command: string;
	args: string[];
	env: Record<string, string>;
	cwd?: string;
	enabled?: boolean;
}

export type ConnectorUpdateInput = Partial<Omit<ConnectorInput, 'transport'>> & {
	transport?: ConnectorTransport;
};

export interface ConnectorTestResult {
	status: ConnectorStatus;
	message?: string;
}
