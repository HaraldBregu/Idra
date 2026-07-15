import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FolderOpen, FolderX, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	SettingsEmptyState,
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
	SettingsValue,
} from '../../components';

type Permissions = Awaited<ReturnType<typeof window.agent.policyGet>>;
type PermissionMode = Permissions['defaultMode'];
type PathPermission = Permissions['permissions'][number];
type ToolState = 'inherit' | 'allow' | 'ask' | 'deny';

const MODES: readonly PermissionMode[] = ['allow', 'ask', 'deny'];

// The wildcard plus the tools whose access a path rule can flip.
const PERM_TOOLS = ['*', 'write', 'edit', 'exec', 'apply_patch'] as const;

const ROW_CLASS = 'border-b border-border/60 last:border-b-0';

const PoliciesPage: React.FC = () => {
	const { t } = useTranslation();
	const [policy, setPolicy] = useState<Permissions | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [newPath, setNewPath] = useState('');
	const [newRecursive, setNewRecursive] = useState(true);

	const apply = (operation: Promise<Permissions>): void => {
		setError(null);
		operation.then(setPolicy).catch((err: unknown) => {
			setError(err instanceof Error ? err.message : t('settings.policies.saveFailed'));
		});
	};

	useEffect(() => {
		window.agent
			.policyGet()
			.then(setPolicy)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
			});
	}, []);

	const addDirectory = (): void => {
		const path = newPath.trim();
		if (!path) return;
		apply(window.agent.policySetPathPermission(path, ['*'], [], [], newRecursive));
		setNewPath('');
	};

	const toolState = (entry: PathPermission, tool: string): ToolState => {
		if (entry.deny.includes(tool)) return 'deny';
		if (entry.ask.includes(tool)) return 'ask';
		if (entry.allow.includes(tool)) return 'allow';
		return 'inherit';
	};

	const setToolState = (entry: PathPermission, tool: string, state: ToolState): void => {
		const allow = entry.allow.filter((name) => name !== tool);
		const deny = entry.deny.filter((name) => name !== tool);
		const ask = entry.ask.filter((name) => name !== tool);
		if (state === 'allow') allow.push(tool);
		if (state === 'deny') deny.push(tool);
		if (state === 'ask') ask.push(tool);
		apply(window.agent.policySetPathPermission(entry.path, allow, deny, ask, entry.recursive));
	};

	const setRecursive = (entry: PathPermission, recursive: boolean): void => {
		apply(
			window.agent.policySetPathPermission(
				entry.path,
				entry.allow,
				entry.deny,
				entry.ask,
				recursive,
			),
		);
	};

	const browseDirectory = (): void => {
		setError(null);
		window.agent
			.policyPickDirectory()
			.then((picked) => {
				if (picked) setNewPath(picked);
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
			});
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.policies')}
				description={t('settings.overview.descriptions.policies')}
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => apply(window.agent.policyReset())}
					>
						<RotateCcw className="size-3" />
						{t('settings.policies.reset')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{!policy ? (
				<SettingsLoadingRows rows={4} />
			) : (
				<>
					<SettingsSection
						title={t('settings.policies.toolsTitle')}
						description={t('settings.policies.toolsDescription')}
					>
						<SettingsPanel>
							<Item variant="outline" size="md" className={ROW_CLASS}>
								<ItemContent className="min-w-0 flex-1">
									<ItemTitle className="max-w-full truncate">
										{t('settings.policies.defaultMode')}
									</ItemTitle>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end">
									<SettingsValue>{t(`settings.policies.modes.${policy.defaultMode}`)}</SettingsValue>
								</ItemActions>
							</Item>

							{Object.entries(policy.tools).map(([toolName, entry]) => {
								const grants = [...(entry.allowedCommands ?? []), ...(entry.allowedPaths ?? [])];
								return (
									<Item key={toolName} variant="outline" size="md" className={ROW_CLASS}>
										<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
											<ItemTitle className="max-w-full truncate font-mono">{toolName}</ItemTitle>
											{grants.length > 0 && (
												<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
													{t('settings.policies.granted', { items: grants.join(', ') })}
												</p>
											)}
										</ItemContent>
										<ItemActions className="ml-auto flex-none justify-end">
											<Select
												value={entry.mode}
												onValueChange={(value) => {
													if (value)
														apply(window.agent.policySetToolMode(toolName, value as PermissionMode));
												}}
											>
												<SelectTrigger className="h-7 w-28 text-xs">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{MODES.map((mode) => (
														<SelectItem key={mode} value={mode}>
															{t(`settings.policies.modes.${mode}`)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</ItemActions>
									</Item>
								);
							})}
						</SettingsPanel>
					</SettingsSection>

					<SettingsSection
						title={t('settings.policies.permissionsTitle')}
						description={t('settings.policies.permissionsDescription')}
					>
						<SettingsPanel>
							{policy.permissions.length === 0 ? (
								<SettingsEmptyState icon={FolderX} title={t('settings.policies.empty')} />
							) : (
								policy.permissions.map((entry) => (
									<Item key={entry.absolutePath} variant="outline" size="md" className={ROW_CLASS}>
										<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
											<ItemTitle className="max-w-full truncate font-mono">
												{entry.relativePath}
											</ItemTitle>
											{entry.absolutePath !== entry.relativePath && (
												<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
													{entry.absolutePath}
												</p>
											)}
										</ItemContent>
										<ItemActions className="ml-auto flex-none justify-end">
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label={t('common.delete')}
												onClick={() => apply(window.agent.policyRemovePathPermission(entry.absolutePath))}
											>
												<Trash2 className="size-3" />
											</Button>
										</ItemActions>
										<div className="flex w-full flex-wrap items-end gap-2 pt-1">
											{PERM_TOOLS.map((tool) => (
												<label key={tool} className="flex flex-col gap-1">
													<span className="font-mono text-[11px] text-muted-foreground">
														{tool === '*' ? t('settings.policies.allTools') : tool}
													</span>
													<Select
														value={toolState(entry, tool)}
														onValueChange={(value) => {
															if (value) setToolState(entry, tool, value as ToolState);
														}}
													>
														<SelectTrigger className="h-7 w-24 text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="inherit">
																{t('settings.policies.inherit')}
															</SelectItem>
															<SelectItem value="allow">
																{t('settings.policies.modes.allow')}
															</SelectItem>
															<SelectItem value="deny">
																{t('settings.policies.modes.deny')}
															</SelectItem>
														</SelectContent>
													</Select>
												</label>
											))}
										</div>
									</Item>
								))
							)}

							<Item variant="outline" size="md">
								<ItemContent className="min-w-0 flex-1 gap-2">
									<Input
										value={newPath}
										onChange={(event) => setNewPath(event.target.value)}
										onKeyDown={(event) => {
											if (event.key === 'Enter') addDirectory();
										}}
										placeholder={t('settings.policies.pathPlaceholder')}
										className="h-7 w-full font-mono text-xs"
										aria-label={t('settings.policies.pathPlaceholder')}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="flex-none"
										onClick={browseDirectory}
									>
										<FolderOpen className="size-3" />
										{t('settings.policies.browse')}
									</Button>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-2">
									<Button type="button" size="sm" disabled={!newPath.trim()} onClick={addDirectory}>
										<Plus className="size-3" />
										{t('settings.policies.add')}
									</Button>
								</ItemActions>
							</Item>
						</SettingsPanel>
					</SettingsSection>
				</>
			)}
		</SettingsPageShell>
	);
};

export default PoliciesPage;
