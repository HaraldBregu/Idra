import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, LoaderCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';

const EmailPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<{ id: string; name: string }[]>([]);
	const [selectedProviderId, setSelectedProviderId] = useState<string>();
	const [name, setName] = useState('');
	const [host, setHost] = useState('');
	const [port, setPort] = useState('587');
	const [secure, setSecure] = useState(false);
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [from, setFrom] = useState('');
	const [loading, setLoading] = useState(true);
	const [adding, setAdding] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void window.email
			.getSettings()
			.then((settings) => {
				setProviders(settings.providers);
				setSelectedProviderId(settings.selectedProviderId);
			})
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
			.finally(() => setLoading(false));
	}, []);

	const handleSave = async (): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const settings = await window.email.saveProvider({
				name,
				host,
				port: Number(port),
				secure,
				username,
				password,
				from,
			});
			setProviders(settings.providers);
			setSelectedProviderId(settings.selectedProviderId);
			setName('');
			setHost('');
			setPort('587');
			setSecure(false);
			setUsername('');
			setPassword('');
			setFrom('');
			setAdding(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setSaving(false);
		}
	};

	const selectProvider = async (providerId: string): Promise<void> => {
		setSaving(true);
		setError(null);
		try {
			const settings = await window.email.selectProvider(providerId);
			setSelectedProviderId(settings.selectedProviderId);
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
				action={
					<Button variant="outline" size="sm" disabled={adding || loading} onClick={() => setAdding(true)}>
						<Plus className="size-3.5" />
						New SMTP server
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{adding && (
				<SettingsSection
					title="New SMTP server"
					description="Connect an SMTP server for sending email from Friday."
				>
					<Card size="sm" className="p-3!">
						<CardContent className="grid gap-2 p-0! sm:grid-cols-2">
							<Input className="sm:col-span-2" value={name} onChange={(event) => setName(event.target.value)} placeholder="Provider name" aria-label="SMTP provider name" disabled={saving} />
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
								<Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
								<Button type="button" size="sm" disabled={saving || !name.trim() || !host.trim() || !from.trim()} onClick={() => void handleSave()}>
									{saving && <LoaderCircle className="size-3.5 animate-spin" />}
									{t('common.save')}
								</Button>
							</div>
						</CardContent>
					</Card>
				</SettingsSection>
			)}

			<SettingsSection title="SMTP servers" description="Choose the active server used to send email.">
				{providers.length === 0 ? (
					<div className="px-0.5 text-[13px] text-muted-foreground">No SMTP servers configured.</div>
				) : (
					<div className="grid gap-2">
						{providers.map((provider) => (
							<Card key={provider.id} size="sm" className="p-0!">
								<Button type="button" variant="ghost" className="h-auto w-full justify-between px-3 py-2.5" disabled={saving} onClick={() => void selectProvider(provider.id)}>
									<span className="text-sm font-medium">{provider.name}</span>
									{provider.id === selectedProviderId && <Badge variant="secondary">Active</Badge>}
								</Button>
							</Card>
						))}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default EmailPage;
