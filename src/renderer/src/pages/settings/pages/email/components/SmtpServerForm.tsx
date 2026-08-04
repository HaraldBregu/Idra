import React, { useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import type { SmtpProviderInput, SmtpProviderSummary } from '@shared/email_types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

export function SmtpServerForm({
	initial,
	onCancel,
	onSubmit,
}: {
	readonly initial?: SmtpProviderSummary;
	readonly onCancel: () => void;
	readonly onSubmit: (input: SmtpProviderInput) => Promise<void>;
}): React.JSX.Element {
	const [name, setName] = useState(initial?.name ?? '');
	const [host, setHost] = useState(initial?.host ?? '');
	const [port, setPort] = useState(String(initial?.port ?? 587));
	const [secure, setSecure] = useState(initial?.secure ?? false);
	const [username, setUsername] = useState(initial?.username ?? '');
	const [password, setPassword] = useState('');
	const [from, setFrom] = useState(initial?.from ?? '');
	const [saving, setSaving] = useState(false);

	const submit = async (): Promise<void> => {
		setSaving(true);
		try {
			await onSubmit({ name, host, port: Number(port), secure, username, password, from });
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="grid gap-2 sm:grid-cols-2">
			<Input className="sm:col-span-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Provider name" aria-label="SMTP provider name" disabled={saving} />
			<Input value={host} onChange={(event) => setHost(event.target.value)} placeholder="SMTP host" aria-label="SMTP host" disabled={saving} />
			<Input type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} placeholder="Port" aria-label="SMTP port" disabled={saving} />
			<Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username (optional)" aria-label="SMTP username" disabled={saving} />
			<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={initial ? 'Leave blank to keep the current password' : 'Password (optional)'} aria-label="SMTP password" autoComplete="off" disabled={saving} />
			<Input className="sm:col-span-2" value={from} onChange={(event) => setFrom(event.target.value)} placeholder="Sender address" aria-label="SMTP sender address" disabled={saving} />
			<label className="flex items-center gap-2 text-xs text-muted-foreground">
				<Switch checked={secure} onCheckedChange={setSecure} size="sm" disabled={saving} />
				Use TLS (typically port 465)
			</label>
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" size="sm" disabled={saving} onClick={onCancel}>Cancel</Button>
				<Button type="button" size="sm" disabled={saving || !name.trim() || !host.trim() || !from.trim()} onClick={() => void submit()}>
					{saving && <LoaderCircle className="size-3.5 animate-spin" />}
					Save
				</Button>
			</div>
		</div>
	);
}
