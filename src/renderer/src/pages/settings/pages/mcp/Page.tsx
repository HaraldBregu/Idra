import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, FolderOpen, Plus, PlugZap, RefreshCw, Upload } from 'lucide-react';
import type { McpData, McpRegistry, McpTestResult } from '@shared/mcp_types';
import { Button } from '@/components/ui/button';
import { mcps } from '@/lib/providers';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { McpServerDialog } from './components/McpServerDialog';
import { McpLocalServerCard } from './components/McpLocalServerCard';
import { McpServerRow } from './components/McpServerRow';
import { McpCard } from '../providers/McpCard';

const McpPage = (): React.JSX.Element => {
	const [registry, setRegistry] = useState<McpRegistry>({ servers: [], diagnostics: [] });
	const [root, setRoot] = useState('');
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);
	const [testing, setTesting] = useState<ReadonlySet<string>>(new Set());
	const [testResults, setTestResults] = useState<Record<string, McpTestResult>>({});
	const [error, setError] = useState('');
	const [success, setSuccess] = useState('');

	const load = useCallback(async (): Promise<void> => {
		setLoading(true);
		setError('');
		setTestResults({});
		try {
			const [nextRegistry, nextRoot] = await Promise.all([
				window.mcp.registry(),
				window.mcp.getRoot(),
			]);
			setRegistry(nextRegistry);
			setRoot(nextRoot);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const save = async (id: string, data: McpData): Promise<void> => {
		setError('');
		try {
			await window.mcp.upsert(id, data);
			await load();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			throw caught;
		}
	};

	const saveLocal = async (id: string, data: McpData): Promise<void> => {
		setError('');
		try {
			if (data.type !== 'stdio') throw new Error('Local MCP servers require stdio configuration.');
			await window.mcp.configureLocal(id, data);
			await load();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			throw caught;
		}
	};

	const remove = async (id: string): Promise<void> => {
		setError('');
		try {
			await window.mcp.delete(id);
			await load();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
			throw caught;
		}
	};

	const test = async (id: string): Promise<void> => {
		setTesting((current) => new Set(current).add(id));
		setTestResults((current) => {
			const next = { ...current };
			delete next[id];
			return next;
		});
		try {
			const result = await window.mcp.test(id);
			setTestResults((current) => ({ ...current, [id]: result }));
		} catch (caught) {
			setTestResults((current) => ({
				...current,
				[id]: {
					ok: false,
					tools: [],
					toolCount: 0,
					durationMs: 0,
					error: caught instanceof Error ? caught.message : String(caught),
				},
			}));
		} finally {
			setTesting((current) => {
				const next = new Set(current);
				next.delete(id);
				return next;
			});
		}
	};

	const upload = async (): Promise<void> => {
		setImporting(true);
		setError('');
		setSuccess('');
		try {
			const result = await window.mcp.importLocal();
			if (result) {
				const skipped = result.skipped.map((entry) => `${entry.name}: ${entry.reason}`).join(' ');
				const message =
					`Uploaded ${result.imported.length} local MCP server${result.imported.length === 1 ? '' : 's'}.` +
					(result.skipped.length > 0 ? ` Skipped ${result.skipped.length}. ${skipped}` : '');
				if (result.imported.length === 0 && result.skipped.length > 0) setError(message);
				else setSuccess(message);
				await load();
			}
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setImporting(false);
		}
	};

	const openRoot = async (): Promise<void> => {
		setError('');
		try {
			await window.mcp.openRoot();
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		}
	};

	const remote = registry.servers.filter((server) => server.data.type === 'http');
	const local = registry.servers.filter((server) => server.data.type === 'stdio');
	const catalog = mcps();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="MCP"
				description="Manage remote services and local MCP server packages."
				action={
					<div className="flex flex-wrap items-center gap-2">
						<Button variant="outline" size="xs" onClick={() => void openRoot()}>
							<FolderOpen className="size-3" />
							Open folder
						</Button>
						<Button variant="outline" size="xs" onClick={() => void load()} disabled={loading}>
							<RefreshCw className="size-3" />
							Refresh
						</Button>
						<Button variant="outline" size="xs" onClick={() => void upload()} disabled={importing}>
							<Upload className="size-3" />
							{importing ? 'Uploading' : 'Upload local'}
						</Button>
						<McpServerDialog
							trigger={
								<Button size="xs">
									<Plus className="size-3" />
									Add server
								</Button>
							}
							onSubmit={save}
						/>
					</div>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{success && <SettingsNotice>{success}</SettingsNotice>}
			{registry.diagnostics.map((diagnostic) => (
				<SettingsNotice key={diagnostic.path} variant="destructive" icon={AlertTriangle}>
					{diagnostic.name}: {diagnostic.error}
				</SettingsNotice>
			))}

			{catalog.length > 0 && (
				<SettingsSection
					title="Available remote servers"
					description="Remote MCP services from installed provider catalogs."
				>
					<div className="space-y-3">
						{catalog.map((service) => (
							<McpCard key={`${service.provider.id}-${service.id}`} service={service} />
						))}
					</div>
				</SettingsSection>
			)}

			<SettingsSection title="Remote servers" description="MCP services reached over HTTP.">
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={2} />
					) : remote.length === 0 ? (
						<SettingsEmptyState
							icon={PlugZap}
							title="No remote MCP servers"
							description="Add an HTTP server to make its tools available to Friday."
						/>
					) : (
						remote.map((server) => (
							<McpServerRow
								key={server.id}
								server={server}
								testing={testing.has(server.id)}
								testResult={testResults[server.id]}
								onTest={() => test(server.id)}
								onSave={save}
								onRemove={() => remove(server.id)}
							/>
						))
					)}
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title="Local servers"
				description={`${root || '~/.friday/mcp/servers'} · Configure package commands and environment values here.`}
			>
				{loading ? (
					<SettingsPanel>
						<SettingsLoadingRows rows={2} />
					</SettingsPanel>
				) : local.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={PlugZap}
							title="No local MCP servers"
							description="Upload a folder containing mcp.json or add a local command."
						/>
					</SettingsPanel>
				) : (
					<div className="grid gap-2">
						{local.map((server) => (
							<McpLocalServerCard
								key={server.id}
								server={server}
								testing={testing.has(server.id)}
								testResult={testResults[server.id]}
								onTest={() => test(server.id)}
								onSave={server.source === 'configured' ? save : saveLocal}
								onRemove={server.source === 'configured' ? () => remove(server.id) : undefined}
							/>
						))}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default McpPage;
