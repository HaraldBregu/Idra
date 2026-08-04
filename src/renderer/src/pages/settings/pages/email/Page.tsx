import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Plus } from 'lucide-react';
import type { SmtpProviderInput, SmtpProviderSummary } from '@shared/email_types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { SmtpServerCard } from './components/SmtpServerCard';
import { SmtpServerForm } from './components/SmtpServerForm';

const EmailPage: React.FC = () => {
	const { t } = useTranslation();
	const [providers, setProviders] = useState<SmtpProviderSummary[]>([]);
	const [selectedProviderId, setSelectedProviderId] = useState<string>();
	const [loading, setLoading] = useState(true);
	const [adding, setAdding] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const applySettings = (settings: Awaited<ReturnType<typeof window.email.getSettings>>): void => {
		setProviders(settings.providers);
		setSelectedProviderId(settings.selectedProviderId);
	};

	useEffect(() => {
		void window.email
			.getSettings()
			.then(applySettings)
			.catch((cause: unknown) => setError(cause instanceof Error ? cause.message : String(cause)))
			.finally(() => setLoading(false));
	}, []);

	const saveProvider = async (input: SmtpProviderInput, providerId?: string): Promise<void> => {
		setError(null);
		try {
			applySettings(await window.email.saveProvider(input, providerId));
			setAdding(false);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
			throw cause;
		}
	};

	const selectProvider = async (providerId: string): Promise<void> => {
		setError(null);
		try {
			applySettings(await window.email.selectProvider(providerId));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		}
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.email.title')} description={t('settings.email.description')} action={<Button variant="outline" size="sm" disabled={adding || loading} onClick={() => setAdding(true)}><Plus className="size-3.5" />New SMTP server</Button>} />

			{error && <SettingsNotice variant="destructive" icon={AlertTriangle}>{error}</SettingsNotice>}

			{adding && (
				<SettingsSection title="New SMTP server" description="Connect an SMTP server for sending email from Friday.">
					<Card size="sm" className="p-3!"><SmtpServerForm onSubmit={saveProvider} onCancel={() => setAdding(false)} /></Card>
				</SettingsSection>
			)}

			<SettingsSection title="SMTP servers" description="Choose the active server used to send email.">
				{providers.length === 0 ? (
					<div className="px-0.5 text-[13px] text-muted-foreground">No SMTP servers configured.</div>
				) : (
					<div className="grid gap-2">
						{providers.map((provider) => <SmtpServerCard key={provider.id} provider={provider} active={provider.id === selectedProviderId} onActivate={() => selectProvider(provider.id)} onSave={(input) => saveProvider(input, provider.id)} />)}
					</div>
				)}
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default EmailPage;
