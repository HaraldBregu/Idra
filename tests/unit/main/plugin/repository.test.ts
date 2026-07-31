import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PluginRepository } from '../../../../src/main/plugin';

function manifest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		schemaVersion: 3,
		id: 'acme-tools',
		name: 'Acme Tools',
		version: '1.0.0',
		description: 'Acme provider and dashboard integrations.',
		contributes: {
			providers: [{ id: 'acme' }],
			skills: [{ id: 'summarizer', path: 'skills/summarizer' }],
			mcpServers: [
				{ id: 'acme-docs', name: 'Acme Docs', type: 'http', url: 'https://mcp.acme.test' },
			],
			extensions: [
				{
					id: 'dashboard',
					title: 'Acme Dashboard',
					description: 'Account usage and status.',
					category: 'integration',
					entry: 'extensions/dashboard/index.html',
				},
			],
			languages: [{ id: 'fr', name: 'Français', entry: 'languages/fr.json' }],
			themes: [{ id: 'ocean', name: 'Ocean', entry: 'themes/ocean.json' }],
			channels: [
				{
					id: 'helpdesk',
					name: 'Helpdesk',
					description: 'Acme support chat.',
					entry: 'channels/helpdesk.mjs',
				},
			],
		},
		...overrides,
	};
}

function install(root: string, folder: string, value: unknown, withEntry = true): void {
	const directory = path.join(root, folder);
	fs.mkdirSync(directory, { recursive: true });
	fs.writeFileSync(
		path.join(directory, 'manifest.json'),
		typeof value === 'string' ? value : JSON.stringify(value)
	);
	if (withEntry) {
		const files = [
			['extensions/dashboard/index.html', '<h1>Acme</h1>'],
			['skills/summarizer/SKILL.md', '# Summarizer'],
			[
				'providers/acme/info.json',
				JSON.stringify({
					name: 'Acme AI',
					protocol: 'openai-compatible',
					baseUrl: 'https://api.acme.test/v1',
					apiKeyUrl: 'https://acme.test/keys',
				}),
			],
			['providers/acme/models.json', JSON.stringify([{ id: 'acme-chat', name: 'Acme Chat' }])],
			['languages/fr.json', '{}'],
			['themes/ocean.json', '{}'],
			['channels/helpdesk.mjs', 'export default {}'],
		] as const;
		for (const [relativePath, contents] of files) {
			const file = path.join(directory, ...relativePath.split('/'));
			fs.mkdirSync(path.dirname(file), { recursive: true });
			fs.writeFileSync(file, contents);
		}
	}
}

describe('plugin repository', () => {
	let appLocation: string;
	let root: string;

	beforeEach(() => {
		appLocation = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-plugins-'));
		root = path.join(appLocation, 'plugins');
	});

	afterEach(() => {
		fs.rmSync(appLocation, { recursive: true, force: true });
	});

	it('creates the plugin root and discovers a valid manifest', () => {
		const repository = new PluginRepository({ root });
		repository.ensure();
		expect(fs.statSync(root).isDirectory()).toBe(true);

		install(root, 'acme-tools', manifest());
		expect(repository.list().map((plugin) => plugin.manifest.id)).toEqual(['acme-tools']);
		expect(repository.scan().issues).toEqual([]);
	});

	it('returns all contribution types with plugin ownership', () => {
		install(root, 'acme-tools', manifest());
		const repository = new PluginRepository({ root });

		expect(repository.providers()).toEqual([
			expect.objectContaining({
				pluginId: 'acme-tools',
				id: 'acme',
				protocol: 'openai-compatible',
				models: [{ id: 'acme-chat', name: 'Acme Chat' }],
			}),
		]);
		expect(repository.extensions()).toEqual([
			expect.objectContaining({
				id: 'acme-tools/dashboard',
				source: { kind: 'plugin', pluginId: 'acme-tools', extensionId: 'dashboard' },
			}),
		]);
		expect(
			repository.resolveExtensionEntry({
				kind: 'plugin',
				pluginId: 'acme-tools',
				extensionId: 'dashboard',
			})
		).toBe(path.join(fs.realpathSync(root), 'acme-tools', 'extensions', 'dashboard', 'index.html'));
		expect(repository.skills()).toEqual([
			expect.objectContaining({
				pluginId: 'acme-tools',
				id: 'summarizer',
				skillPath: path.join(
					fs.realpathSync(root),
					'acme-tools',
					'skills',
					'summarizer',
					'SKILL.md'
				),
			}),
		]);
		expect(repository.mcpServers()).toEqual([
			expect.objectContaining({ pluginId: 'acme-tools', id: 'acme-docs', type: 'http' }),
		]);
		expect(repository.languages()).toEqual([
			expect.objectContaining({ pluginId: 'acme-tools', id: 'fr' }),
		]);
		expect(repository.themes()).toEqual([
			expect.objectContaining({ pluginId: 'acme-tools', id: 'ocean' }),
		]);
		expect(repository.channels()).toEqual([
			expect.objectContaining({
				pluginId: 'acme-tools',
				id: 'helpdesk',
				entry: path.join(fs.realpathSync(root), 'acme-tools', 'channels', 'helpdesk.mjs'),
			}),
		]);
	});

	it('reports malformed manifests and folder id mismatches', () => {
		install(root, 'broken', '{', false);
		install(root, 'wrong-folder', manifest(), false);
		const result = new PluginRepository({ root }).scan();

		expect(result.plugins).toEqual([]);
		expect(result.issues.map((issue) => issue.code)).toEqual(['invalid-json', 'invalid-manifest']);
	});

	it('rejects missing extension entries and unsafe entry paths', () => {
		install(root, 'acme-tools', manifest(), false);
		install(
			root,
			'unsafe-tools',
			manifest({
				id: 'unsafe-tools',
				contributes: {
					providers: [],
					extensions: [
						{
							id: 'dashboard',
							title: 'Unsafe',
							description: 'Unsafe path.',
							category: 'test',
							entry: '../outside.html',
						},
					],
				},
			}),
			false
		);
		const result = new PluginRepository({ root }).scan();

		expect(result.plugins).toEqual([]);
		expect(result.issues.map((issue) => issue.code)).toEqual(['invalid-entry', 'invalid-manifest']);
	});

	it('rejects reserved and duplicate provider ids deterministically', () => {
		install(root, 'acme-tools', manifest());
		install(
			root,
			'second-tools',
			manifest({
				id: 'second-tools',
				name: 'Second Tools',
				contributes: {
					providers: [
						{
							id: 'acme',
							name: 'Second Acme',
							protocol: 'openai-compatible',
							baseUrl: 'https://second.test/v1',
							models: [{ id: 'second-chat', name: 'Second Chat' }],
						},
					],
					extensions: [],
				},
			}),
			false
		);
		const result = new PluginRepository({ root }).scan();

		expect(result.plugins.map((plugin) => plugin.manifest.id)).toEqual(['acme-tools']);
		expect(result.issues).toEqual([
			expect.objectContaining({ pluginId: 'second-tools', code: 'provider-conflict' }),
		]);

		const reserved = new PluginRepository({ root, reservedProviderIds: ['acme'] }).scan();
		expect(reserved.plugins).toEqual([]);
		expect(reserved.issues).toEqual([
			expect.objectContaining({ pluginId: 'acme-tools', code: 'provider-conflict' }),
			expect.objectContaining({ pluginId: 'second-tools', code: 'provider-conflict' }),
		]);
	});
});
