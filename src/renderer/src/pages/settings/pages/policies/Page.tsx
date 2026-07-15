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

const MODES: readonly PermissionMode[] = ['allow', 'ask', 'deny'];

const ROW_CLASS = 'border-b border-border/60 last:border-b-0';

const PoliciesPage: React.FC = () => {
	const { t } = useTranslation();
	const [policy, setPolicy] = useState<Permissions | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [newPath, setNewPath] = useState('');
	const [newMode, setNewMode] = useState<PermissionMode>('allow');
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
		apply(window.agent.policyAddRestrictedDirectory(path, newRecursive));
		setNewPath('');
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
						title={t('settings.policies.restrictedTitle')}
						description={t('settings.policies.restrictedDescription')}
					>
						<SettingsPanel>
							{policy.restrictedDirectories.length === 0 ? (
								<SettingsEmptyState icon={FolderX} title={t('settings.policies.empty')} />
							) : (
								policy.restrictedDirectories.map((dir) => (
									<Item key={dir.path} variant="outline" size="md" className={ROW_CLASS}>
										<ItemContent className="min-w-0 flex-1">
											<ItemTitle className="max-w-full truncate font-mono">{dir.path}</ItemTitle>
										</ItemContent>
										<ItemActions className="ml-auto flex-none justify-end gap-2">
											<Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
												{t('settings.policies.recursive')}
												<Switch
													checked={dir.recursive}
													onCheckedChange={(checked) =>
														apply(window.agent.policyAddRestrictedDirectory(dir.path, checked))
													}
												/>
											</Label>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label={t('common.delete')}
												onClick={() => apply(window.agent.policyRemoveRestrictedDirectory(dir.path))}
											>
												<Trash2 className="size-3" />
											</Button>
										</ItemActions>
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
