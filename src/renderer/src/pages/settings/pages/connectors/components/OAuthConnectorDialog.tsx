import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { McpHttpData } from '@shared/mcp';
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

export function OAuthConnectorDialog({
	onSubmit,
}: {
	readonly onSubmit: (id: string, entry: McpHttpData) => Promise<void>;
}): React.JSX.Element {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [url, setUrl] = useState('');
	const [clientId, setClientId] = useState('');
	const [clientSecret, setClientSecret] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const reset = (): void => {
		setName('');
		setUrl('');
		setClientId('');
		setClientSecret('');
		setError(null);
	};

	const submit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		const id = name.trim().toLowerCase();
		if (!id || !url.trim() || !clientId.trim()) {
			setError('Name, server URL and client ID are required.');
			return;
		}
		const now = new Date().toISOString();
		const entry: McpHttpData = {
			type: 'http',
			url: url.trim(),
			client_id: clientId.trim(),
			client_secret: clientSecret.trim() || undefined,
			enabled: true,
			created_at: now,
			updated_at: now,
		};
		setSaving(true);
		setError(null);
		try {
			await onSubmit(id, entry);
			reset();
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
				if (!next) reset();
			}}
		>
			<DialogTrigger render={<Button variant="outline" size="sm" />}>
				<Plus className="size-3.5" />
				Add OAuth connector
			</DialogTrigger>
			<DialogContent>
				<form onSubmit={submit} className="grid gap-4">
					<DialogHeader>
						<DialogTitle>Add OAuth connector</DialogTitle>
						<DialogDescription>
							Remote MCP server authenticated with OAuth client credentials.
						</DialogDescription>
					</DialogHeader>

					<Field>
						<Label htmlFor="oauth-name">Name</Label>
						<Input id="oauth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-server" />
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
						<DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose>
						<Button type="submit" disabled={saving}>
							{saving ? 'Saving' : 'Add connector'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
