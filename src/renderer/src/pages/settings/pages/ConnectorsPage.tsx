import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2">
					<div>
						<h2 className="text-sm font-semibold text-muted-foreground">Connectors</h2>
						<p className="mt-1 text-sm text-muted-foreground">
							Configure OpenAI-maintained connectors for Responses API tool use.
						</p>
					</div>
					<Button
						type="button"
						onClick={() => {
							setForm(emptyForm);
							setShowForm(true);
						}}
					>
						<Plus className="size-4" />
						Add Connector
					</Button>
				</div>

				{error && (
					<div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						<AlertTriangle className="mt-0.5 size-4 shrink-0" />
						<span>{error}</span>
					</div>
				)}

				{showForm && (
					<Card className="mb-4 gap-0 py-0">
						<CardHeader className="border-b border-border/70 py-4">
							<CardTitle>{form.id ? 'Edit connector' : 'Add connector'}</CardTitle>
							<CardDescription>
								Add an OAuth access token from your app authorization flow. Tokens are sent on
								each Responses API request and are not stored by OpenAI.
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4">
							<form className="grid gap-4" onSubmit={submit}>
								<div className="grid gap-4 md:grid-cols-2">
									<label className="grid gap-1.5 text-sm font-medium">
										Connector
										<select
											value={form.connectorId}
											onChange={(event) => selectConnector(event.target.value as OpenAiConnectorId)}
											className="cn-input h-10 rounded-md border border-input bg-background px-3 text-sm"
										>
											<option value="">Select connector</option>
											{catalog.map((connector) => (
												<option key={connector.id} value={connector.id}>
													{connector.name}
												</option>
											))}
										</select>
									</label>

									<label className="grid gap-1.5 text-sm font-medium">
										Name
										<Input
											value={form.name}
											onChange={(event) => update('name', event.target.value)}
											placeholder="Google Calendar"
										/>
									</label>

									<label className="grid gap-1.5 text-sm font-medium">
										Server label
										<Input
											value={form.serverLabel}
											onChange={(event) => update('serverLabel', event.target.value)}
											placeholder="google_calendar"
										/>
									</label>

									<label className="grid gap-1.5 text-sm font-medium">
										Approval policy
										<select
											value={form.requireApproval}
											onChange={(event) =>
												update('requireApproval', event.target.value as ConnectorApprovalMode)
											}
											className="cn-input h-10 rounded-md border border-input bg-background px-3 text-sm"
										>
											<option value="always">Always require approval</option>
											<option value="never_for_allowed_tools">
												Skip approval for allowed tools
											</option>
											<option value="never">Never require approval</option>
										</select>
									</label>
								</div>

								<label className="grid gap-1.5 text-sm font-medium">
									Description
									<Textarea
										value={form.serverDescription}
										onChange={(event) => update('serverDescription', event.target.value)}
										placeholder={selectedCatalog?.description}
									/>
								</label>

								<label className="grid gap-1.5 text-sm font-medium">
									OAuth access token
									<Input
										type="password"
										value={form.authorization}
										onChange={(event) => update('authorization', event.target.value)}
										placeholder="Paste OAuth access token"
									/>
								</label>

								<div className="grid gap-2">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<label className="text-sm font-medium">Allowed tools</label>
										<span className="text-xs text-muted-foreground">
											Leave all unchecked to allow every available tool.
										</span>
									</div>
									<div className="grid gap-2 rounded-lg border border-border/70 bg-muted/20 p-3 sm:grid-cols-2">
										{selectedCatalog ? (
											selectedCatalog.tools.map((tool) => (
												<label key={tool} className="flex items-center gap-2 text-sm">
													<input
														type="checkbox"
														checked={form.allowedTools.includes(tool)}
														onChange={() => toggleAllowedTool(tool)}
													/>
													<span className="font-mono text-xs">{tool}</span>
												</label>
											))
										) : (
											<p className="text-sm text-muted-foreground">Select a connector first.</p>
										)}
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-4">
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={form.deferLoading}
											onChange={(event) => update('deferLoading', event.target.checked)}
										/>
										Defer tool loading
									</label>
									<label className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={form.enabled}
											onChange={(event) => update('enabled', event.target.checked)}
										/>
										Enabled
									</label>
								</div>

								{selectedCatalog && (
									<div className="flex flex-wrap gap-2 rounded-lg border border-border/70 bg-muted/20 p-3">
										{selectedCatalog.scopes.map((scope) => (
											<Badge key={scope} variant="outline">
												{scope}
											</Badge>
										))}
									</div>
								)}

								<div className="flex justify-end gap-2">
									<Button type="button" variant="outline" onClick={resetForm} disabled={saving}>
										Cancel
									</Button>
									<Button type="submit" disabled={!canSubmit}>
										{saving ? 'Saving...' : form.id ? 'Save Connector' : 'Add Connector'}
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				)}

				{connectors.length === 0 ? (
					<Card className="gap-0 py-0">
						<CardContent className="p-6 text-sm text-muted-foreground">
							No connectors configured yet.
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-4">
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
				<section className="flex flex-col gap-3">
					<div className="flex flex-wrap items-center justify-between gap-2 px-2">
						<h3 className="text-sm font-semibold text-muted-foreground">Tools</h3>
						<Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
							Close
						</Button>
					</div>
					<ConnectorToolsList tools={selectedTools} />
				</section>
			)}
		</div>
	);
};

export default ConnectorsPage;
