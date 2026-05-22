import { FormEvent, useState } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { handleExternalLinkClick } from '@/lib/external-links';
import type {
	ConnectorApprovalMode,
	ConnectorInput,
	OpenAiConnectorId,
} from '@shared/connector';
import {
	SettingsField,
	SettingsNotice,
} from '../../../components';
import { ConnectorDocumentationRows } from './ConnectorDocumentationRows';
import { ConnectorIcon } from './ConnectorIcon';
import type { ConnectorCatalog } from '../hooks/useConnectors';

interface ConnectorCatalogFormState {
	readonly name: string;
	readonly serverLabel: string;
	readonly serverDescription: string;
	readonly authorization: string;
	readonly requireApproval: ConnectorApprovalMode;
	readonly allowedTools: string[];
	readonly deferLoading: boolean;
	readonly enabled: boolean;
}

function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

function formToInput(form: ConnectorCatalogFormState, connectorId: OpenAiConnectorId, useManualAuth: boolean): ConnectorInput {
	return {
		name: form.name,
		connectorId,
		serverLabel: form.serverLabel || serverLabelFromName(form.name),
		serverDescription: form.serverDescription || undefined,
		authorization: useManualAuth ? form.authorization.trim() || undefined : undefined,
		requireApproval: form.requireApproval,
		allowedTools: form.allowedTools,
		deferLoading: form.deferLoading,
		enabled: form.enabled,
	};
}

