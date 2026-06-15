import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, LogIn, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { McpServerConfig, McpTransportConfig } from '../../../../../../../shared/mcp/types';
import { CONNECTOR_DEFAULTS } from '../../../../../../../shared/connector';
import {
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../../../components';

type TransportType = McpTransportConfig['type'];

function parseLines(text: string): string[] {
	return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function parseKeyValueLines(text: string, sep: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const line of parseLines(text)) {
		const idx = line.indexOf(sep);
		if (idx < 1) continue;
		const key = line.slice(0, idx).trim();
		const value = line.slice(idx + sep.length).trim();
		if (key) result[key] = value;
	}
	return result;
}

function serializeLines(values: string[] | undefined): string {
	return (values ?? []).join('\n');
}

function serializeKeyValueLines(values: Record<string, string> | undefined, sep: string): string {
	return Object.entries(values ?? {})
		.map(([k, v]) => `${k}${sep}${v}`)
		.join('\n');
}

function buildTransport(
	type: TransportType,
	command: string,
	argsText: string,
	envText: string,
	cwd: string,
	url: string,
	headersText: string
): McpTransportConfig {
	if (type === 'stdio') {
		const config: McpTransportConfig = {
			type: 'stdio',
			command: command.trim(),
			args: parseLines(argsText),
			env: parseKeyValueLines(envText, '='),
		};
		const trimmedCwd = cwd.trim();
		if (trimmedCwd) config.cwd = trimmedCwd;
		return config;
	}
	const headers = parseKeyValueLines(headersText, ':');
	if (type === 'sse') {
		return { type: 'sse', url: url.trim(), headers };
	}
	return { type: 'http', url: url.trim(), headers };
}

function isValid(type: TransportType, command: string, url: string, label: string): boolean {
	if (!label.trim()) return false;
	if (type === 'stdio') return Boolean(command.trim());
	return Boolean(url.trim());
}

const McpServerPage: React.FC = () => {
	const navigate = useNavigate();
	const { serverId } = useParams<{ serverId: string }>();
	const isNew = serverId === 'new';

	const [loading, setLoading] = useState(!isNew);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notFound, setNotFound] = useState(false);

	const [label, setLabel] = useState('');
	const [transportType, setTransportType] = useState<TransportType>('stdio');
	const [command, setCommand] = useState('');
	const [argsText, setArgsText] = useState('');
	const [envText, setEnvText] = useState('');
	const [cwd, setCwd] = useState('');
	const [url, setUrl] = useState('');
	const [headersText, setHeadersText] = useState('');
	const [enabled, setEnabled] = useState(true);
	const [authorizing, setAuthorizing] = useState(false);

	useEffect(() => {
		if (isNew) return;

		let mounted = true;
		void window.mcp.listServers().then(
			(servers) => {
				if (!mounted) return;
				const server = servers.find((s) => s.id === serverId);
				if (!server) {
					setNotFound(true);
					setLoading(false);
					return;
				}
				setLabel(server.label);
				setEnabled(server.enabled);
				const t = server.transport;
				setTransportType(t.type);
				if (t.type === 'stdio') {
					setCommand(t.command);
					setArgsText(serializeLines(t.args));
					setEnvText(serializeKeyValueLines(t.env, '='));
					setCwd(t.cwd ?? '');
				} else {
					setUrl(t.url);
					setHeadersText(serializeKeyValueLines(t.headers, ': '));
				}
				setLoading(false);
			},
			(err) => {
				if (!mounted) return;
				setError(err instanceof Error ? err.message : String(err));
				setLoading(false);
			}
		);

		return () => {
			mounted = false;
		};
	}, [isNew, serverId]);

	const googleOAuthConfig = (transportType === 'http' || transportType === 'sse')
		? (url.toLowerCase().includes('googleapis.com')
			? (url.includes('calendar')
				? CONNECTOR_DEFAULTS.find((d) => d.id === 'calendar')?.oauth
				: CONNECTOR_DEFAULTS.find((d) => d.id === 'gmail')?.oauth)
			: undefined)
		: undefined;

	const handleAuthorize = async (): Promise<void> => {
		if (!googleOAuthConfig) return;
		setAuthorizing(true);
		setError(null);
		try {
			const result = await window.connectors.authorizeOAuth(googleOAuthConfig);
			const existing = parseKeyValueLines(headersText, ':');
			existing['Authorization'] = `Bearer ${result.accessToken}`;
			setHeadersText(serializeKeyValueLines(existing, ': '));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setAuthorizing(false);
		}
	};

	const handleSave = async (): Promise<void> => {
		if (!isValid(transportType, command, url, label)) return;

		setSaving(true);
		setError(null);
		try {
			const now = new Date().toISOString();
			const config: McpServerConfig = {
				id: isNew ? crypto.randomUUID() : serverId!,
				label: label.trim(),
				transport: buildTransport(transportType, command, argsText, envText, cwd, url, headersText),
				enabled,
				createdAt: now,
				updatedAt: now,
			};
			await window.mcp.upsertServer(config);
			navigate('/settings/mcp');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (): Promise<void> => {
		if (!serverId || isNew) return;
		if (!window.confirm('Delete this MCP server?')) return;

		setDeleting(true);
		setError(null);
		try {
			await window.mcp.deleteServer(serverId);
			navigate('/settings/mcp');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setDeleting(false);
		}
	};

	const title = isNew ? 'Add MCP Server' : (label || 'Server Details');
	const valid = isValid(transportType, command, url, label);

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title="Server Details" />
			</SettingsPageShell>
		);
	}

	if (notFound) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title="Server Details" />
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					Server not found. It may have been removed.
				</SettingsNotice>
			</SettingsPageShell>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={title}
				description={isNew ? 'Configure a new MCP server connection.' : undefined}
				action={
					!isNew ? (
						<Button
							variant="outline"
							size="xs"
							onClick={() => void handleDelete()}
							disabled={deleting || saving}
							className="text-destructive hover:text-destructive"
						>
							<Trash2 className="size-3" />
							{deleting ? 'Deleting…' : 'Delete'}
						</Button>
					) : undefined
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title="Configuration">
				<SettingsPanel>
					<div className="flex flex-col gap-4 p-3">
						<SettingsField id="mcp-label" label="Label">
							<Input
								id="mcp-label"
								value={label}
								onChange={(e) => setLabel(e.target.value)}
								placeholder="My MCP Server"
								className="h-8 text-sm"
							/>
						</SettingsField>

						<SettingsField id="mcp-transport" label="Transport">
							<Select
								value={transportType}
								onValueChange={(v) => setTransportType(v as TransportType)}
							>
								<SelectTrigger id="mcp-transport" className="h-8 text-sm">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="stdio">stdio</SelectItem>
									<SelectItem value="sse">SSE</SelectItem>
									<SelectItem value="http">HTTP</SelectItem>
								</SelectContent>
							</Select>
						</SettingsField>

						{transportType === 'stdio' && (
							<>
								<SettingsField id="mcp-command" label="Command">
									<Input
										id="mcp-command"
										value={command}
										onChange={(e) => setCommand(e.target.value)}
										placeholder="npx -y @modelcontextprotocol/server-filesystem"
										className="h-8 font-mono text-sm"
									/>
								</SettingsField>

								<SettingsField
									id="mcp-args"
									label="Arguments"
									description="One argument per line"
								>
									<Textarea
										id="mcp-args"
										value={argsText}
										onChange={(e) => setArgsText(e.target.value)}
										placeholder="/path/to/directory"
										className="font-mono text-xs"
										rows={3}
									/>
								</SettingsField>

								<SettingsField
									id="mcp-env"
									label="Environment variables"
									description="KEY=value, one per line"
								>
									<Textarea
										id="mcp-env"
										value={envText}
										onChange={(e) => setEnvText(e.target.value)}
										placeholder="API_KEY=secret"
										className="font-mono text-xs"
										rows={3}
									/>
								</SettingsField>

								<SettingsField
									id="mcp-cwd"
									label="Working directory"
									description="Optional"
								>
									<Input
										id="mcp-cwd"
										value={cwd}
										onChange={(e) => setCwd(e.target.value)}
										placeholder="/path/to/directory"
										className="h-8 font-mono text-sm"
									/>
								</SettingsField>
							</>
						)}

						{(transportType === 'sse' || transportType === 'http') && (
							<>
								<SettingsField id="mcp-url" label="URL">
									<Input
										id="mcp-url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder={
											transportType === 'sse'
												? 'https://mcp.example.com/sse'
												: 'https://mcp.example.com/mcp'
										}
										className="h-8 font-mono text-sm"
									/>
								</SettingsField>

								{googleOAuthConfig && (
									<div className="flex items-center gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5">
										<div className="flex-1 min-w-0">
											<p className="text-xs font-medium">Google authentication</p>
											<p className="text-[11px] text-muted-foreground mt-0.5">
												Authorize with Google to set a fresh access token in the headers below.
											</p>
										</div>
										<Button
											type="button"
											variant="outline"
											size="xs"
											onClick={() => void handleAuthorize()}
											disabled={authorizing}
											className="shrink-0"
										>
											<LogIn className="size-3" />
											{authorizing ? 'Authorizing…' : 'Connect with Google'}
										</Button>
									</div>
								)}

								<SettingsField
									id="mcp-headers"
									label="Headers"
									description="Key: Value, one per line"
								>
									<Textarea
										id="mcp-headers"
										value={headersText}
										onChange={(e) => setHeadersText(e.target.value)}
										placeholder="Authorization: Bearer token"
										className="font-mono text-xs"
										rows={3}
									/>
								</SettingsField>
							</>
						)}
					</div>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection title="Options">
				<SettingsPanel>
					<SettingsRow
						title="Enabled"
						description="Connect this server when the agent starts."
						actions={
							<Switch
								checked={enabled}
								onCheckedChange={setEnabled}
								aria-label="Enabled"
							/>
						}
					/>
				</SettingsPanel>
			</SettingsSection>

			<div className="flex justify-end">
				<Button
					onClick={() => void handleSave()}
					disabled={saving || deleting || !valid}
					size="sm"
				>
					{saving ? 'Saving…' : 'Save'}
				</Button>
			</div>
		</SettingsPageShell>
	);
};

export default McpServerPage;
