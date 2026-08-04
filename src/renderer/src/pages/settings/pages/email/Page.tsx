import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';

const EmailPage: React.FC = () => {
	const { t } = useTranslation();
	const [configured, setConfigured] = useState(false);
	const [host, setHost] = useState('');
	const [port, setPort] = useState('587');
	const [secure, setSecure] = useState(false);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [from, setFrom] = useState('');
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void window.email
			.getSettings()
			.then((settings) => {
				setConfigured(settings.configured);
				setEditing(!settings.configured);
			})
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
			.finally(() => setLoading(false));
	}, []);

	const handleSave = async (): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const settings = await window.email.saveSettings({
				host,
				port: Number(port),
				secure,
				username,
				password,
				from,
			});
			setConfigured(settings.configured);
			setPassword('');
			setEditing(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setSaving(false);
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.email.title')}
				description={t('settings.email.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.email.configuration')}>
				<Card
					className={cn(
						'rounded-lg border-border bg-card py-0 shadow-none',
						editing && 'border-ring ring-2 ring-ring/20'
					)}
				>
					<CardContent className="p-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-sm font-semibold text-foreground">SMTP</h2>
								<p className="text-xs text-muted-foreground">
									{loading
										? t('settings.email.loading')
										: configured
											? t('settings.email.configured')
											: t('settings.email.notConfigured')}
								</p>
							</div>
							{configured && !editing && (
								<Button type="button" variant="ghost" size="icon-xs" onClick={() => setEditing(true)}>
									<Pencil className="size-3.5" />
									<span className="sr-only">Edit SMTP settings</span>
								</Button>
							)}
						</div>

						{editing && (
							<div className="mt-3 grid gap-2 sm:grid-cols-2">
								<Input value={host} onChange={(event) => setHost(event.target.value)} placeholder="SMTP host" aria-label="SMTP host" disabled={saving} />
								<Input type="number" min="1" max="65535" value={port} onChange={(event) => setPort(event.target.value)} placeholder="Port" aria-label="SMTP port" disabled={saving} />
								<Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username (optional)" aria-label="SMTP username" disabled={saving} />
								<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password (optional)" aria-label="SMTP password" autoComplete="off" disabled={saving} />
								<Input className="sm:col-span-2" value={from} onChange={(event) => setFrom(event.target.value)} placeholder="Sender address" aria-label="SMTP sender address" disabled={saving} />
								<label className="flex items-center gap-2 text-xs text-muted-foreground">
									<Switch checked={secure} onCheckedChange={setSecure} size="sm" disabled={saving} />
									Use TLS (typically port 465)
								</label>
								<div className="flex justify-end gap-2">
									<Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
									<Button type="button" size="sm" disabled={saving || !host.trim() || !from.trim()} onClick={() => void handleSave()}>
										{saving && <LoaderCircle className="size-3.5 animate-spin" />}
										{t('common.save')}
									</Button>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default EmailPage;