export function ConnectorCatalogItem({
	item,
	onAdd,
	alreadyConfigured,
}: {
	readonly item: ConnectorCatalog[number];
	readonly onAdd: (input: ConnectorInput) => Promise<void>;
	readonly alreadyConfigured: boolean;
}) {
	const [saving, setSaving] = useState(false);
	const idPrefix = item.id.replace(/[^a-zA-Z0-9_-]/g, '-');
	const [form, setForm] = useState<ConnectorCatalogFormState>({
		name: item.name,
		serverLabel: serverLabelFromName(item.name),
		serverDescription: item.description,
		authorization: '',
		requireApproval: 'always',
		allowedTools: [],
		deferLoading: false,
		enabled: true,
	});

	const googleOAuth = 'authKind' in item && item.authKind === 'google_oauth';
	const canSubmit =
		!alreadyConfigured &&
		form.name.trim().length > 0 &&
		(googleOAuth || form.authorization.trim().length > 0) &&
		!saving;

	const update = <TKey extends keyof ConnectorCatalogFormState>(key: TKey, value: ConnectorCatalogFormState[TKey]): void => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	const toggleAllowedTool = (tool: string): void => {
		setForm((prev) => ({
			...prev,
			allowedTools: prev.allowedTools.includes(tool)
				? prev.allowedTools.filter((value) => value !== tool)
				: [...prev.allowedTools, tool],
		}));
	};

	const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
		event.preventDefault();
		setSaving(true);
		try {
			await onAdd(formToInput(form, item.id as OpenAiConnectorId, !googleOAuth));
			setForm({
				...form,
				name: item.name,
				serverLabel: serverLabelFromName(item.name),
				serverDescription: item.description,
				authorization: '',
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Collapsible className="rounded-lg border border-border/70 bg-card">
			<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
				<ConnectorIcon directConnectorId={item.directConnectorId} name={item.name} />
				<span className="min-w-0 flex-1 truncate text-[13px] font-medium">{item.name}</span>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="grid gap-2 border-t border-border/60 px-3 py-2.5">
				{item.scopes.length > 0 && (
					<div className="flex flex-wrap gap-1.5">
						{item.scopes.map((scope) => (
							<Badge key={scope} variant="outline" className="h-4 px-1.5 text-[10px]">
								{scope}
							</Badge>
						))}
					</div>
				)}
				{item.setupInstructions.length > 0 && (
					<div>
						<div className="mb-1 flex flex-wrap items-center justify-between gap-2">
							<p className="text-[11px] font-medium text-foreground">Setup</p>
							{item.setupUrl && (
								<a
									href={item.setupUrl}
									target="_blank"
									rel="noreferrer"
									onClick={(e) => handleExternalLinkClick(e, item.setupUrl)}
									className="inline-flex items-center gap-1 text-[11px] text-foreground underline-offset-2 hover:underline"
								>
									Open setup
									<ExternalLink className="size-3" />
								</a>
							)}
						</div>
						<ol className="grid list-decimal gap-1 pl-4 text-[11px] leading-4 text-muted-foreground">
							{item.setupInstructions.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ol>
					</div>
				)}
				{item.tools.length > 0 && (
					<div>
						<p className="mb-1 text-[11px] font-medium text-foreground">Tools</p>
						<div className="flex flex-wrap gap-1">
							{item.tools.map((tool) => (
								<span
									key={tool}
									className="rounded-md border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
								>
									{tool}
								</span>
							))}
						</div>
					</div>
				)}
				<ConnectorDocumentationRows connector={item} />
				<form onSubmit={submit} className="grid gap-2 border-t border-border/60 pt-2">
					<SettingsField id={`${idPrefix}-connector-name`} label="Name">
						<Input
							id={`${idPrefix}-connector-name`}
							value={form.name}
							onChange={(e) => update('name', e.target.value)}
							placeholder={item.name}
							className="h-7 px-2 text-xs md:text-xs"
						/>
					</SettingsField>

					<SettingsField id={`${idPrefix}-connector-server-description`} label="Description">
						<Textarea
							id={`${idPrefix}-connector-server-description`}
							value={form.serverDescription}
							onChange={(e) => update('serverDescription', e.target.value)}
							placeholder={item.description}
							className="min-h-14 py-1.5 text-xs md:text-xs"
						/>
					</SettingsField>

					<div className="grid gap-2 border-b border-border/60 md:grid-cols-2">
						<SettingsField id={`${idPrefix}-connector-server-label`} label="Server label">
							<Input
								id={`${idPrefix}-connector-server-label`}
								value={form.serverLabel}
								onChange={(e) => update('serverLabel', e.target.value)}
								placeholder="google_calendar"
								className="h-7 px-2 text-xs md:text-xs"
							/>
						</SettingsField>

						<SettingsField id={`${idPrefix}-connector-approval-policy`} label="Approval policy">
							<Select
								value={form.requireApproval}
								onValueChange={(value) => { if (value) update('requireApproval', value as ConnectorApprovalMode); }}
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
									<SelectItem value="never_for_allowed_tools">Skip approval for allowed tools</SelectItem>
									<SelectItem value="never">Never require approval</SelectItem>
								</SelectContent>
							</Select>
						</SettingsField>
					</div>

					{googleOAuth ? (
						<SettingsNotice variant="default">
							Google OAuth uses <span className="font-mono">GOOGLE_OAUTH_CLIENT_ID</span> and{' '}
							<span className="font-mono">GOOGLE_OAUTH_CLIENT_SECRET</span> from the app environment.
							Redirect: <span className="font-mono">{('redirectUri' in item && item.redirectUri) || 'Not configured'}</span>
						</SettingsNotice>
					) : (
						<SettingsField id={`${idPrefix}-connector-authorization`} label="OAuth access token">
							<Input
								id={`${idPrefix}-connector-authorization`}
								type="password"
								value={form.authorization}
								onChange={(e) => update('authorization', e.target.value)}
								placeholder="Paste OAuth access token"
								className="h-7 px-2 text-xs md:text-xs"
							/>
						</SettingsField>
					)}

					<div className="grid gap-2">
						<div className="flex flex-wrap items-center justify-between gap-2">
							<span className="text-[11px] font-medium text-foreground">Allowed tools</span>
							<span className="text-[11px] text-muted-foreground">
								Leave all unselected to allow every available tool.
							</span>
						</div>
						<div className="flex min-h-8 flex-wrap gap-1.5">
							{item.tools.length > 0 ? (
								item.tools.map((tool) => {
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
								<p className="text-[11px] text-muted-foreground">No tools found for this connector.</p>
							)}
						</div>
					</div>

					<div className="grid divide-y divide-border/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
						<div className="flex items-center justify-between gap-3 px-3 py-2.5">
							<div className="min-w-0">
								<label htmlFor={`${idPrefix}-connector-defer-loading`} className="block cursor-pointer text-[13px] font-medium text-foreground">
									Defer tool loading
								</label>
								<p className="text-[11px] leading-4 text-muted-foreground">
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
								<p className="text-[11px] leading-4 text-muted-foreground">
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

					<div className="flex flex-wrap justify-end gap-2 py-2">
						{alreadyConfigured && (
							<p className="text-xs text-destructive">This connector is already configured.</p>
						)}
						<Button type="submit" size="xs" disabled={!canSubmit}>
							{saving ? 'Saving...' : 'Add Connector'}
						</Button>
					</div>
				</form>
			</CollapsibleContent>
		</Collapsible>
	);
}
