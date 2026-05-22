import type {
	ConnectorDocumentationStatus,
	ConnectorImplementationPattern,
	ConnectorPriorityTier,
	ConnectorRecommendedInitialMode,
	ConnectorWriteRisk,
	DirectConnectorCatalogId,
	OpenAiConnectorId,
} from '../connectors';

export type ConnectorDocumentationType = 'official_docs';

export interface ConnectorDocumentationPage {
	readonly label: string;
	readonly url: string;
	readonly status: ConnectorDocumentationStatus;
	readonly type: ConnectorDocumentationType;
}

export interface ConnectorPlatformDocumentationPage {
	readonly label: string;
	readonly url: string;
}

export interface ConnectorCatalogExample {
	readonly tool: string;
	readonly input: Readonly<Record<string, unknown>>;
}

export interface DirectConnectorCatalogEntry {
	readonly id: string;
	readonly name: string;
	readonly vendor: string;
	readonly category: string;
	readonly priorityTier: ConnectorPriorityTier;
	readonly usefulnessScore0To100: number;
	readonly implementationPattern: ConnectorImplementationPattern;
	readonly recommendedProviderStrategy: string;
	readonly documentationPages: readonly ConnectorDocumentationPage[];
	readonly authModels: readonly string[];
	readonly coreAgentActions: readonly string[];
	readonly writeRisk: ConnectorWriteRisk;
	readonly humanApprovalRequiredFor: readonly string[];
	readonly recommendedInitialMode: ConnectorRecommendedInitialMode;
	readonly notes: string;
}

export interface OpenAiConnectorCatalogEntry {
	readonly id: string;
	readonly directConnectorId: DirectConnectorCatalogId;
	readonly name: string;
	readonly description: string;
	readonly docsPath: string;
	readonly docsLabel: string;
	readonly environmentSecretNames: readonly string[];
	readonly platformDocumentationPages: readonly ConnectorPlatformDocumentationPage[];
	readonly example: ConnectorCatalogExample;
	readonly tools: readonly string[];
	readonly scopes: readonly string[];
	readonly setupUrl: string;
	readonly setupInstructions: readonly string[];
	readonly authKind?: 'google_oauth';
	readonly redirectUri?: string;
}

export type ConnectorStatus = 'configured' | 'missing_auth' | 'disabled' | 'error';
export type ConnectorApprovalMode = 'always' | 'never' | 'never_for_allowed_tools';
export type ConnectorAuthKind = 'manual_oauth_access_token' | 'google_oauth';

export interface GoogleOAuthCredential {
	provider: 'google';
	clientId?: string;
	clientSecret?: string;
	redirectUri: string;
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
	tokenType?: string;
	scope?: string;
	email?: string;
	connectedAt?: string;
}

export interface ConnectorTool {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	requiresApproval: boolean;
}

export interface ConnectorConfig {
	id: string;
	name: string;
	connectorId: OpenAiConnectorId;
	serverLabel: string;
	serverDescription?: string;
	enabled: boolean;
	authorization: string;
	oauth?: GoogleOAuthCredential;
	requireApproval: ConnectorApprovalMode;
	allowedTools: string[];
	deferLoading: boolean;
	tools: ConnectorTool[];
	lastRefreshedAt?: string;
	createdAt: string;
	updatedAt: string;
	lastError?: string;
}

export type Connector = ConnectorConfig;

export interface ConnectorView {
	id: string;
	name: string;
	connectorId: OpenAiConnectorId;
	authKind: ConnectorAuthKind;
	serverLabel: string;
	enabled: boolean;
	status: ConnectorStatus;
	requireApproval: ConnectorApprovalMode;
	allowedToolsCount: number;
	toolsCount: number;
	deferLoading: boolean;
	lastRefreshedAt?: string;
	lastError?: string;
	connectedAccount?: string;
}

export interface ConnectorInput {
	name: string;
	connectorId: OpenAiConnectorId;
	serverLabel?: string;
	serverDescription?: string;
	authorization?: string;
	requireApproval?: ConnectorApprovalMode;
	allowedTools?: string[];
	deferLoading?: boolean;
	enabled?: boolean;
}

export type ConnectorUpdateInput = Partial<ConnectorInput>;

export interface ConnectorTestResult {
	status: ConnectorStatus;
	message?: string;
}

export interface ConnectorOAuthConnectResult {
	status: ConnectorStatus;
	message?: string;
	connectedAccount?: string;
}

export interface ConnectorCallToolOptions {
	timeoutMs?: number;
	retries?: number;
}
