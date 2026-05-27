import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
	CONNECTOR_CATALOG_COUNTS,
	CONNECTOR_IMPLEMENTATION_CONTROLS,
	DIRECT_CONNECTOR_CATALOG,
	OPENAI_CONNECTOR_CATALOG,
	getDirectConnectorCatalogItem,
	isDirectConnectorCatalogId,
	listDirectConnectorsByPriority,
} from '../../../../src/shared/connectors';
import {
	PROVIDER_CONNECTOR_CATALOG,
	PROVIDER_CONNECTOR_CATALOG_COUNTS,
	getProviderConnectorCatalogItem,
	listProviderConnectorsByProvider,
} from '../../../../src/shared/connector';

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectProviderConnectorDocs(root: string): string[] {
	const files: string[] = [];

	for (const entry of readdirSync(root, { withFileTypes: true })) {
		const entryPath = path.join(root, entry.name);
		if (entry.isDirectory()) {
			files.push(...collectProviderConnectorDocs(entryPath));
			continue;
		}
		if (entry.name !== 'index.md') continue;
		const markdown = readFileSync(entryPath, 'utf8');
		if (markdown.includes('| Connector id')) {
			files.push(path.relative(process.cwd(), entryPath));
		}
	}

	return files;
}

describe('shared connector catalog', () => {
	it('exposes production connector metadata for frontend and backend use', () => {
		expect(CONNECTOR_CATALOG_COUNTS.directConnectors).toBe(DIRECT_CONNECTOR_CATALOG.length);
		expect(CONNECTOR_CATALOG_COUNTS.totalCatalogEntries).toBe(DIRECT_CONNECTOR_CATALOG.length);
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

	it('exposes provider-doc connector metadata for every Settings connector', () => {
		expect(PROVIDER_CONNECTOR_CATALOG_COUNTS.providerConnectors).toBe(
			OPENAI_CONNECTOR_CATALOG.length
		);
		expect(PROVIDER_CONNECTOR_CATALOG.map((connector) => connector.id).sort()).toEqual(
			OPENAI_CONNECTOR_CATALOG.map((connector) => connector.id).sort()
		);
		expect(getProviderConnectorCatalogItem('connector_gmail')).toMatchObject({
			providerId: 'google',
			docsPath: 'docs/providers/google/gmail/index.md',
			runtimeStatus: 'mcp_dynamic_tools',
		});
		expect(listProviderConnectorsByProvider('microsoft').map((connector) => connector.id)).toEqual(
			expect.arrayContaining([
				'connector_microsoftteams',
				'connector_outlookcalendar',
				'connector_outlookemail',
				'connector_sharepoint',
			])
		);
	});

	it('maps configured OpenAI connector entries to shared direct catalog metadata', () => {
		for (const connector of OPENAI_CONNECTOR_CATALOG) {
			expect(isDirectConnectorCatalogId(connector.directConnectorId)).toBe(true);
		}
	});

	it('keeps Settings connector docs in sync with the shared catalog', () => {
		const docsRoot = path.join(process.cwd(), 'docs/providers');
		const catalogDocs = new Set<string>();

		for (const connector of OPENAI_CONNECTOR_CATALOG) {
			const docsPath = path.join(process.cwd(), connector.docsPath);
			const markdown = readFileSync(docsPath, 'utf8');
			catalogDocs.add(connector.docsPath);

			expect(markdown).toMatch(new RegExp(`\\|\\s*Connector id\\s*\\|\\s*\`${escapeRegExp(connector.id)}\``));
			expect(markdown).toMatch(new RegExp(`\\|\\s*Direct connector id\\s*\\|\\s*\`${escapeRegExp(connector.directConnectorId)}\``));
			expect(markdown).toMatch(new RegExp(`\\|\\s*Name\\s*\\|\\s*${escapeRegExp(connector.name)}\\s*\\|`));
			expect(markdown).toContain(connector.setupUrl);
			expect(markdown).toContain(`Use with \`${connector.example.tool}\`.`);

			for (const secret of connector.environmentSecretNames) {
				expect(markdown).toContain(`- \`${secret}\``);
			}
			for (const tool of connector.tools) {
				expect(markdown).toContain(`- \`${tool}\``);
			}
			for (const scope of connector.scopes) {
				expect(markdown).toContain(`- \`${scope}\``);
			}
			for (const page of connector.platformDocumentationPages) {
				expect(markdown).toContain(page.url);
			}
		}

		const docsFiles = collectProviderConnectorDocs(docsRoot).sort();
		expect(docsFiles).toEqual(Array.from(catalogDocs).sort());
	});

	it('ships light and dark icon assets for every direct connector icon folder', () => {
		const iconRoot = path.join(process.cwd(), 'resources/icons/brands');
		const iconIds = readdirSync(iconRoot, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.filter((entry) => existsSync(path.join(iconRoot, entry.name, 'SOURCE.json')))
			.map((entry) => entry.name);

		expect(iconIds.length).toBeGreaterThanOrEqual(DIRECT_CONNECTOR_CATALOG.length);
		for (const iconId of iconIds) {
			const folder = path.join(iconRoot, iconId);
			const files = readdirSync(folder);
			expect(existsSync(path.join(folder, 'SOURCE.json'))).toBe(true);
			expect(files.some((file) => file === `${iconId}_light.png` || file === `${iconId}_light_NOT_A_LOGO.png`)).toBe(true);
			expect(files.some((file) => file === `${iconId}_dark.png` || file === `${iconId}_dark_NOT_A_LOGO.png`)).toBe(true);
		}
	});
});
