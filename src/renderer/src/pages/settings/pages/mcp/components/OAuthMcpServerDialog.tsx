import React, { useState } from 'react';
import type { McpHttpData } from '@shared/mcp_types';
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

export function OAuthMcpServerDialog({
	trigger,
	initial,
	onSubmit,
}: {
	readonly trigger: React.ReactElement;
	readonly initial?: { readonly id: string; readonly entry: McpHttpData };
	readonly onSubmit: (id: string, entry: McpHttpData) => Promise<void>;
}): React.JSX.Element {
	const isEdit = Boolean(initial);
	const [open, setOpen] = useState(false);
	const [id, setId] = useState('');
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [token, setToken] = useState('');
	const [clientId, setClientId] = useState('');
	const [clientSecret, setClientSecret] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const seed = (): void => {
		setId(initial?.id ?? '');
		setName(initial?.entry.name ?? '');
		setUrl(initial?.entry.url ?? '');
		setToken(initial?.entry.token ?? '');
		setClientId(initial?.entry.client_id ?? '');
		setClientSecret(initial?.entry.client_secret ?? '');
		setError(null);
	};

	const submit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		const serverId = id.trim().toLowerCase();
		if (!serverId || !url.trim()) {
			setError('ID and server URL are required.');
			return;
		}
		const now = new Date().toISOString();
		const entry: McpHttpData = {
			...initial?.entry,
			type: 'http',
			name: name.trim() || undefined,
			url: url.trim(),
			token: token.trim() || undefined,
			client_id: clientId.trim() || undefined,
			client_secret: clientSecret.trim() || undefined,
			enabled: initial?.entry.enabled ?? true,
			created_at: initial?.entry.created_at ?? now,
			updated_at: now,
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
							Remote MCP server authenticated with OAuth client credentials.
						</DialogDescription>
					</DialogHeader>

					<Field>
						<Label htmlFor="oauth-id">ID</Label>
						<Input id="oauth-id" value={id} disabled={isEdit} onChange={(e) => setId(e.target.value)} placeholder="my-server" />
					</Field>
					<Field>
						<Label htmlFor="oauth-name">Name</Label>
						<Input id="oauth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Server" />
					</Field>
					<Field>
						<Label htmlFor="oauth-url">Server URL</Label>
						<Input id="oauth-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/mcp" />
					</Field>
					<Field>
						<Label htmlFor="oauth-client-id">Client ID</Label>
						<Input id="oauth-client-id" value={clientId} onChange={(e) => setClientId(e.target.value)} autoComplete="off" />
					</Field>
					<Field>
						<Label htmlFor="oauth-client-secret">Client secret</Label>
						<Input id="oauth-client-secret" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} autoComplete="off" />
					</Field>

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
