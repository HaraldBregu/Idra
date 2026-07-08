import React, { useState } from 'react';
import type { McpData } from '@shared/mcp_types';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

function parseEnv(text: string): Record<string, string> | undefined {
	const env: Record<string, string> = {};
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		const eq = trimmed.indexOf('=');
		if (eq <= 0) continue;
		env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
	}
	return Object.keys(env).length > 0 ? env : undefined;
}

function formatEnv(env?: Readonly<Record<string, string>>): string {
	return Object.entries(env ?? {})
		.map(([key, value]) => `${key}=${value}`)
		.join('\n');
}

const TYPE_LABELS = { http: 'Remote (HTTP)', stdio: 'Local (command)' } as const;

export function McpServerDialog({
	trigger,
	initial,
	onSubmit,
}: {
	readonly trigger: React.ReactElement;
	readonly initial?: { readonly id: string; readonly entry: McpData };
	readonly onSubmit: (id: string, entry: McpData) => Promise<void>;
}): React.JSX.Element {
	const isEdit = Boolean(initial);
	const [open, setOpen] = useState(false);
	const [type, setType] = useState<McpData['type']>('http');
	const [id, setId] = useState('');
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [token, setToken] = useState('');
	const [clientId, setClientId] = useState('');
	const [clientSecret, setClientSecret] = useState('');
	const [command, setCommand] = useState('');
	const [args, setArgs] = useState('');
	const [env, setEnv] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const seed = (): void => {
		const entry = initial?.entry;
		setType(entry?.type ?? 'http');
		setId(initial?.id ?? '');
		setName(entry?.name ?? '');
		setUrl(entry?.type === 'http' ? entry.url : '');
		setToken(entry?.type === 'http' ? (entry.token ?? '') : '');
		setClientId(entry?.type === 'http' ? (entry.client_id ?? '') : '');
		setClientSecret(entry?.type === 'http' ? (entry.client_secret ?? '') : '');
		setCommand(entry?.type === 'stdio' ? entry.command : '');
		setArgs(entry?.type === 'stdio' ? (entry.args?.join(' ') ?? '') : '');
		setEnv(entry?.type === 'stdio' ? formatEnv(entry.env) : '');
		setError(null);
	};

	const submit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		const serverId = id.trim().toLowerCase();
		if (!serverId || (type === 'http' ? !url.trim() : !command.trim())) {
			setError(type === 'http' ? 'ID and server URL are required.' : 'ID and command are required.');
			return;
		}
		const now = new Date().toISOString();
		const base = {
			name: name.trim() || undefined,
			enabled: initial?.entry.enabled ?? true,
			created_at: initial?.entry.created_at ?? now,
			updated_at: now,
		};
		const entry: McpData =
			type === 'http'
				? {
						...(initial?.entry.type === 'http' ? initial.entry : {}),
						...base,
						type: 'http',
						url: url.trim(),
						token: token.trim() || undefined,
						client_id: clientId.trim() || undefined,
						client_secret: clientSecret.trim() || undefined,
					}
				: {
						...(initial?.entry.type === 'stdio' ? initial.entry : {}),
						...base,
						type: 'stdio',
						command: command.trim(),
						// ponytail: args split on whitespace; quoted arguments not supported
						args: args.trim() ? args.trim().split(/\s+/) : undefined,
						env: parseEnv(env),
					};
		setSaving(true);
		setError(null);
		try {
			await onSubmit(serverId, entry);
			setOpen(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				seed();
			}}
		>
			<DialogTrigger render={trigger} />
			<DialogContent>
				<form onSubmit={submit} className="grid gap-4">
					<DialogHeader>
						<DialogTitle>{isEdit ? 'Edit MCP server' : 'Add MCP server'}</DialogTitle>
						<DialogDescription>
							Remote MCP server over HTTP or local MCP server started as a command.
						</DialogDescription>
					</DialogHeader>

					<Field>
						<Label htmlFor="mcp-type">Type</Label>
						<Select value={type} onValueChange={(value) => setType(value as McpData['type'])} disabled={isEdit}>
							<SelectTrigger id="mcp-type" className="w-full">
								<SelectValue>{TYPE_LABELS[type]}</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="http">{TYPE_LABELS.http}</SelectItem>
								<SelectItem value="stdio">{TYPE_LABELS.stdio}</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					<Field>
						<Label htmlFor="mcp-id">ID</Label>
						<Input id="mcp-id" value={id} disabled={isEdit} onChange={(e) => setId(e.target.value)} placeholder="my-server" />
					</Field>
					<Field>
						<Label htmlFor="mcp-name">Name</Label>
						<Input id="mcp-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Server" />
					</Field>

					{type === 'http' ? (
						<>
							<Field>
								<Label htmlFor="mcp-url">Server URL</Label>
								<Input id="mcp-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/mcp" />
							</Field>
							<Field>
								<Label htmlFor="mcp-token">Access token (optional)</Label>
								<Input id="mcp-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" />
							</Field>
							<Field>
								<Label htmlFor="mcp-client-id">Client ID (optional)</Label>
								<Input id="mcp-client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" />
							</Field>
							<Field>
								<Label htmlFor="mcp-client-secret">Client secret (optional)</Label>
								<Input id="mcp-client-secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="off" />
							</Field>
						</>
					) : (
						<>
							<Field>
								<Label htmlFor="mcp-command">Command</Label>
								<Input id="mcp-command" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" autoComplete="off" />
							</Field>
							<Field>
								<Label htmlFor="mcp-args">Arguments (optional)</Label>
								<Input id="mcp-args" value={args} onChange={(e) => setArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem /tmp" autoComplete="off" />
							</Field>
							<Field>
								<Label htmlFor="mcp-env">Environment variables (optional)</Label>
								<Textarea id="mcp-env" value={env} onChange={(e) => setEnv(e.target.value)} placeholder={'API_KEY=value\nOTHER=value'} rows={3} autoComplete="off" />
							</Field>
						</>
					)}

					{error && <p className="text-[13px] text-destructive">{error}</p>}

					<DialogFooter>
						<DialogClose render={<Button type="button" variant="ghost">Cancel</Button>} />
						<Button type="submit" disabled={saving}>
							{saving ? 'Saving' : isEdit ? 'Save' : 'Add MCP server'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
