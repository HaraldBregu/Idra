import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plug, Plus, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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

type ConnectorCatalog = ReadonlyArray<(typeof OPENAI_CONNECTOR_CATALOG)[number]>;

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
	if (!form.connectorId) {
		throw new Error('Select a connector.');
	}

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

function connectorToForm(connector: ConnectorConfig): ConnectorFormState {
	return {
		id: connector.id,
		name: connector.name,
		connectorId: connector.connectorId,
		serverLabel: connector.serverLabel,
		serverDescription: connector.serverDescription ?? '',
		authorization: connector.authorization,
		requireApproval: connector.requireApproval,
		allowedTools: connector.allowedTools,
		deferLoading: connector.deferLoading,
		enabled: connector.enabled,
	};
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
	const canSubmit =
		form.name.trim().length > 0 &&
		form.connectorId.length > 0 &&
		form.authorization.trim().length > 0 &&
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
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">Connectors</h1>
					<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
						Configure OpenAI-maintained connectors for Responses API tool use.
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
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
				</div>
			</header>

			{error && (
				<div className="flex items-start gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
					<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
					<span className="min-w-0">{error}</span>
				</div>
			)}

			{showForm && (
				<section className="flex flex-col gap-2">
					<div className="px-0.5">
						<h2 className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
							{form.id ? 'Edit connector' : 'Add connector'}
						</h2>
						<p className="mt-0.5 max-w-2xl text-xs leading-snug text-muted-foreground">
							Add an OAuth access token from your app authorization flow. Tokens are sent on each
							Responses API request and are not stored by OpenAI.
						</p>
					</div>
					<Card size="sm" className="gap-0 py-0">
						<CardContent className="p-0">
							<form className="grid gap-2.5 p-2.5" onSubmit={submit}>
								<div className="grid gap-2.5 md:grid-cols-2">
									<label className="grid gap-1 text-xs font-medium">
										Connector
										<Select
											value={form.connectorId || null}
											onValueChange={(value) => {
												if (value) selectConnector(value as OpenAiConnectorId);
											}}
										>
											<SelectTrigger className="w-full text-xs" size="sm" aria-label="Connector">
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
									</label>

									<label className="grid gap-1 text-xs font-medium">
										Name
										<Input
											value={form.name}
											onChange={(event) => update('name', event.target.value)}
											placeholder="Google Calendar"
											className="h-8 px-2.5 text-xs md:text-xs"
										/>
									</label>

									<label className="grid gap-1 text-xs font-medium">
										Server label
										<Input
											value={form.serverLabel}
											onChange={(event) => update('serverLabel', event.target.value)}
											placeholder="google_calendar"
											className="h-8 px-2.5 text-xs md:text-xs"
										/>
									</label>

									<label className="grid gap-1 text-xs font-medium">
										Approval policy
										<Select
											value={form.requireApproval}
											onValueChange={(value) => {
												if (value) update('requireApproval', value as ConnectorApprovalMode);
											}}
										>
											<SelectTrigger
												className="w-full text-xs"
												size="sm"
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
									</label>
								</div>

								<label className="grid gap-1 text-xs font-medium">
									Description
									<Textarea
										value={form.serverDescription}
										onChange={(event) => update('serverDescription', event.target.value)}
										placeholder={selectedCatalog?.description}
										className="min-h-14 py-1.5 text-xs md:text-xs"
									/>
								</label>

								<label className="grid gap-1 text-xs font-medium">
									OAuth access token
									<Input
										type="password"
										value={form.authorization}
										onChange={(event) => update('authorization', event.target.value)}
										placeholder="Paste OAuth access token"
										className="h-8 px-2.5 text-xs md:text-xs"
									/>
								</label>

								<div className="grid gap-2">
									<div className="flex flex-wrap items-center justify-between gap-1.5">
										<label className="text-xs font-medium">Allowed tools</label>
										<span className="text-[11px] text-muted-foreground">
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
									<label className="flex items-center justify-between gap-2 text-xs">
										<span className="min-w-0">
											<span className="block font-medium">Defer tool loading</span>
											<span className="block text-[11px] text-muted-foreground">
												Load tools only when the connector is used.
											</span>
										</span>
										<Switch
											checked={form.deferLoading}
											onCheckedChange={(checked) => update('deferLoading', checked)}
										/>
									</label>
									<label className="flex items-center justify-between gap-2 text-xs">
										<span className="min-w-0">
											<span className="block font-medium">Enabled</span>
											<span className="block text-[11px] text-muted-foreground">
												Make this connector available to assistant runs.
											</span>
										</span>
										<Switch
											checked={form.enabled}
											onCheckedChange={(checked) => update('enabled', checked)}
										/>
									</label>
								</div>

								{selectedCatalog && (
									<div className="flex flex-wrap gap-1.5 rounded-md border border-border/70 bg-muted/20 p-2">
										{selectedCatalog.scopes.map((scope) => (
											<Badge key={scope} variant="outline" className="text-[10px]">
												{scope}
											</Badge>
										))}
									</div>
								)}

								<div className="flex flex-wrap justify-end gap-1.5">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={resetForm}
										disabled={saving}
									>
										Cancel
									</Button>
									<Button type="submit" size="sm" disabled={!canSubmit}>
										{saving ? 'Saving...' : form.id ? 'Save Connector' : 'Add Connector'}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				</section>
			)}

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					Configured connectors
				</h2>
				{connectors.length === 0 ? (
					<Card size="sm" className="gap-0 py-0">
						<CardContent className="p-0">
							<Empty className="min-h-28 gap-3 border-0 p-4">
								<EmptyHeader className="gap-1.5">
									<EmptyMedia variant="icon" className="mb-1 size-7">
										<Plug className="size-3.5" />
									</EmptyMedia>
									<EmptyTitle className="text-[13px]">No connectors configured yet.</EmptyTitle>
									<EmptyDescription className="text-xs leading-snug">
										Add a connector to make external tools available to assistant runs.
									</EmptyDescription>
								</EmptyHeader>
							</Empty>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-2">
						{connectors.map((connector) => (
							<ConnectorCard
								key={connector.id}
								connector={connector}
								busy={busyId === connector.id}
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
			</section>

			{selectedId && (
				<section className="flex flex-col gap-2">
					<div className="flex flex-wrap items-start justify-between gap-2 px-0.5">
						<h2 className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
							Tools
						</h2>
						<div className="flex shrink-0 items-center gap-2">
							<Button variant="outline" size="xs" onClick={() => setSelectedId(null)}>
								Close
							</Button>
						</div>
					</div>
					<div className="flex flex-wrap gap-1.5 px-0.5">
						<Badge
							variant="outline"
							className="h-auto rounded-md bg-muted/40 py-0.5 text-[11px] text-muted-foreground"
						>
							<Wrench className="mr-1 size-3" />
							{selectedTools.length} tools
						</Badge>
					</div>
					<ConnectorToolsList tools={selectedTools} />
				</section>
			)}
		</div>
	);
};

export default ConnectorsPage;
