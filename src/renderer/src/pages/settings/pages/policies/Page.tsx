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
type PathPermission = Permissions['defaultPermissions'][number];
type ToolState = 'inherit' | 'allow' | 'ask' | 'deny';

// The wildcard plus the tools whose access a path rule can flip.
const PERM_TOOLS = ['*', 'exec', 'read', 'write', 'edit', 'apply_patch'] as const;

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

	const asList = (selector: PathPermission['allow']): string[] =>
		selector === '*' ? ['*'] : selector;

	const toolState = (entry: PathPermission, tool: string): ToolState => {
		if (asList(entry.deny).includes(tool)) return 'deny';
		if (asList(entry.ask).includes(tool)) return 'ask';
		if (asList(entry.allow).includes(tool)) return 'allow';
		return 'inherit';
	};

	const setToolState = (entry: PathPermission, tool: string, state: ToolState): void => {
		const allow = asList(entry.allow).filter((name) => name !== tool);
		const deny = asList(entry.deny).filter((name) => name !== tool);
		const ask = asList(entry.ask).filter((name) => name !== tool);
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
						</SettingsPanel>
					</SettingsSection>

					<SettingsSection
						title={t('settings.policies.permissionsTitle')}
						description={t('settings.policies.permissionsDescription')}
					>
						<SettingsPanel>
							{policy.defaultPermissions.length === 0 ? (
								<SettingsEmptyState icon={FolderX} title={t('settings.policies.empty')} />
							) : (
								policy.defaultPermissions.map((entry) => (
									<Item key={entry.path} variant="outline" size="md" className={ROW_CLASS}>
										<ItemContent className="min-w-0 flex-1">
											<ItemTitle className="max-w-full truncate font-mono">{entry.path}</ItemTitle>
										</ItemContent>
										<ItemActions className="ml-auto flex-none justify-end gap-2">
											<Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
												{t('settings.policies.recursive')}
												<Switch
													checked={entry.recursive}
													onCheckedChange={(checked) => setRecursive(entry, checked)}
												/>
											</Label>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label={t('common.delete')}
												onClick={() => apply(window.agent.policyRemovePathPermission(entry.path))}
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
															<SelectItem value="ask">{t('settings.policies.modes.ask')}</SelectItem>
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
									<Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
										{t('settings.policies.recursive')}
										<Switch checked={newRecursive} onCheckedChange={setNewRecursive} />
									</Label>
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
