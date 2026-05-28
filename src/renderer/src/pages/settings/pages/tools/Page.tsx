import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
	AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	AGENT_TOOLS,
	type AgentToolMetadata,
} from '../../../../../../shared/tools';
import type { AgentConfig, AgentRoutingSettings, AgentToolPermissionMode } from '../../../../../../shared/store';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const DEFAULT_AGENT_ID = 'main';
const PERMISSION_OPTIONS: Array<{ value: AgentToolPermissionMode; label: string; icon: typeof ShieldCheck }> = [
	{ value: 'deny', label: 'Deny', icon: ShieldX },
	{ value: 'allow', label: 'Allow', icon: ShieldCheck },
	{ value: 'ask', label: 'Ask for confirmation', icon: ShieldAlert },
];

const filesystemToolNames = new Set<string>([
	...AGENT_TOOL_FILESYSTEM_READ_TOOLS,
	...AGENT_TOOL_FILESYSTEM_WRITE_TOOLS,
	...AGENT_TOOL_FILESYSTEM_DELETE_TOOLS,
].map((tool) => tool.name));

const TOOL_GROUPS: Array<{ title: string; tools: readonly AgentToolMetadata[] }> = [
	{ title: 'Read-only tools', tools: AGENT_TOOL_FILESYSTEM_READ_TOOLS },
	{ title: 'Write and edit tools', tools: AGENT_TOOL_FILESYSTEM_WRITE_TOOLS },
	{ title: 'Delete tools', tools: AGENT_TOOL_FILESYSTEM_DELETE_TOOLS },
	{ title: 'Other tools', tools: AGENT_TOOLS.filter((tool) => !filesystemToolNames.has(tool.name)) },
];

function defaultToolPermissions(): Record<string, AgentToolPermissionMode> {
	return Object.fromEntries(AGENT_TOOLS.map((tool) => [tool.name, 'allow'])) as Record<string, AgentToolPermissionMode>;
}

function normalizeToolPermissions(value: unknown): Record<string, AgentToolPermissionMode> {
	const next = defaultToolPermissions();
	if (!value || typeof value !== 'object' || Array.isArray(value)) return next;
	for (const [name, mode] of Object.entries(value as Record<string, unknown>)) {
		if (name in next && (mode === 'allow' || mode === 'ask' || mode === 'deny')) next[name] = mode;
	}
	return next;
}

function defaultAgent(settings: AgentRoutingSettings | undefined): AgentConfig {
	return settings?.agents.find((agent) => agent.default) ?? settings?.agents[0] ?? { id: DEFAULT_AGENT_ID, default: true };
}

const ToolsPage: React.FC = () => {
	const { t } = useTranslation();
	const [settings, setSettings] = React.useState<AgentRoutingSettings | undefined>();
	const [agentId, setAgentId] = React.useState(DEFAULT_AGENT_ID);
	const [permissions, setPermissions] = React.useState<Record<string, AgentToolPermissionMode>>(defaultToolPermissions);
	const [savingTool, setSavingTool] = React.useState<string | undefined>();
	const [error, setError] = React.useState<string | undefined>();

	React.useEffect(() => {
		let cancelled = false;
		void window.store.getAgentRoutingSettings()
			.then((loaded) => {
				if (cancelled) return;
				const agent = defaultAgent(loaded);
				setSettings(loaded);
				setAgentId(agent.id);
				setPermissions(normalizeToolPermissions(agent.tools?.permissions));
			})
			.catch((loadError) => {
				if (!cancelled) setError(loadError instanceof Error ? loadError.message : String(loadError));
			});
		return () => { cancelled = true; };
	}, []);

	const agents = settings?.agents.length ? settings.agents : [{ id: DEFAULT_AGENT_ID, default: true }];

	async function savePermission(toolName: string, mode: AgentToolPermissionMode): Promise<void> {
		const previous = permissions;
		const nextPermissions = { ...permissions, [toolName]: mode };
		setPermissions(nextPermissions);
		setSavingTool(toolName);
		setError(undefined);
		try {
			const current = settings ?? { agents: [], bindings: [] };
			const existingAgents = current.agents.length ? current.agents : [{ id: agentId, default: true }];
			const nextAgents = existingAgents.map((agent) => agent.id === agentId
				? { ...agent, tools: { ...(agent.tools ?? {}), permissions: nextPermissions } }
				: agent);
			if (!nextAgents.some((agent) => agent.id === agentId)) {
				nextAgents.push({ id: agentId, default: nextAgents.length === 0, tools: { permissions: nextPermissions } });
			}
			const saved = await window.store.setAgentRoutingSettings({ agents: nextAgents, bindings: current.bindings });
			setSettings(saved);
		} catch (saveError) {
			setPermissions(previous);
			setError(saveError instanceof Error ? saveError.message : String(saveError));
		} finally {
			setSavingTool(undefined);
		}
	}

	function selectAgent(nextAgentId: string | null): void {
		if (!nextAgentId) return;
		const agent = settings?.agents.find((entry) => entry.id === nextAgentId) ?? { id: nextAgentId };
		setAgentId(nextAgentId);
		setPermissions(normalizeToolPermissions(agent.tools?.permissions));
	}

	function renderTool(tool: AgentToolMetadata): React.JSX.Element {
		return (
			<Item
				key={tool.name}
				variant="outline"
				size="md"
				className="border-b border-border/60 last:border-b-0"
			>
				<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
					<div className="flex w-full min-w-0 items-center gap-2">
						<ItemTitle className="min-w-0 truncate">
							{tool.label}
						</ItemTitle>
						<Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
							{tool.name}
						</Badge>
					</div>
					<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground/60">
						{tool.description}
					</p>
				</ItemContent>
				<Select
					value={permissions[tool.name] ?? 'allow'}
					disabled={savingTool === tool.name}
					onValueChange={(value) => { if (value) void savePermission(tool.name, value as AgentToolPermissionMode); }}
				>
					<SelectTrigger size="sm" className="w-44 shrink-0">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PERMISSION_OPTIONS.map((option) => {
							const Icon = option.icon;
							return (
								<SelectItem key={option.value} value={option.value}>
									<span className="inline-flex items-center gap-2">
										<Icon className="size-3" />
										{option.label}
									</span>
								</SelectItem>
							);
						})}
					</SelectContent>
				</Select>
			</Item>
		);
	}

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.tools')}
				description={t('settings.overview.descriptions.tools')}
			/>

			<SettingsSection hideTitle title={t('settings.tabs.tools')} description={t('settings.overview.descriptions.tools')}>
				<SettingsPanel>
					<div className="flex min-h-12 items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
						<div className="min-w-0">
							<p className="text-xs font-medium leading-4">Tool permissions</p>
							<p className="text-[11px] leading-4 text-muted-foreground/60">
								Default access is allow.
							</p>
						</div>
						<Select value={agentId} onValueChange={selectAgent}>
							<SelectTrigger size="sm" className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{agents.map((agent) => (
									<SelectItem key={agent.id} value={agent.id}>
										{agent.name ?? agent.id}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					{error ? (
						<div className="border-b border-border/60 px-3 py-2 text-xs text-destructive">
							{error}
						</div>
					) : null}
					{TOOL_GROUPS.filter((group) => group.tools.length > 0).map((group) => (
						<div key={group.title} className="border-b border-border/60 last:border-b-0">
							<div className="bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
								{group.title}
							</div>
							{group.tools.map((tool) => renderTool(tool))}
						</div>
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ToolsPage;
