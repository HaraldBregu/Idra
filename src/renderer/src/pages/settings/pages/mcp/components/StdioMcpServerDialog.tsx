import React, { useState } from 'react';
import type { McpStdioData } from '@shared/mcp_types';
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

export function StdioMcpServerDialog({
	trigger,
	initial,
	onSubmit,
}: {
	readonly trigger: React.ReactElement;
	readonly initial?: { readonly id: string; readonly entry: McpStdioData };
	readonly onSubmit: (id: string, entry: McpStdioData) => Promise<void>;
}): React.JSX.Element {
	const isEdit = Boolean(initial);
	const [open, setOpen] = useState(false);
	const [id, setId] = useState('');
	const [name, setName] = useState('');
	const [command, setCommand] = useState('');
	const [args, setArgs] = useState('');
	const [env, setEnv] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const seed = (): void => {
		setId(initial?.id ?? '');
		setName(initial?.entry.name ?? '');
		setCommand(initial?.entry.command ?? '');
		setArgs(initial?.entry.args?.join(' ') ?? '');
		setEnv(formatEnv(initial?.entry.env));
		setError(null);
	};

	const submit = async (event: React.FormEvent): Promise<void> => {
		event.preventDefault();
		const serverId = id.trim().toLowerCase();
		if (!serverId || !command.trim()) {
			setError('ID and command are required.');
			return;
		}
		const now = new Date().toISOString();
		// ponytail: args split on whitespace; quoted arguments not supported
		const argList = args.trim() ? args.trim().split(/\s+/) : undefined;
		const entry: McpStdioData = {
			...initial?.entry,
			type: 'stdio',
			name: name.trim() || undefined,
			command: command.trim(),
			args: argList,
			env: parseEnv(env),
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
						<DialogTitle>{isEdit ? 'Edit local MCP server' : 'Add local MCP server'}</DialogTitle>
						<DialogDescription>
							Local MCP server started as a command and connected over stdio.
						</DialogDescription>
					</DialogHeader>

					<Field>
						<Label htmlFor="stdio-id">ID</Label>
						<Input id="stdio-id" value={id} disabled={isEdit} onChange={(e) => setId(e.target.value)} placeholder="my-server" />
					</Field>
					<Field>
						<Label htmlFor="stdio-name">Name</Label>
						<Input id="stdio-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Server" />
					</Field>
					<Field>
						<Label htmlFor="stdio-command">Command</Label>
						<Input id="stdio-command" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="npx" autoComplete="off" />
					</Field>
					<Field>
						<Label htmlFor="stdio-args">Arguments (optional)</Label>
						<Input id="stdio-args" value={args} onChange={(e) => setArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-filesystem /tmp" autoComplete="off" />
					</Field>
					<Field>
						<Label htmlFor="stdio-env">Environment variables (optional)</Label>
						<Textarea id="stdio-env" value={env} onChange={(e) => setEnv(e.target.value)} placeholder={'API_KEY=value\nOTHER=value'} rows={3} autoComplete="off" />
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
