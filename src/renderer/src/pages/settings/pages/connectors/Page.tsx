import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Plug, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { handleExternalLinkClick } from '@/lib/external-links';
import type {
	ConnectorApprovalMode,
	ConnectorInput,
	ConnectorUpdateInput,
	OpenAiConnectorId,
} from '../../../../../../shared/connector';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { ConnectorCard } from './components/ConnectorCard';
import { ConnectorCatalogItem } from './components/ConnectorCatalogItem';
import { ConnectorDocumentationRows } from './components/ConnectorDocumentationRows';
import { ConnectorIcon } from './components/ConnectorIcon';
import { useConnectors, type ConnectorCatalog } from './hooks/useConnectors';

interface ConnectorFormState {
	readonly id: string | null;
	readonly name: string;
	readonly connectorId: OpenAiConnectorId | '';
	readonly serverLabel: string;
	readonly serverDescription: string;
	readonly authorization: string;
	readonly requireApproval: ConnectorApprovalMode;
	readonly allowedTools: string[];
	readonly deferLoading: boolean;
	readonly enabled: boolean;
}

const emptyForm: ConnectorFormState = {
	id: null,
	name: '',
	connectorId: '',
	serverLabel: '',
	serverDescription: '',
	authorization: '',
	requireApproval: 'always',
	allowedTools: [],
	deferLoading: false,
	enabled: true,
};

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function formToInput(form: ConnectorFormState): ConnectorInput {
	if (!form.connectorId) throw new Error('Select a connector.');
	return {
		name: form.name,
		connectorId: form.connectorId,
		serverLabel: form.serverLabel || serverLabelFromName(form.name),
		serverDescription: form.serverDescription || undefined,
		authorization: form.authorization,
		requireApproval: form.requireApproval,
		allowedTools: form.allowedTools,
		deferLoading: form.deferLoading,
		enabled: form.enabled,
	};
}

function isGoogleOAuth(catalog: ConnectorCatalog, connectorId: string): boolean {
	const item = catalog.find((c) => c.id === connectorId);
	return Boolean(item && 'authKind' in item && item.authKind === 'google_oauth');
}

function catalogItem(catalog: ConnectorCatalog, connectorId: string): ConnectorCatalog[number] | undefined {
	return catalog.find((c) => c.id === connectorId);
}

function getSetupUrl(item: ConnectorCatalog[number] | undefined): string | undefined {
	return item && 'setupUrl' in item ? item.setupUrl : undefined;
}

function getSetupInstructions(item: ConnectorCatalog[number] | undefined): readonly string[] {
	return item && 'setupInstructions' in item ? item.setupInstructions : [];
}

function getRedirectUri(item: ConnectorCatalog[number] | undefined): string {
	return item && 'redirectUri' in item ? item.redirectUri : '';
}

