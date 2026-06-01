import type {
	ConnectorDocumentationStatus,
	ConnectorPriorityTier,
	ConnectorWriteRisk,
	DirectConnectorCatalogId,
	OpenAiConnectorId,
} from './connectors';

export type { ConnectorDocumentationStatus, ConnectorPriorityTier, ConnectorWriteRisk, DirectConnectorCatalogId, OpenAiConnectorId };

export type ConnectorImplementationPattern =
	| 'direct_api_or_connector_provider_tool'
	| 'custom_mcp_or_tool_wrapper_over_openapi'
	| 'custom_mcp_or_tool_wrapper_over_graphql'
	| 'controlled_query_gateway_with_read_only_roles'
	| 'event_trigger_into_agent_or_workflow_orchestrator';

export type ConnectorRecommendedInitialMode = 'read_only_then_draft_write_actions';

export type ConnectorProviderId = string;
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
	readonly vendor?: string;
	readonly category?: string;
	readonly priorityTier?: ConnectorPriorityTier;
	readonly usefulnessScore0To100?: number;
	readonly implementationPattern?: ConnectorImplementationPattern;
	readonly recommendedProviderStrategy?: string;
	readonly documentationPages?: readonly ConnectorDocumentationPage[];
	readonly authModels?: readonly string[];
	readonly coreAgentActions?: readonly string[];
	readonly writeRisk?: ConnectorWriteRisk;
	readonly humanApprovalRequiredFor?: readonly string[];
	readonly recommendedInitialMode?: ConnectorRecommendedInitialMode;
	readonly notes?: string;
}

export interface ConnectorCatalogEntry {
	readonly id: ConnectorProviderId;
	readonly directConnectorId?: DirectConnectorCatalogId;
	readonly name: string;
	readonly description: string;
	readonly docsPath?: string;
	readonly docsLabel?: string;
	readonly environmentSecretNames: readonly string[];
	readonly platformDocumentationPages: readonly ConnectorPlatformDocumentationPage[];
	readonly example?: ConnectorCatalogExample;
	readonly tools: readonly string[];
	readonly scopes: readonly string[];
	readonly setupUrl?: string;
	readonly setupInstructions: readonly string[];
	readonly authKind?: ConnectorAuthKind;
	readonly redirectUri?: string;
	readonly runtimeKind?: ConnectorRuntimeKind;
	readonly allowMultipleInstances?: boolean;
	readonly mcp?: ConnectorMcpConfig;
	readonly oauth?: ConnectorCatalogOAuthConfig;
}

export type OpenAiConnectorCatalogEntry = ConnectorCatalogEntry;

export type ConnectorStatus = 'configured' | 'missing_auth' | 'disabled' | 'error';
export type ConnectorApprovalMode = 'always' | 'never' | 'never_for_allowed_tools';
export type ConnectorAuthKind =
	| 'manual_oauth_access_token'
	| 'google_oauth'
	| 'oauth'
	| 'mcp_env'
	| 'api_key'
	| 'none';
export type ConnectorRuntimeKind = 'mcp' | 'oauth' | 'apiKey' | 'internal' | 'local';
export type ConnectorMcpTransport = 'http' | 'stdio';
export type ConnectorMcpHeaderAuthScheme = 'bearer' | 'raw';
export const CONNECTOR_TOOL_PERMISSIONS = ['always-allow', 'needs-approval', 'blocked'] as const;
export type ConnectorToolPermission = typeof CONNECTOR_TOOL_PERMISSIONS[number];
export const DEFAULT_CONNECTOR_TOOL_PERMISSION: ConnectorToolPermission = 'always-allow';

export interface ConnectorMcpHeaderSecret {
	env: string;
	header?: string;
	scheme?: ConnectorMcpHeaderAuthScheme;
}

export interface ConnectorMcpEnvSecret {
	env: string;
	target: string;
}

export interface ConnectorMcpHttpConfig {
	transport: 'http';
	url: string;
	method?: 'POST';
	headers?: Record<string, string>;
	sessionId?: string;
	auth?: ConnectorMcpHeaderSecret;
}

export interface ConnectorMcpStdioConfig {
	transport: 'stdio';
	command: string;
	args?: string[];
	cwd?: string;
	env?: Record<string, string>;
	envSecrets?: ConnectorMcpEnvSecret[];
}

export type ConnectorMcpConfig = ConnectorMcpHttpConfig | ConnectorMcpStdioConfig;

export interface ConnectorCatalogOAuthConfig {
	providerId: string;
	clientIdEnv: string;
	authorizationUrl: string;
	redirectUri: string;
	authorizationParams: Record<string, string>;
}

export interface ConnectorOAuthTokenSet {
	accessToken: string;
	refreshToken?: string;
	tokenType?: string;
	scope?: string;
	expiresAt?: string;
}

export interface ConnectorOAuthCredential {
	provider: string;
	providerId?: string;
	authorizationUrl?: string;
	clientId?: string;
	clientSecret?: string;
	redirectUri: string;
	scopes?: readonly string[];
	state?: string;
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: number;
	tokenType?: string;
	scope?: string;
	email?: string;
	accountEmail?: string;
	token?: ConnectorOAuthTokenSet;
	connectedAt?: string;
}


export interface ConnectorTool {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	permission: ConnectorToolPermission;
	requiresApproval: boolean;
}

export interface ConnectorConfig {
	id: string;
	name: string;
	connectorId: ConnectorProviderId;
	serverLabel: string;
	serverDescription?: string;
	enabled: boolean;
	authorization: string;
	mcp?: ConnectorMcpConfig;
	oauth?: ConnectorOAuthCredential;
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
	connectorId: ConnectorProviderId;
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
	connectorId: ConnectorProviderId;
	serverLabel?: string;
	serverDescription?: string;
	authorization?: string;
	requireApproval?: ConnectorApprovalMode;
	allowedTools?: string[];
	deferLoading?: boolean;
	enabled?: boolean;
	mcp?: ConnectorMcpConfig;
}

export type ConnectorUpdateInput = Partial<ConnectorInput>;

export interface ConnectorOAuthAuthorizeRequest {
	connectorId: ConnectorProviderId;
}

export interface ConnectorOAuthAuthorizeResult {
	connectorId: ConnectorProviderId;
	authorizationUrl: string;
	connector: ConnectorConfig;
	message?: string;
}

export interface ConnectorOAuthCompleteInput {
	state: string;
	accessToken: string;
	refreshToken?: string;
	tokenType?: string;
	scope?: string;
	expiresIn?: number;
	accountEmail?: string;
}

export interface ConnectorTestResult {
	status: ConnectorStatus;
	message?: string;
}

export interface ConnectorOAuthConnectResult {
	status: ConnectorStatus;
	message?: string;
	connectedAccount?: string;
}

export interface GoogleOAuthCredential extends ConnectorOAuthCredential {
	provider: 'google';
}

export interface ConnectorCallToolOptions {
	timeoutMs?: number;
	retries?: number;
}
