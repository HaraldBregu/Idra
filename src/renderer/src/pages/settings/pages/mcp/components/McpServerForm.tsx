import React, { useState } from 'react';
import type { McpData } from '@shared/mcp_types';
import { Button } from '@/components/ui/button';
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
import { McpOAuthButton } from './McpOAuthButton';

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

export function McpServerForm({
	initial,
	onSubmit,
	onCancel,
}: {
	readonly initial?: { readonly id: string; readonly entry: McpData };
	readonly onSubmit: (id: string, entry: McpData) => Promise<void>;
	readonly onCancel: () => void;
}): React.JSX.Element {
	const isEdit = Boolean(initial);
	const entry = initial?.entry;
	const [type, setType] = useState<McpData['type']>(entry?.type ?? 'http');
	const [id, setId] = useState(initial?.id ?? '');
	const [name, setName] = useState(entry?.name ?? '');
	const [url, setUrl] = useState(entry?.type === 'http' ? entry.url : '');
	const [token, setToken] = useState(entry?.type === 'http' ? (entry.token ?? '') : '');
	const [clientId, setClientId] = useState(entry?.type === 'http' ? (entry.client_id ?? '') : '');
	const [clientSecret, setClientSecret] = useState(
		entry?.type === 'http' ? (entry.client_secret ?? '') : ''
	);
	const [command, setCommand] = useState(entry?.type === 'stdio' ? entry.command : '');
	const [args, setArgs] = useState(entry?.type === 'stdio' ? (entry.args?.join(' ') ?? '') : '');
	const [env, setEnv] = useState(entry?.type === 'stdio' ? formatEnv(entry.env) : '');
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const serverId = id.trim().toLowerCase();

	const buildEntry = (): McpData => {
		const now = new Date().toISOString();
		const base = {
			name: name.trim() || undefined,
			enabled: initial?.entry.enabled ?? true,
			created_at: initial?.entry.created_at ?? now,
			updated_at: now,
		};
		return type === 'http'
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
	};

	const isValid = Boolean(serverId && (type === 'http' ? url.trim() : command.trim()));

	const submit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		if (!isValid) {
			setError(
				type === 'http' ? 'ID and server URL are required.' : 'ID and command are required.'
			);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await onSubmit(serverId, buildEntry());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	// ponytail: OAuth needs the server in the store first, so persist before starting
	const persist = async (): Promise<void> => {
		await window.mcp.save({ ...(await window.mcp.list()), [serverId]: buildEntry() });
	};

	return (
		<form onSubmit={submit} className="grid gap-4">
			<Field>
				<Label htmlFor="mcp-type">Type</Label>
				<Select
					value={type}
					onValueChange={(value) => setType(value as McpData['type'])}
					disabled={isEdit}
				>
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
				<Input
					id="mcp-id"
					value={id}
					disabled={isEdit}
					onChange={(e) => setId(e.target.value)}
					placeholder="my-server"
				/>
			</Field>
			<Field>
				<Label htmlFor="mcp-name">Name</Label>
				<Input
					id="mcp-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="My Server"
				/>
			</Field>

			{type === 'http' ? (
				<>
					<Field>
						<Label htmlFor="mcp-url">Server URL</Label>
						<Input
							id="mcp-url"
							value={url}
							onChange={(e) => setUrl(e.target.value)}
							placeholder="https://example.com/mcp"
						/>
					</Field>
					{isValid && <McpOAuthButton id={serverId} beforeStart={persist} />}
					<details>
						<summary className="cursor-pointer text-[13px] text-muted-foreground">Advanced</summary>
						<div className="grid gap-4 pt-4">
							<Field>
								<Label htmlFor="mcp-token">Access token (optional)</Label>
								<Input
									id="mcp-token"
									type="password"
									value={token}
									onChange={(e) => setToken(e.target.value)}
									autoComplete="off"
								/>
							</Field>
							<Field>
								<Label htmlFor="mcp-client-id">Client ID (optional)</Label>
								<Input
									id="mcp-client-id"
									value={clientId}
									onChange={(e) => setClientId(e.target.value)}
									autoComplete="off"
								/>
							</Field>
							<Field>
								<Label htmlFor="mcp-client-secret">Client secret (optional)</Label>
								<Input
									id="mcp-client-secret"
									type="password"
									value={clientSecret}
									onChange={(e) => setClientSecret(e.target.value)}
									autoComplete="off"
								/>
							</Field>
						</div>
					</details>
				</>
			) : (
				<>
					<Field>
						<Label htmlFor="mcp-command">Command</Label>
						<Input
							id="mcp-command"
							value={command}
							onChange={(e) => setCommand(e.target.value)}
							placeholder="npx"
							autoComplete="off"
						/>
					</Field>
					<Field>
						<Label htmlFor="mcp-args">Arguments (optional)</Label>
						<Input
							id="mcp-args"
							value={args}
							onChange={(e) => setArgs(e.target.value)}
							placeholder="-y @modelcontextprotocol/server-filesystem /tmp"
							autoComplete="off"
						/>
					</Field>
					<Field>
						<Label htmlFor="mcp-env">Environment variables (optional)</Label>
						<Textarea
							id="mcp-env"
							value={env}
							onChange={(e) => setEnv(e.target.value)}
							placeholder={'API_KEY=value\nOTHER=value'}
							rows={3}
							autoComplete="off"
						/>
					</Field>
				</>
			)}

			{error && <p className="text-[13px] text-destructive">{error}</p>}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="ghost" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={saving}>
					{saving ? 'Saving' : isEdit ? 'Save' : 'Add MCP server'}
				</Button>
			</div>
		</form>
	);
}
