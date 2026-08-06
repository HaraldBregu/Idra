import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { configureLocalMcpServer } from '../../../../src/main/mcp/mcp_local_configure';
import { importLocalMcpServers } from '../../../../src/main/mcp/mcp_local_import';
import { listLocalMcpServers } from '../../../../src/main/mcp/mcp_local_list';
import { readLocalMcpServer } from '../../../../src/main/mcp/mcp_local_read';
import { mcpLocalRoot } from '../../../../src/main/mcp/mcp_local_root';

let temp: string;

beforeEach(() => {
	temp = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-mcp-'));
});

afterEach(() => {
	fs.rmSync(temp, { recursive: true, force: true });
});

describe('local MCP registry', () => {
	it('uses the expected local server root', () => {
		expect(mcpLocalRoot('/app-data')).toBe(path.resolve('/app-data', 'mcp', 'servers'));
	});

	it('reads a portable stdio manifest and resolves its working directory', () => {
		const directory = path.join(temp, 'filesystem');
		fs.mkdirSync(directory);
		fs.writeFileSync(
			path.join(directory, 'mcp.json'),
			JSON.stringify({
				name: 'Filesystem',
				command: 'node',
				args: ['dist/server.js'],
				env: { MODE: 'test' },
				cwd: '.',
			})
		);

		expect(readLocalMcpServer(directory)).toEqual({
			id: 'filesystem',
			source: 'local',
			path: directory,
			data: {
				type: 'stdio',
				command: 'node',
				args: ['dist/server.js'],
				env: { MODE: 'test' },
				cwd: directory,
				name: 'Filesystem',
				require_approval: undefined,
				defer_loading: undefined,
				enabled: undefined,
			},
		});
	});

	it('rescans additions and removals without restarting', () => {
		const root = path.join(temp, 'servers');
		const first = path.join(root, 'first');
		fs.mkdirSync(first, { recursive: true });
		fs.writeFileSync(path.join(first, 'mcp.json'), JSON.stringify({ command: 'first' }));
		expect(listLocalMcpServers(root).servers.map((server) => server.id)).toEqual(['first']);

		const second = path.join(root, 'second');
		fs.mkdirSync(second);
		fs.writeFileSync(path.join(second, 'mcp.json'), JSON.stringify({ command: 'second' }));
		fs.rmSync(first, { recursive: true });
		expect(listLocalMcpServers(root).servers.map((server) => server.id)).toEqual(['second']);
	});

	it('updates local configuration while preserving package-owned manifest values', () => {
		const root = path.join(temp, 'servers');
		const directory = path.join(root, 'configured-demo');
		fs.mkdirSync(directory, { recursive: true });
		fs.writeFileSync(
			path.join(directory, 'mcp.json'),
			JSON.stringify({
				id: 'configured-demo',
				type: 'stdio',
				name: 'Before',
				command: 'node',
				args: ['server.mjs'],
				cwd: '.',
				package_value: 'preserved',
			})
		);

		const result = configureLocalMcpServer(
			'configured-demo',
			{
				type: 'stdio',
				name: 'Configured demo',
				command: 'bun',
				args: ['run', 'server.mjs'],
				env: { DEMO_COMPANY: 'Friday Studio', DEMO_TAX_RATE: '22' },
				require_approval: 'always',
				enabled: false,
				cwd: '/ignored/resolved/path',
			},
			root
		);

		expect(result.data).toMatchObject({
			name: 'Configured demo',
			command: 'bun',
			args: ['run', 'server.mjs'],
			env: { DEMO_COMPANY: 'Friday Studio', DEMO_TAX_RATE: '22' },
			require_approval: 'always',
			enabled: false,
			cwd: directory,
		});
		expect(JSON.parse(fs.readFileSync(path.join(directory, 'mcp.json'), 'utf8'))).toMatchObject({
			id: 'configured-demo',
			type: 'stdio',
			cwd: '.',
			package_value: 'preserved',
		});
		expect(fs.readdirSync(directory).filter((entry) => entry.startsWith('.mcp-'))).toEqual([]);
	});

	it('returns diagnostics for malformed and duplicate manifests', () => {
		const root = path.join(temp, 'servers');
		for (const folder of ['one', 'two']) {
			const directory = path.join(root, folder);
			fs.mkdirSync(directory, { recursive: true });
			fs.writeFileSync(
				path.join(directory, 'mcp.json'),
				JSON.stringify({ id: 'duplicate', command: folder })
			);
		}
		const invalid = path.join(root, 'invalid');
		fs.mkdirSync(invalid);
		fs.writeFileSync(path.join(invalid, 'mcp.json'), '{');

		const result = listLocalMcpServers(root);
		expect(result.servers).toHaveLength(1);
		expect(result.diagnostics.map((diagnostic) => diagnostic.error)).toEqual(
			expect.arrayContaining([
				'mcp.json is not valid JSON.',
				'Another local MCP server already uses ID "duplicate".',
			])
		);
	});

	it('validates before upload and does not overwrite an installed server', () => {
		const source = path.join(temp, 'source');
		const root = path.join(temp, 'installed');
		fs.mkdirSync(source);
		fs.writeFileSync(
			path.join(source, 'mcp.json'),
			JSON.stringify({ id: 'uploaded', command: 'node', args: ['server.js'] })
		);

		const first = importLocalMcpServers([source], root);
		expect(first.imported.map((server) => server.id)).toEqual(['uploaded']);
		expect(first.skipped).toEqual([]);
		const second = importLocalMcpServers([source], root);
		expect(second.imported).toEqual([]);
		expect(second.skipped[0]?.reason).toContain('already exists');
	});
});
