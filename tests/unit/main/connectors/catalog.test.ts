import {
	CONNECTOR_CATALOG_COUNTS,
	CONNECTOR_IMPLEMENTATION_CONTROLS,
	DIRECT_CONNECTOR_CATALOG,
	OPENAI_CONNECTOR_CATALOG,
	getDirectConnectorCatalogItem,
	isDirectConnectorCatalogId,
	listDirectConnectorsByPriority,
} from '../../../../src/shared/connectors';

describe('shared connector catalog', () => {
	it('exposes production connector metadata for frontend and backend use', () => {
		expect(CONNECTOR_CATALOG_COUNTS.directConnectors).toBe(DIRECT_CONNECTOR_CATALOG.length);
		expect(CONNECTOR_CATALOG_COUNTS.totalCatalogEntries).toBeGreaterThan(DIRECT_CONNECTOR_CATALOG.length);
		expect(getDirectConnectorCatalogItem('gmail')).toMatchObject({
			priorityTier: 'P0',
			writeRisk: 'high',
		});
		expect(getDirectConnectorCatalogItem('microsoft_graph')).toMatchObject({
			vendor: 'Microsoft',
			writeRisk: 'critical',
		});
		expect(listDirectConnectorsByPriority('P0').map((connector) => connector.id)).toEqual(
			expect.arrayContaining(['gmail', 'microsoft_graph', 'github', 'stripe', 'custom_rest_openapi'])
		);
		expect(
			CONNECTOR_IMPLEMENTATION_CONTROLS.globalDefaults.some((control) => control.includes('read-only'))
		).toBe(true);
	});

	it('maps configured OpenAI connector entries to shared direct catalog metadata', () => {
		for (const connector of OPENAI_CONNECTOR_CATALOG) {
			expect(isDirectConnectorCatalogId(connector.directConnectorId)).toBe(true);
		}
	});
});
