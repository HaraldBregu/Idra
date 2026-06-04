const REQUIRED_OPENAI_CONNECTOR_SCOPES: Record<string, readonly string[]> = {
	connector_gmail: ['https://www.googleapis.com/auth/gmail.modify'],
};

export function requiredOpenAiConnectorScopes(connectorId: string): readonly string[] {
	return REQUIRED_OPENAI_CONNECTOR_SCOPES[connectorId] ?? [];
}
