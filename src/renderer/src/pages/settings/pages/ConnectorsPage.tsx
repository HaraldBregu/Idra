import React, { useEffect, useState } from 'react';
import { AlertTriangle, ExternalLink, Plug, Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type {
	ConnectorApprovalMode,
	ConnectorConfig,
	ConnectorInput,
	ConnectorTool,
	ConnectorUpdateInput,
	ConnectorView,
	OPENAI_CONNECTOR_CATALOG,
	OpenAiConnectorId,
} from '../../../../../shared/connectors';
import { ConnectorCard } from '../connectors/ConnectorCard';
import { ConnectorToolsList } from '../connectors/ConnectorToolsList';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../components';

type ConnectorCatalog = ReadonlyArray<(typeof OPENAI_CONNECTOR_CATALOG)[number]>;

interface ConnectorFormState {
	readonly id: string | null;
	readonly name: string;
	readonly connectorId: OpenAiConnectorId | '';
	readonly serverLabel: string;
	readonly serverDescription: string;
	readonly authorization: string;
	readonly oauthClientId: string;
	readonly oauthClientSecret: string;
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
	oauthClientId: '',
	oauthClientSecret: '',
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
	if (!form.connectorId) {
		throw new Error('Select a connector.');
	}

	return {
		name: form.name,
		connectorId: form.connectorId,
		serverLabel: form.serverLabel || serverLabelFromName(form.name),
		serverDescription: form.serverDescription || undefined,
		authorization: form.authorization,
		oauthClientId: form.oauthClientId || undefined,
		oauthClientSecret: form.oauthClientSecret || undefined,
		requireApproval: form.requireApproval,
		allowedTools: form.allowedTools,
		deferLoading: form.deferLoading,
		enabled: form.enabled,
	};
}

function connectorToForm(connector: ConnectorConfig): ConnectorFormState {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		serverLabel: connector.serverLabel,
		serverDescription: connector.serverDescription ?? '',
		authorization: connector.authorization,
		oauthClientId: connector.oauth?.clientId ?? '',
		oauthClientSecret: '',
		requireApproval: connector.requireApproval,
		allowedTools: connector.allowedTools,
		deferLoading: connector.deferLoading,
		enabled: connector.enabled,
	};
}

function isGoogleOAuthCatalogItem(connector: ConnectorCatalog[number] | undefined): boolean {
	return Boolean(connector && 'authKind' in connector && connector.authKind === 'google_oauth');
}

function catalogRedirectUri(connector: ConnectorCatalog[number] | undefined): string {
	return connector && 'redirectUri' in connector ? connector.redirectUri : '';
}

function catalogSetupUrl(connector: ConnectorCatalog[number] | undefined): string | undefined {
	return connector && 'setupUrl' in connector ? connector.setupUrl : undefined;
}

function catalogSetupInstructions(connector: ConnectorCatalog[number] | undefined): readonly string[] {
	return connector && 'setupInstructions' in connector ? connector.setupInstructions : [];
}

