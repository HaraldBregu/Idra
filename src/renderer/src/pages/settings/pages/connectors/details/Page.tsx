import React, { FormEvent, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
	AlertTriangle,
	ExternalLink,
	LoaderCircle,
	Plug,
	RefreshCw,
	Save,
	ShieldCheck,
	Trash2,
	Wrench,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { handleExternalLinkClick } from '@/lib/external-links';
import type {
	ConnectorApprovalMode,
	ConnectorCatalogEntry,
	ConnectorConfig,
	ConnectorInput,
	ConnectorMcpConfig,
	ConnectorTool,
	ConnectorUpdateInput,
} from '../../../../../../../shared/connector';
import {
	SettingsEmptyState,
	SettingsField,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../../components';
import { ConnectorDocumentationRows } from '../components/ConnectorDocumentationRows';
import { ConnectorToolsList } from '../components/ConnectorToolsList';

type ConnectorCatalogItem = ConnectorCatalogEntry;

interface ConnectorFormState {
	readonly name: string;
	readonly serverLabel: string;
	readonly serverDescription: string;
	readonly mcpText: string;
	readonly requireApproval: ConnectorApprovalMode;
	readonly allowedTools: string[];
	readonly deferLoading: boolean;
	readonly enabled: boolean;
}

type DetailTab = 'tools' | 'permissions';

const SERVER_LABEL_PATTERN = /^[a-zA-Z0-9_-]+$/;

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function defaultMcpText(item: ConnectorCatalogItem): string {
	const base = item.id === 'connector_stdio_mcp'
		? { transport: 'stdio', command: 'node', args: ['server.js'] }
		: { transport: 'http', url: 'https://example.com/mcp', auth: { env: item.environmentSecretNames[0] ?? 'MCP_API_KEY' } };
	return JSON.stringify(base, null, 2);
}

function mcpTextFromConnector(connector: ConnectorConfig, item: ConnectorCatalogItem): string {
	return JSON.stringify(connector.mcp ?? JSON.parse(defaultMcpText(item)), null, 2);
}

function parseMcpText(value: string): ConnectorMcpConfig {
	try {
		return JSON.parse(value) as ConnectorMcpConfig;
	} catch {
		throw new Error('MCP config must be valid JSON.');
	}
}

function formFromCatalog(item: ConnectorCatalogItem): ConnectorFormState {
	return {
		name: item.name,
		serverLabel: serverLabelFromName(item.name),
		serverDescription: item.description,
		mcpText: defaultMcpText(item),
		requireApproval: 'always',
		allowedTools: [],
		deferLoading: false,
		enabled: true,
	};
}

function formFromConnector(connector: ConnectorConfig, item: ConnectorCatalogItem): ConnectorFormState {
	return {
		name: connector.name,
		serverLabel: connector.serverLabel,
		serverDescription: connector.serverDescription ?? '',
		mcpText: mcpTextFromConnector(connector, item),
		requireApproval: connector.requireApproval,
		allowedTools: connector.allowedTools,
		deferLoading: connector.deferLoading,
		enabled: connector.enabled,
	};
}

function catalogItemFromId(id: string, connector?: ConnectorConfig): ConnectorCatalogItem {
	const name = connector?.name ?? id;
	return {
		id,
		name,
		description: connector?.serverDescription ?? name,
		environmentSecretNames: environmentSecretNamesFor(connector?.mcp),
		platformDocumentationPages: [],
		tools: connector?.tools.map((tool) => tool.name) ?? [],
		scopes: [],
		setupInstructions: [],
		authKind: 'mcp_env',
		runtimeKind: 'mcp',
		allowMultipleInstances: true,
	};
}

function environmentSecretNamesFor(mcp: ConnectorMcpConfig | undefined): string[] {
	if (!mcp) return [];
	if (mcp.transport === 'http') return mcp.auth?.env ? [mcp.auth.env] : [];
	return (mcp.envSecrets ?? []).map((secret) => secret.env);
}

function findCatalogItem(catalog: readonly ConnectorCatalogItem[], id: string, connector?: ConnectorConfig): ConnectorCatalogItem {
	return catalog.find((item) => item.id === id) ?? catalogItemFromId(id, connector);
}

function formatTimestamp(value?: string): string {
	if (!value) return 'Never';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Never';
	return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatApprovalPolicy(value: ConnectorApprovalMode): string {
	if (value === 'never_for_allowed_tools') return 'Skip approval for allowed tools';
	if (value === 'never') return 'Never require approval';
	return 'Always require approval';
}

function formatRuntimeStatus(item: ConnectorCatalogItem): string {
	return item.runtimeKind === 'mcp' ? 'Dynamic MCP tools' : 'Dynamic connector';
}

function DetailRow({
	label,
	value,
	mono,
}: {
	readonly label: React.ReactNode;
	readonly value: React.ReactNode;
	readonly mono?: boolean;
}): React.JSX.Element {
	return (
		<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
			<ItemContent>
				<ItemTitle>{label}</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
				<span
					className={
						mono
							? 'max-w-[min(28rem,55vw)] truncate text-right font-mono text-[13px] text-foreground'
							: 'max-w-[min(28rem,55vw)] truncate text-right text-[13px] text-foreground'
					}
				>
					{value}
				</span>
			</ItemActions>
		</Item>
	);
}

function formValidationError(form: ConnectorFormState): string | null {
	const name = form.name.trim();
	const serverLabel = form.serverLabel.trim() || serverLabelFromName(name);
	if (!name) return 'Connector name is required.';
	if (!serverLabel) return 'Server label is required.';
	if (!SERVER_LABEL_PATTERN.test(serverLabel)) {
		return 'Server label can contain only letters, numbers, underscores, and hyphens.';
	}
	try {
		parseMcpText(form.mcpText);
	} catch (caught) {
		return caught instanceof Error ? caught.message : String(caught);
	}
	return null;
}

function baseConnectorInput(form: ConnectorFormState, item: ConnectorCatalogItem) {
	const name = form.name.trim();
	return {
		name,
		connectorId: item.id,
		serverLabel: form.serverLabel.trim() || serverLabelFromName(name),
		serverDescription: form.serverDescription.trim() || undefined,
		mcp: parseMcpText(form.mcpText),
		requireApproval: form.requireApproval,
		allowedTools: form.allowedTools,
		deferLoading: form.deferLoading,
		enabled: form.enabled,
	};
}

function formToCreateInput(form: ConnectorFormState, item: ConnectorCatalogItem): ConnectorInput {
	return baseConnectorInput(form, item);
}

function formToUpdateInput(form: ConnectorFormState, item: ConnectorCatalogItem): ConnectorUpdateInput {
	return baseConnectorInput(form, item);
}

const ConnectorDetailsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { connectorId, connectorCatalogId } = useParams<{
		connectorId?: string;
		connectorCatalogId?: string;
	}>();
	const [connector, setConnector] = useState<ConnectorConfig | null>(null);
	const [catalogItem, setCatalogItem] = useState<ConnectorCatalogItem | null>(null);
	const [form, setForm] = useState<ConnectorFormState | null>(null);
	const [tools, setTools] = useState<readonly ConnectorTool[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [refreshingTools, setRefreshingTools] = useState(false);
	const [testing, setTesting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [toolsError, setToolsError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<DetailTab>('tools');

	const load = useCallback(async (): Promise<void> => {
		setLoading(true);
		setError(null);
		setStatusMessage(null);
		setToolsError(null);

		try {
			const catalog = await window.connectors.catalog();

			if (connectorCatalogId) {
				const decodedCatalogId = decodeURIComponent(connectorCatalogId);
				const item = findCatalogItem(catalog, decodedCatalogId);

				setConnector(null);
				setCatalogItem(item);
				setForm(formFromCatalog(item));
				setTools([]);
				return;
			}

			if (!connectorId) throw new Error('Connector not found.');

			const nextConnector = await window.connectors.get(connectorId);
			const item = findCatalogItem(catalog, nextConnector.connectorId, nextConnector);

			let nextTools: readonly ConnectorTool[] = [];
			let nextToolsError: string | null = null;
			try {
				nextTools = await window.connectors.listTools(connectorId);
			} catch (caught) {
				nextToolsError = caught instanceof Error ? caught.message : String(caught);
			}

			setConnector(nextConnector);
			setCatalogItem({ ...item, tools: nextTools.map((tool) => tool.name) });
			setForm(formFromConnector(nextConnector, item));
			setTools(nextTools);
			setToolsError(nextToolsError);
		} catch (caught) {
			setConnector(null);
			setCatalogItem(null);
			setForm(null);
			setTools([]);
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setLoading(false);
		}
	}, [connectorCatalogId, connectorId, navigate]);

	useEffect(() => {
		void load();
	}, [load]);

	const update = <TKey extends keyof ConnectorFormState>(
		key: TKey,
		value: ConnectorFormState[TKey]
	): void => {
		setForm((current) => (current ? { ...current, [key]: value } : current));
	};

	const toggleAllowedTool = (tool: string): void => {
		setForm((current) => {
			if (!current) return current;
			return {
				...current,
				allowedTools: current.allowedTools.includes(tool)
					? current.allowedTools.filter((value) => value !== tool)
					: [...current.allowedTools, tool],
			};
		});
	};

	const saveConnector = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		if (!form || !catalogItem) return;

		const validationError = formValidationError(form);
		if (validationError) {
			setError(validationError);
			return;
		}

		setSaving(true);
		setError(null);
		setStatusMessage(null);
		setToolsError(null);
		try {
			if (connector) {
				const saved = await window.connectors.update(
					connector.id,
					formToUpdateInput(form, catalogItem)
				);
				setConnector(saved);
				setForm(formFromConnector(saved, catalogItem));
				try {
					setTools(await window.connectors.listTools(saved.id));
				} catch (caught) {
					setTools([]);
					setToolsError(caught instanceof Error ? caught.message : String(caught));
				}
				setStatusMessage(`${saved.name} saved.`);
				return;
			}

			const created = await window.connectors.add(formToCreateInput(form, catalogItem));
			navigate(`/settings/connectors/connectordetails/${encodeURIComponent(created.id)}`, {
				replace: true,
			});
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSaving(false);
		}
	};

	const refreshConnectorTools = async (): Promise<void> => {
		if (!connector || !catalogItem) return;
		setRefreshingTools(true);
		setError(null);
		setToolsError(null);
		try {
			const nextTools = await window.connectors.refreshTools(connector.id);
			const nextConnector = await window.connectors.get(connector.id);
			setConnector(nextConnector);
			setForm(formFromConnector(nextConnector, catalogItem));
			setTools(nextTools);
			setStatusMessage('Connector tools refreshed.');
		} catch (caught) {
			setToolsError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setRefreshingTools(false);
		}
	};

	const testConnector = async (): Promise<void> => {
		if (!connector) return;
		setTesting(true);
		setError(null);
		setStatusMessage(null);
		try {
			const result = await window.connectors.test(connector.id);
			setStatusMessage(result.message ?? `Connector status: ${result.status}.`);
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setTesting(false);
		}
	};

	const deleteConnector = async (): Promise<void> => {
		if (!connector) return;
		if (!window.confirm(`Delete ${connector.name}?`)) return;

		setDeleting(true);
		setError(null);
		setStatusMessage(null);
		try {
			await window.connectors.remove(connector.id);
			navigate('/settings/connectors');
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setDeleting(false);
		}
	};

	if (loading) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.connectors.detailsTitle')} />
				<Card size="sm" className="gap-0! p-3!">
					<Skeleton className="h-5 w-56 max-w-full" />
					<Skeleton className="mt-3 h-16 w-full" />
				</Card>
			</SettingsPageShell>
		);
	}

	if (!catalogItem || !form) {
		return (
			<SettingsPageShell>
				<SettingsPageHeader title={t('settings.connectors.detailsTitle')} />
				<Card size="sm" className="gap-0! p-0!">
					<SettingsEmptyState
						icon={Plug}
						title={t('settings.connectors.notFoundTitle')}
						description={error ?? t('settings.connectors.notFoundDescription')}
						className="min-h-28"
					/>
				</Card>
			</SettingsPageShell>
		);
	}

	const title = connector?.name ?? catalogItem.name;
	const idPrefix = connector?.id ?? catalogItem.id;
	const formBusy = saving || deleting;

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={title}
				description={catalogItem.description}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}
			{statusMessage && <SettingsNotice variant="default">{statusMessage}</SettingsNotice>}

			<form onSubmit={saveConnector} className="grid gap-4">
				<SettingsSection
					hideTitle
					title="Configuration"
					action={
						connector ? (
							<Badge
								variant={connector.enabled ? 'secondary' : 'outline'}
								className="h-5 rounded-md px-1.5 text-[10px]"
							>
								{connector.enabled ? 'Enabled' : 'Disabled'}
							</Badge>
						) : (
							<Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
								New
							</Badge>
						)
					}
				>
					<Card size="sm" className="gap-0! p-0!">
						<div className="grid gap-3 p-3">
							<div className="grid gap-3 md:grid-cols-2">
								<SettingsField id={`${idPrefix}-connector-name`} label="Name">
									<Input
										id={`${idPrefix}-connector-name`}
										value={form.name}
										onChange={(event) => update('name', event.target.value)}
										placeholder={catalogItem.name}
										className="h-8 px-2 text-xs md:text-xs"
									/>
								</SettingsField>
								<SettingsField id={`${idPrefix}-connector-server-label`} label="Server label">
									<Input
										id={`${idPrefix}-connector-server-label`}
										value={form.serverLabel}
										onChange={(event) => update('serverLabel', event.target.value)}
										placeholder={serverLabelFromName(catalogItem.name)}
										className="h-8 px-2 font-mono text-xs md:text-xs"
									/>
								</SettingsField>
							</div>

							<SettingsField id={`${idPrefix}-connector-server-description`} label="Description">
								<Textarea
									id={`${idPrefix}-connector-server-description`}
									value={form.serverDescription}
									onChange={(event) => update('serverDescription', event.target.value)}
									placeholder={catalogItem.description}
									className="min-h-16 py-1.5 text-xs md:text-xs"
								/>
							</SettingsField>

							<SettingsField
								id={`${idPrefix}-connector-mcp`}
								label="MCP config"
								description="Use env variable names for secrets; do not paste API key values here."
							>
								<Textarea
									id={`${idPrefix}-connector-mcp`}
									value={form.mcpText}
									onChange={(event) => update('mcpText', event.target.value)}
									className="min-h-28 font-mono text-xs md:text-xs"
								/>
							</SettingsField>
						</div>

						<div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 p-3">
							<Button type="submit" size="xs" disabled={formBusy}>
								{saving ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Save className="size-3" />
								)}
								{connector ? 'Save Changes' : 'Add Connector'}
							</Button>
						</div>
					</Card>
				</SettingsSection>
			</form>

			{/* Tools & Permissions tabs */}
			<SettingsSection
				title=""
				hideTitle
				action={
					<div className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5">
						<Button
							type="button"
							size="xs"
							variant={activeTab === 'tools' ? 'secondary' : 'ghost'}
							className="h-6 gap-1.5 px-2 text-[11px]"
							onClick={() => setActiveTab('tools')}
						>
							<Wrench className="size-3" />
							Tools
							{connector && (
								<span className="ml-0.5 text-muted-foreground">({tools.length})</span>
							)}
						</Button>
						<Button
							type="button"
							size="xs"
							variant={activeTab === 'permissions' ? 'secondary' : 'ghost'}
							className="h-6 gap-1.5 px-2 text-[11px]"
							onClick={() => setActiveTab('permissions')}
						>
							<ShieldCheck className="size-3" />
							Permissions
						</Button>
					</div>
				}
			>
				{activeTab === 'tools' && (
					<>
						{toolsError && (
							<SettingsNotice variant="destructive" icon={AlertTriangle}>
								{toolsError}
							</SettingsNotice>
						)}
						{connector?.lastError && (
							<SettingsNotice variant="destructive" icon={AlertTriangle}>
								{connector.lastError}
							</SettingsNotice>
						)}
						<div className="flex justify-end">
							{connector && (
								<div className="flex gap-1.5">
									<Button
										type="button"
										size="xs"
										variant="outline"
										disabled={testing || formBusy}
										onClick={() => void testConnector()}
									>
										{testing && <LoaderCircle className="size-3 animate-spin" />}
										Test
									</Button>
									<Button
										type="button"
										size="xs"
										variant="outline"
										disabled={refreshingTools || formBusy}
										onClick={() => void refreshConnectorTools()}
									>
										{refreshingTools ? (
											<LoaderCircle className="size-3 animate-spin" />
										) : (
											<RefreshCw className="size-3" />
										)}
										Refresh
									</Button>
								</div>
							)}
						</div>
						<ConnectorToolsList tools={tools} />
					</>
				)}

				{activeTab === 'permissions' && form && (
					<Card size="sm" className="gap-0! p-0!">
						<div className="grid gap-3 p-3">
							<SettingsField id={`${idPrefix}-connector-approval-policy`} label="Approval policy">
								<Select
									value={form.requireApproval}
									onValueChange={(value) => {
										if (value) update('requireApproval', value as ConnectorApprovalMode);
									}}
								>
									<SelectTrigger
										id={`${idPrefix}-connector-approval-policy`}
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

							<div className="grid gap-2">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<span className="text-[11px] font-medium text-foreground">Allowed tools</span>
									<span className="text-[11px] text-muted-foreground">
										Leave all unselected to allow every available tool.
									</span>
								</div>
								<div className="flex min-h-8 flex-wrap gap-1.5">
									{catalogItem.tools.length > 0 ? (
										catalogItem.tools.map((tool) => {
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
										<p className="text-[11px] text-muted-foreground">
											No tools found for this connector.
										</p>
									)}
								</div>
							</div>
						</div>

						<div className="grid divide-y divide-border/60 border-t border-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
							<div className="flex items-center justify-between gap-3 px-3 py-2.5">
								<div className="min-w-0">
									<label htmlFor={`${idPrefix}-connector-defer-loading`} className="block cursor-pointer text-[13px] font-medium text-foreground">
										Defer tool loading
									</label>
									<p className="text-[11px] leading-4 text-muted-foreground/60">
										Load tools only when the connector is used.
									</p>
								</div>
								<Switch
									size="sm"
									id={`${idPrefix}-connector-defer-loading`}
									checked={form.deferLoading}
									onCheckedChange={(checked) => update('deferLoading', checked)}
								/>
							</div>
							<div className="flex items-center justify-between gap-3 px-3 py-2.5">
								<div className="min-w-0">
									<label htmlFor={`${idPrefix}-connector-enabled`} className="block cursor-pointer text-[13px] font-medium text-foreground">
										Enabled
									</label>
									<p className="text-[11px] leading-4 text-muted-foreground/60">
										Make this connector available to agent runs.
									</p>
								</div>
								<Switch
									size="sm"
									id={`${idPrefix}-connector-enabled`}
									checked={form.enabled}
									onCheckedChange={(checked) => update('enabled', checked)}
								/>
							</div>
						</div>

						<div className="flex justify-end border-t border-border/60 p-3">
							<Button
								type="button"
								size="xs"
								disabled={formBusy}
								onClick={() => {
									const validationError = formValidationError(form);
									if (validationError) { setError(validationError); return; }
									void saveConnector({ preventDefault: () => {} } as FormEvent<HTMLFormElement>);
								}}
							>
								{saving ? <LoaderCircle className="size-3 animate-spin" /> : <Save className="size-3" />}
								Save Permissions
							</Button>
						</div>
					</Card>
				)}
			</SettingsSection>

			<SettingsSection
				title="Status"
				action={
					connector ? (
						<div className="flex flex-wrap gap-1.5">
							<DetailRow label="Last refreshed" value={formatTimestamp(connector?.lastRefreshedAt)} />
							<DetailRow label="Updated" value={formatTimestamp(connector?.updatedAt)} />
						</div>
					) : undefined
				}
			>
				<Card size="sm" className="gap-0! p-0!">
					<DetailRow label="Connector" value={catalogItem.id} mono />
					<DetailRow label="Runtime" value={formatRuntimeStatus(catalogItem)} />
					<DetailRow label="Auth" value="MCP env variables" />
					<DetailRow label="Approval policy" value={formatApprovalPolicy(form.requireApproval)} />
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.connectors.setup')}>
				<Card size="sm" className="gap-0! p-0!">
					<div className="grid gap-3 px-3 py-2.5">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<p className="text-[11px] font-medium text-foreground">Provider setup</p>
							{catalogItem.setupUrl && (
								<a
									href={catalogItem.setupUrl}
									target="_blank"
									rel="noreferrer"
									onClick={(event) => handleExternalLinkClick(event, catalogItem.setupUrl)}
									className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
								>
									Open setup
									<ExternalLink className="size-3" />
								</a>
							)}
						</div>
						{catalogItem.setupInstructions.length > 0 && (
							<ol className="grid list-decimal gap-1 pl-4 text-[11px] leading-4 text-muted-foreground/60">
								{catalogItem.setupInstructions.map((step) => (
									<li key={step}>{step}</li>
								))}
							</ol>
						)}
						{catalogItem.scopes.length > 0 && (
							<div className="flex flex-wrap gap-1.5">
								{catalogItem.scopes.map((scope) => (
									<Badge key={scope} variant="outline" className="h-5 max-w-full px-1.5 font-mono text-[10px]">
										<span className="truncate">{scope}</span>
									</Badge>
								))}
							</div>
						)}
					</div>
					<div className="border-t border-border/60">
						<ConnectorDocumentationRows connector={catalogItem} />
					</div>
				</Card>
			</SettingsSection>

			{connector && (
				<div className="border-t border-border/60 pt-3">
					<Button
						type="button"
						size="lg"
						variant="destructive"
						className="w-full"
						disabled={formBusy}
						onClick={() => void deleteConnector()}
					>
						{deleting ? (
							<LoaderCircle className="size-3 animate-spin" />
						) : (
							<Trash2 className="size-3" />
						)}
						{deleting ? 'Deleting...' : 'Delete Connector'}
					</Button>
				</div>
			)}
		</SettingsPageShell>
	);
};

export default ConnectorDetailsPage;