const ConnectorsPage: React.FC = () => {
	const navigate = useNavigate();
	const {
		catalog, connectors, busyId,
		connectingId,
		error, setError,
		statusMessage,
		load,
		connectOAuth,
		toggleConnector,
	} = useConnectors();

	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ConnectorFormState>(emptyForm);
	const [saving, setSaving] = useState(false);

	const selected = catalogItem(catalog, form.connectorId);
	const googleOAuth = isGoogleOAuth(catalog, form.connectorId);
	const canSubmit =
		form.name.trim().length > 0 &&
		form.connectorId.length > 0 &&
		(googleOAuth || form.authorization.trim().length > 0) &&
		!saving;

	const update = <TKey extends keyof ConnectorFormState>(key: TKey, value: ConnectorFormState[TKey]): void => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const selectConnector = (connectorId: OpenAiConnectorId): void => {
		const item = catalog.find((c) => c.id === connectorId);
		setForm((prev) => ({
			...prev,
			connectorId,
			name: prev.name || item?.name || '',
			serverLabel: prev.serverLabel || serverLabelFromName(item?.name ?? ''),
			serverDescription: prev.serverDescription || item?.description || '',
			allowedTools: [],
		}));
	};

	const toggleAllowedTool = (tool: string): void => {
		setForm((prev) => ({
			...prev,
			allowedTools: prev.allowedTools.includes(tool)
				? prev.allowedTools.filter((t) => t !== tool)
				: [...prev.allowedTools, tool],
		}));
	};

	const resetForm = (): void => {
		setForm(emptyForm);
		setShowForm(false);
	};

	const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const input = formToInput(form);
			if (form.id) {
				await window.connectors.update(form.id, input as ConnectorUpdateInput);
			} else {
				await window.connectors.add(input);
			}
			resetForm();
			await load();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	const openConnectorDetails = (id: string): void => {
		navigate(`/settings/connectors/connectordetails/${encodeURIComponent(id)}`);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title="Connectors"
				description="Configure OpenAI-maintained connectors for Responses API tool use."
				action={
					<Button
						type="button"
						size="xs"
						onClick={() => { setForm(emptyForm); setShowForm(true); }}
					>
						<Plus className="size-3" />
						Add Connector
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{statusMessage && <SettingsNotice variant="default">{statusMessage}</SettingsNotice>}

			{showForm && (
				<SettingsSection title={form.id ? 'Edit connector' : 'Add connector'}>
					<SettingsPanel>
						<form onSubmit={submit}>

							{/* Basic fields */}
							<div className="grid gap-3 border-b border-border/60 p-3 md:grid-cols-2">
								<SettingsField id="connector-kind" label="Connector">
									<Select
										value={form.connectorId || null}
										onValueChange={(value) => { if (value) selectConnector(value as OpenAiConnectorId); }}
									>
										<SelectTrigger id="connector-kind" size="sm" className="w-full text-xs [&_svg]:size-3" aria-label="Connector">
											<SelectValue placeholder="Select connector" />
										</SelectTrigger>
										<SelectContent>
											{catalog.map((c) => (
												<SelectItem key={c.id} value={c.id}>
													<span className="flex min-w-0 items-center gap-2">
														<ConnectorIcon
															directConnectorId={c.directConnectorId}
															name={c.name}
															className="size-4 rounded-sm border-0 bg-transparent p-0"
															fallbackClassName="size-3"
														/>
														<span className="truncate">{c.name}</span>
													</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField id="connector-name" label="Name">
									<Input
										id="connector-name"
										value={form.name}
										onChange={(e) => update('name', e.target.value)}
										placeholder="Google Calendar"
										className="h-7 px-2 text-xs md:text-xs"
									/>
								</SettingsField>

								<SettingsField id="connector-server-label" label="Server label">
									<Input
										id="connector-server-label"
										value={form.serverLabel}
										onChange={(e) => update('serverLabel', e.target.value)}
										placeholder="google_calendar"
										className="h-7 px-2 text-xs md:text-xs"
									/>
								</SettingsField>

								<SettingsField id="connector-approval-policy" label="Approval policy">
									<Select
										value={form.requireApproval}
										onValueChange={(value) => { if (value) update('requireApproval', value as ConnectorApprovalMode); }}
									>
										<SelectTrigger id="connector-approval-policy" size="sm" className="w-full text-xs [&_svg]:size-3" aria-label="Approval policy">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="always">Always require approval</SelectItem>
											<SelectItem value="never_for_allowed_tools">Skip approval for allowed tools</SelectItem>
											<SelectItem value="never">Never require approval</SelectItem>
										</SelectContent>
									</Select>
								</SettingsField>

								<div className="md:col-span-2">
									<SettingsField id="connector-description" label="Description">
										<Textarea
											id="connector-description"
											value={form.serverDescription}
											onChange={(e) => update('serverDescription', e.target.value)}
											placeholder={selected?.description}
											className="min-h-14 py-1.5 text-xs md:text-xs"
										/>
									</SettingsField>
								</div>

								{selected && selected.scopes.length > 0 && (
									<div className="md:col-span-2 flex flex-wrap gap-1.5">
										{selected.scopes.map((scope) => (
											<Badge key={scope} variant="outline" className="h-4 px-1.5 text-[10px]">
												{scope}
											</Badge>
										))}
									</div>
								)}
							</div>

							{/* Setup instructions */}
							{selected && getSetupInstructions(selected).length > 0 && (
								<div className="grid gap-1.5 border-b border-border/60 px-3 py-2.5">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="text-[11px] font-medium text-foreground">Setup instructions</span>
										{getSetupUrl(selected) && (
											<a
												href={getSetupUrl(selected)}
												target="_blank"
												rel="noreferrer"
												onClick={(e) => handleExternalLinkClick(e, getSetupUrl(selected))}
												className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
											>
												Open setup
												<ExternalLink className="size-3" />
											</a>
										)}
									</div>
									<ol className="grid list-decimal gap-1 pl-4 text-[11px] leading-4 text-muted-foreground">
										{getSetupInstructions(selected).map((instruction) => (
											<li key={instruction}>{instruction}</li>
										))}
									</ol>
								</div>
							)}

							{selected && (
								<ConnectorDocumentationRows connector={selected} className="border-b border-border/60" />
							)}

							{/* Auth */}
							<div className="border-b border-border/60 p-3">
								{googleOAuth ? (
									<SettingsNotice variant="default">
										Google OAuth uses <span className="font-mono">GOOGLE_OAUTH_CLIENT_ID</span> and{' '}
										<span className="font-mono">GOOGLE_OAUTH_CLIENT_SECRET</span> from the app environment.
										Save, then connect with Google OAuth. Redirect:{' '}
										<span className="font-mono">{getRedirectUri(selected)}</span>
									</SettingsNotice>
								) : (
									<SettingsField id="connector-authorization" label="OAuth access token">
										<Input
											id="connector-authorization"
											type="password"
											value={form.authorization}
											onChange={(e) => update('authorization', e.target.value)}
											placeholder="Paste OAuth access token"
											className="h-7 px-2 text-xs md:text-xs"
										/>
									</SettingsField>
								)}
							</div>

							{/* Allowed tools */}
							<div className="grid gap-2 border-b border-border/60 px-3 py-2.5">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="text-[11px] font-medium text-foreground">Allowed tools</span>
									<span className="text-[11px] text-muted-foreground">
										Leave all unselected to allow every available tool.
									</span>
								</div>
								<div className="flex min-h-8 flex-wrap gap-1.5">
									{selected ? (
										selected.tools.map((tool) => {
											const active = form.allowedTools.includes(tool);
											return (
												<Button
													key={tool}
													type="button"
													variant={active ? 'secondary' : 'outline'}
													size="xs"
													aria-pressed={active}
													onClick={() => toggleAllowedTool(tool)}
												>
													{tool}
												</Button>
											);
										})
									) : (
										<p className="text-[11px] text-muted-foreground">Select a connector first.</p>
									)}
								</div>
							</div>

							{/* Toggles */}
							<div className="grid divide-y divide-border/60 border-b border-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
								<div className="flex items-center justify-between gap-3 px-3 py-2.5">
									<div className="min-w-0">
										<label htmlFor="connector-defer-loading" className="block cursor-pointer text-[13px] font-medium text-foreground">
											Defer tool loading
										</label>
										<p className="text-[11px] leading-4 text-muted-foreground">
											Load tools only when the connector is used.
										</p>
									</div>
									<Switch
										size="sm"
										id="connector-defer-loading"
										checked={form.deferLoading}
										onCheckedChange={(checked) => update('deferLoading', checked)}
									/>
								</div>
								<div className="flex items-center justify-between gap-3 px-3 py-2.5">
									<div className="min-w-0">
										<label htmlFor="connector-enabled" className="block cursor-pointer text-[13px] font-medium text-foreground">
											Enabled
										</label>
										<p className="text-[11px] leading-4 text-muted-foreground">
											Make this connector available to agent runs.
										</p>
									</div>
									<Switch
										size="sm"
										id="connector-enabled"
										checked={form.enabled}
										onCheckedChange={(checked) => update('enabled', checked)}
									/>
								</div>
							</div>

							{/* Footer */}
							<div className="flex flex-wrap justify-end gap-2 px-3 py-2">
								<Button type="button" variant="outline" size="xs" onClick={resetForm} disabled={saving}>
									Cancel
								</Button>
								<Button type="submit" size="xs" disabled={!canSubmit}>
									{saving ? 'Saving...' : form.id ? 'Save Connector' : 'Add Connector'}
								</Button>
							</div>

						</form>
					</SettingsPanel>
				</SettingsSection>
			)}

			<SettingsSection title="Configured connectors">
				{connectors.length === 0 ? (
					<SettingsPanel>
						<SettingsEmptyState
							icon={Plug}
							title="No connectors configured yet."
							description="Add a connector to make external tools available to agent runs."
						/>
					</SettingsPanel>
				) : (
					<div className="grid gap-2">
						{connectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								busy={busyId === connector.id}
								connecting={connectingId === connector.id}
								onConnectOAuth={() => void connectOAuth(connector)}
								onToggle={() => void toggleConnector(connector)}
								onViewDetails={() => openConnectorDetails(connector.id)}
							/>
						))}
					</div>
				)}
			</SettingsSection>

			{catalog.length > 0 && (
				<SettingsSection title="Available connectors">
					<div className="grid gap-2">
						{catalog.map((item) => (
							<ConnectorCatalogItem
								key={item.id}
								item={item}
								onAdd={() => {
									selectConnector(item.id as OpenAiConnectorId);
									setShowForm(true);
									window.scrollTo({ top: 0, behavior: 'smooth' });
								}}
							/>
						))}
					</div>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