const ConnectorsPage: React.FC = () => {
	const [catalog, setCatalog] = useState<ConnectorCatalog>([]);
	const [connectors, setConnectors] = useState<ConnectorView[]>([]);
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [selectedTools, setSelectedTools] = useState<ConnectorTool[]>([]);
	const [showForm, setShowForm] = useState(false);
	const [form, setForm] = useState<ConnectorFormState>(emptyForm);
	const [saving, setSaving] = useState(false);

	const selectedCatalog = catalog.find((item) => item.id === form.connectorId);
	const isGoogleOAuth = isGoogleOAuthCatalogItem(selectedCatalog);
	const canSubmit =
		form.name.trim().length > 0 &&
		form.connectorId.length > 0 &&
		(isGoogleOAuth
			? form.oauthClientId.trim().length > 0 && (Boolean(form.id) || form.oauthClientSecret.trim().length > 0)
			: form.authorization.trim().length > 0) &&
		!saving;

	const loadConnectors = async (): Promise<void> => {
		try {
			const [nextCatalog, nextConnectors] = await Promise.all([
				window.connectors.catalog(),
				window.connectors.list(),
			]);
			setCatalog(nextCatalog);
			setConnectors(nextConnectors);
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : String(loadError));
		}
	};

	useEffect(() => {
		void loadConnectors();
	}, []);

	const update = <TKey extends keyof ConnectorFormState>(
		key: TKey,
		value: ConnectorFormState[TKey]
	): void => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const selectConnector = (connectorId: OpenAiConnectorId): void => {
		const connector = catalog.find((item) => item.id === connectorId);
		setForm((current) => ({
			...current,
			connectorId,
			name: current.name || connector?.name || '',
			serverLabel: current.serverLabel || serverLabelFromName(connector?.name ?? ''),
			serverDescription: current.serverDescription || connector?.description || '',
			allowedTools: [],
		}));
	};

	const toggleAllowedTool = (tool: string): void => {
		setForm((current) => ({
			...current,
			allowedTools: current.allowedTools.includes(tool)
				? current.allowedTools.filter((item) => item !== tool)
				: [...current.allowedTools, tool],
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
			await loadConnectors();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : String(submitError));
		} finally {
			setSaving(false);
		}
	};

	const run = async (id: string, action: () => Promise<void>): Promise<void> => {
		setBusyId(id);
		setError(null);
		try {
			await action();
			await loadConnectors();
			if (selectedId === id) {
				setSelectedTools(await window.connectors.listTools(id));
			}
		} catch (actionError) {
			setError(actionError instanceof Error ? actionError.message : String(actionError));
		} finally {
			setBusyId(null);
		}
	};

	const editConnector = async (id: string): Promise<void> => {
		try {
			const connector = await window.connectors.get(id);
			setForm(connectorToForm(connector));
			setShowForm(true);
		} catch (editError) {
			setError(editError instanceof Error ? editError.message : String(editError));
		}
	};

	const viewDetails = async (id: string): Promise<void> => {
		setSelectedId(id);
		setSelectedTools(await window.connectors.listTools(id));
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
						onClick={() => {
							setForm(emptyForm);
							setShowForm(true);
						}}
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

			{showForm && (
				<SettingsSection title={form.id ? 'Edit connector' : 'Add connector'}>
					<SettingsPanel>
						<form className="grid gap-3 p-3" onSubmit={submit}>
							<div className="grid gap-3 md:grid-cols-2">
								<SettingsField id="connector-kind" label="Connector">
									<Select
										value={form.connectorId || null}
										onValueChange={(value) => {
											if (value) selectConnector(value as OpenAiConnectorId);
										}}
									>
										<SelectTrigger
											id="connector-kind"
											size="sm"
											className="w-full text-xs [&_svg]:size-3"
											aria-label="Connector"
										>
											<SelectValue placeholder="Select connector" />
										</SelectTrigger>
										<SelectContent>
											{catalog.map((connector) => (
												<SelectItem key={connector.id} value={connector.id}>
													{connector.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</SettingsField>

								<SettingsField id="connector-name" label="Name">
									<Input
										id="connector-name"
										value={form.name}
										onChange={(event) => update('name', event.target.value)}
										placeholder="Google Calendar"
										className="h-7 px-2 text-xs md:text-xs"
									/>
								</SettingsField>

								<SettingsField id="connector-server-label" label="Server label">
									<Input
										id="connector-server-label"
										value={form.serverLabel}
										onChange={(event) => update('serverLabel', event.target.value)}
										placeholder="google_calendar"
										className="h-7 px-2 text-xs md:text-xs"
									/>
								</SettingsField>

								<SettingsField id="connector-approval-policy" label="Approval policy">
									<Select
										value={form.requireApproval}
										onValueChange={(value) => {
											if (value) update('requireApproval', value as ConnectorApprovalMode);
										}}
									>
										<SelectTrigger
											id="connector-approval-policy"
											size="sm"
											className="w-full text-xs [&_svg]:size-3"
											aria-label="Approval policy"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="always">Always require approval</SelectItem>
											<SelectItem value="never_for_allowed_tools">
												Skip approval for allowed tools
											</SelectItem>
											<SelectItem value="never">Never require approval</SelectItem>
										</SelectContent>
									</Select>
								</SettingsField>
							</div>

							<SettingsField id="connector-description" label="Description">
								<Textarea
									id="connector-description"
									value={form.serverDescription}
									onChange={(event) => update('serverDescription', event.target.value)}
									placeholder={selectedCatalog?.description}
									className="min-h-14 py-1.5 text-xs md:text-xs"
								/>
							</SettingsField>

							{selectedCatalog && catalogSetupInstructions(selectedCatalog).length > 0 && (
								<div className="grid gap-2 rounded-md border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<Label className="text-[11px] leading-4">Setup instructions</Label>
										{catalogSetupUrl(selectedCatalog) && (
											<a
												href={catalogSetupUrl(selectedCatalog)}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
											>
												Open setup
												<ExternalLink className="size-3" />
											</a>
										)}
									</div>
									<ol className="grid list-decimal gap-1 pl-4 text-[11px] leading-4">
										{catalogSetupInstructions(selectedCatalog).map((instruction) => (
											<li key={instruction}>{instruction}</li>
										))}
									</ol>
								</div>
							)}

							{isGoogleOAuth ? (
								<div className="grid gap-3 md:grid-cols-2">
									<SettingsField id="connector-oauth-client-id" label="Google OAuth client ID">
										<Input
											id="connector-oauth-client-id"
											value={form.oauthClientId}
											onChange={(event) => update('oauthClientId', event.target.value)}
											placeholder="Google OAuth client ID"
											className="h-7 px-2 text-xs md:text-xs"
										/>
									</SettingsField>
									<SettingsField id="connector-oauth-client-secret" label="Google OAuth client secret">
										<Input
											id="connector-oauth-client-secret"
											type="password"
											value={form.oauthClientSecret}
											onChange={(event) => update('oauthClientSecret', event.target.value)}
											placeholder={form.id ? 'Leave blank to keep saved secret' : 'Google OAuth client secret'}
											className="h-7 px-2 text-xs md:text-xs"
										/>
									</SettingsField>
									<div className="md:col-span-2">
										<SettingsNotice variant="default">
											Add this redirect URI to your Google OAuth web app:{' '}
											<span className="font-mono">{catalogRedirectUri(selectedCatalog)}</span>
										</SettingsNotice>
									</div>
								</div>
							) : (
								<SettingsField id="connector-authorization" label="OAuth access token">
									<Input
										id="connector-authorization"
										type="password"
										value={form.authorization}
										onChange={(event) => update('authorization', event.target.value)}
										placeholder="Paste OAuth access token"
										className="h-7 px-2 text-xs md:text-xs"
									/>
								</SettingsField>
							)}

							<div className="grid gap-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<Label className="text-[11px] leading-4">Allowed tools</Label>
									<span className="text-xs text-muted-foreground">
										Leave all unselected to allow every available tool.
									</span>
								</div>
								<div className="flex min-h-10 flex-wrap gap-1.5 rounded-md border border-border/70 bg-muted/20 p-2">
									{selectedCatalog ? (
										selectedCatalog.tools.map((tool) => {
											const selected = form.allowedTools.includes(tool);
											return (
												<Button
													key={tool}
													type="button"
													variant={selected ? 'secondary' : 'outline'}
													size="xs"
													aria-pressed={selected}
													onClick={() => toggleAllowedTool(tool)}
												>
													{tool}
												</Button>
											);
										})
									) : (
										<p className="text-xs text-muted-foreground">Select a connector first.</p>
									)}
								</div>
							</div>

							<div className="grid gap-2 rounded-md border border-border/70 bg-muted/20 p-2 sm:grid-cols-2">
								<div className="flex items-start justify-between gap-2 text-xs">
									<span className="min-w-0">
										<Label htmlFor="connector-defer-loading" className="block text-[11px] leading-4">
											Defer tool loading
										</Label>
										<span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
											Load tools only when the connector is used.
										</span>
									</span>
									<Switch
										size="sm"
										id="connector-defer-loading"
										checked={form.deferLoading}
										onCheckedChange={(checked) => update('deferLoading', checked)}
									/>
								</div>
								<div className="flex items-start justify-between gap-2 text-xs">
									<span className="min-w-0">
										<Label htmlFor="connector-enabled" className="block text-[11px] leading-4">
											Enabled
										</Label>
										<span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
											Make this connector available to agent runs.
										</span>
									</span>
									<Switch
										size="sm"
										id="connector-enabled"
										checked={form.enabled}
										onCheckedChange={(checked) => update('enabled', checked)}
									/>
								</div>
							</div>

							{selectedCatalog && (
								<div className="flex flex-wrap gap-1.5 rounded-md border border-border/70 bg-muted/20 p-2">
									{selectedCatalog.scopes.map((scope) => (
										<Badge key={scope} variant="outline" className="h-4 px-1.5 text-[10px]">
											{scope}
										</Badge>
									))}
								</div>
							)}

							<div className="flex flex-wrap justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									size="xs"
									onClick={resetForm}
									disabled={saving}
								>
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
								setupInstructions={catalogSetupInstructions(
									catalog.find((item) => item.id === connector.connectorId)
								)}
								setupUrl={catalogSetupUrl(catalog.find((item) => item.id === connector.connectorId))}
								onToggle={() =>
									void run(connector.id, async () => {
										if (connector.enabled) {
											await window.connectors.disable(connector.id);
											return;
										}
										await window.connectors.enable(connector.id);
									})
								}
								onRefreshTools={() =>
									void run(connector.id, async () => {
										setSelectedTools(await window.connectors.refreshTools(connector.id));
										setSelectedId(connector.id);
									})
								}
								onConnect={() =>
									void run(connector.id, async () => {
										await window.connectors.connectOAuth(connector.id);
									})
								}
								onEdit={() => void editConnector(connector.id)}
								onRemove={() =>
									void run(connector.id, async () => {
										if (!window.confirm(`Remove ${connector.name}?`)) return;
										await window.connectors.remove(connector.id);
										if (selectedId === connector.id) {
											setSelectedId(null);
											setSelectedTools([]);
										}
									})
								}
								onViewDetails={() => void viewDetails(connector.id)}
							/>
						))}
					</div>
				)}
			</SettingsSection>

			{selectedId && (
				<SettingsSection
					title="Tools"
					action={
						<Button variant="outline" size="xs" onClick={() => setSelectedId(null)}>
							Close
						</Button>
					}
				>
					<SettingsPanel>
						<div className="p-3">
							<Badge
								variant="outline"
								className="h-5 rounded-md bg-muted/40 px-1.5 text-[10px] text-muted-foreground"
							>
								<Wrench className="mr-1 size-3" />
								{selectedTools.length} tools
							</Badge>
						</div>
						<ConnectorToolsList tools={selectedTools} />
					</SettingsPanel>
				</SettingsSection>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorsPage;
