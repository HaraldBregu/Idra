import React, { useEffect, useRef, useState } from 'react';
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
} from '../../components';

type Permissions = Awaited<ReturnType<typeof window.agent.policyGet>>;
type Permission = Extract<Permissions[string], { default: unknown }>;
type PermissionMode = Permission['default'];

const PERMISSION_MODES: PermissionMode[] = ['allow', 'ask', 'deny'];
const ROW_CLASS = 'border-b border-border/60 last:border-b-0';

const isPermission = (entry: Permissions[string]): entry is Permission =>
	typeof entry === 'object' &&
	entry !== null &&
	!Array.isArray(entry) &&
	'default' in entry &&
	(entry.default === 'allow' || entry.default === 'ask' || entry.default === 'deny');

const permissionFor = (
	permissions: Permissions | null,
	toolName: string
): Permission | undefined => {
	const entry = permissions?.[toolName];
	return entry && isPermission(entry) ? entry : undefined;
};

const directoryToolsFor = (value: string): '*' | string[] => {
	const normalized = value.trim();
	if (normalized === '*') return '*';
	return [
		...new Set(
			normalized
				.split(',')
				.map((tool) => tool.trim())
				.filter(Boolean)
		),
	];
};

type PermissionsScope = 'agent' | 'tasks' | 'health' | 'channels';

const PermissionsPage: React.FC<{ readonly scope?: PermissionsScope }> = ({ scope = 'agent' }) => {
	const { t } = useTranslation();
	const [permissions, setPermissions] = useState<Permissions | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const savingRef = useRef(false);
	const [newDirectory, setNewDirectory] = useState('');
	const [newDirectoryTools, setNewDirectoryTools] = useState('*');
	const [newDirectoryRecursive, setNewDirectoryRecursive] = useState(true);

	const apply = (operation: () => Promise<Permissions>): void => {
		if (savingRef.current) return;
		savingRef.current = true;
		setSaving(true);
		setError(null);
		operation()
			.then(setPermissions)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : t('settings.permissions.saveFailed'));
			})
			.finally(() => {
				savingRef.current = false;
				setSaving(false);
			});
	};

	useEffect(() => {
		const operation =
			scope === 'tasks'
				? window.tasks.getPermissions()
				: scope === 'health'
					? window.agent.healthGetPermissions()
					: scope === 'channels'
						? window.app.getChannelsPermissions()
						: window.agent.policyGet();
		operation
			.then(setPermissions)
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
			});
	}, [scope]);

	const setDefault = (toolName: string, mode: PermissionMode): void => {
		const permission = permissionFor(permissions, toolName);
		if (!permission) return;
		const next = { ...permission, default: mode };
		apply(() =>
			scope === 'tasks'
				? window.tasks.savePermissions({ ...permissions!, [toolName]: next })
				: scope === 'health'
					? window.agent.healthSavePermissions({ ...permissions!, [toolName]: next })
					: scope === 'channels'
						? window.app.saveChannelsPermissions({ ...permissions!, [toolName]: next })
						: window.agent.policySetTool(toolName, next)
		);
	};

	const addDirectory = (): void => {
		const directory = newDirectory.trim();
		const directoryTools = directoryToolsFor(newDirectoryTools);
		if (!permissions || !directory || (directoryTools !== '*' && directoryTools.length === 0))
			return;
		const directories = {
			...permissions.dir,
			[directory]: { recoursive: newDirectoryRecursive, tools: directoryTools },
		};
		apply(() =>
			scope === 'tasks'
				? window.tasks.savePermissions({ ...permissions, dir: directories })
				: scope === 'health'
					? window.agent.healthSavePermissions({ ...permissions, dir: directories })
					: scope === 'channels'
						? window.app.saveChannelsPermissions({ ...permissions, dir: directories })
						: window.agent.policySetDirectories(directories)
		);
		setNewDirectory('');
	};

	const removeDirectory = (directory: string): void => {
		if (!permissions) return;
		const directories = { ...permissions.dir };
		delete directories[directory];
		apply(() =>
			scope === 'tasks'
				? window.tasks.savePermissions({ ...permissions, dir: directories })
				: scope === 'health'
					? window.agent.healthSavePermissions({ ...permissions, dir: directories })
					: scope === 'channels'
						? window.app.saveChannelsPermissions({ ...permissions, dir: directories })
						: window.agent.policySetDirectories(directories)
		);
	};

	const browseDirectory = (onPicked: (directory: string) => void): void => {
		setError(null);
		window.agent
			.policyPickDirectory()
			.then((picked) => {
				if (picked) onPicked(picked);
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
			});
	};

	const tools = permissions
		? Object.keys(permissions).filter(
				(toolName) => permissionFor(permissions, toolName) !== undefined
			)
		: [];
	const directories = permissions ? Object.entries(permissions.dir) : [];
	const parsedDirectoryTools = directoryToolsFor(newDirectoryTools);
	const canAddDirectory =
		newDirectory.trim().length > 0 &&
		(parsedDirectoryTools === '*' || parsedDirectoryTools.length > 0);
	const title =
		scope === 'tasks'
			? t('settings.permissions.scopes.tasksTitle')
			: scope === 'health'
				? t('settings.permissions.scopes.healthTitle')
				: scope === 'channels'
					? t('settings.permissions.scopes.channelsTitle')
					: t('settings.tabs.permissions');
	const description =
		scope === 'tasks'
			? t('settings.permissions.scopes.tasksDescription')
			: scope === 'health'
				? t('settings.permissions.scopes.healthDescription')
				: scope === 'channels'
					? t('settings.permissions.scopes.channelsDescription')
					: t('settings.overview.descriptions.permissions');
	const reset = (): Promise<Permissions> =>
		scope === 'tasks'
			? window.tasks.resetPermissions()
			: scope === 'health'
				? window.agent.healthResetPermissions()
				: scope === 'channels'
					? window.app.resetChannelsPermissions()
					: window.agent.policyReset();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={title}
				description={description}
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => apply(reset)}
						disabled={saving}
					>
						<RotateCcw className="size-3" />
						{t('settings.permissions.reset')}
					</Button>
				}
			/>

			{scope !== 'agent' && (
				<SettingsNotice>{t('settings.permissions.scopes.nonInteractiveNotice')}</SettingsNotice>
			)}

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{!permissions ? (
				<SettingsLoadingRows rows={4} />
			) : (
				<>
					<SettingsSection
						title={t('settings.permissions.directoriesTitle')}
						description={t('settings.permissions.directoriesDescription')}
					>
						<SettingsPanel>
							{directories.length === 0 ? (
								<SettingsEmptyState
									icon={FolderX}
									title={t('settings.permissions.directoriesEmpty')}
								/>
							) : (
								directories.map(([directory, permission]) => {
									const tools =
										permission.tools === '*'
											? t('settings.permissions.allTools')
											: permission.tools.join(', ');
									return (
										<Item key={directory} variant="outline" size="md" className={ROW_CLASS}>
											<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
												<ItemTitle className="max-w-full truncate font-mono">{directory}</ItemTitle>
												<span
													className="max-w-full truncate font-mono text-xs text-muted-foreground"
													title={tools}
												>
													{tools}
												</span>
											</ItemContent>
											<ItemActions className="ml-auto flex-none justify-end gap-2">
												<span className="text-xs text-muted-foreground">
													{t(
														permission.recoursive
															? 'settings.permissions.recursive'
															: 'settings.permissions.currentDirectory'
													)}
												</span>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													aria-label={t('settings.permissions.removeDirectory')}
												onClick={() => removeDirectory(directory)}
												disabled={saving}
												>
													<Trash2 className="size-3" />
												</Button>
											</ItemActions>
										</Item>
									);
								})
							)}

							<Item variant="outline" size="md">
								<ItemContent className="min-w-0 flex-1 gap-2">
									<div className="flex w-full flex-wrap items-center gap-2">
										<Input
											value={newDirectory}
											onChange={(event) => setNewDirectory(event.target.value)}
											placeholder={t('settings.permissions.directoryPlaceholder')}
											aria-label={t('settings.permissions.directoryPath')}
											className="h-7 min-w-48 flex-1 font-mono text-xs"
										/>
										<Input
											value={newDirectoryTools}
											onChange={(event) => setNewDirectoryTools(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter') addDirectory();
											}}
											placeholder={t('settings.permissions.directoryToolsPlaceholder')}
											aria-label={t('settings.permissions.directoryTools')}
											className="h-7 min-w-40 flex-1 font-mono text-xs"
										/>
										<div className="flex h-7 items-center gap-2 px-1">
											<Switch
												id={`directory-recursive-${scope}`}
												size="sm"
												checked={newDirectoryRecursive}
												onCheckedChange={setNewDirectoryRecursive}
												aria-label={t('settings.permissions.recursive')}
											/>
											<Label htmlFor={`directory-recursive-${scope}`} className="text-xs">
												{t('settings.permissions.recursive')}
											</Label>
										</div>
									</div>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										aria-label={t('settings.permissions.browseDirectory')}
										onClick={() => browseDirectory(setNewDirectory)}
									>
										<FolderOpen className="size-3" />
									</Button>
									<Button
										type="button"
										size="icon-sm"
										aria-label={t('settings.permissions.addDirectory')}
										disabled={!canAddDirectory || saving}
										onClick={addDirectory}
									>
										<Plus className="size-3" />
									</Button>
								</ItemActions>
							</Item>
						</SettingsPanel>
					</SettingsSection>

					<SettingsSection
						title={t('settings.permissions.toolsTitle')}
						description={t('settings.permissions.toolsDescription')}
					>
						<SettingsPanel>
							{tools.map((toolName) => (
								<Item key={toolName} variant="outline" size="md" className={ROW_CLASS}>
									<ItemContent className="min-w-0 flex-1">
										<ItemTitle className="max-w-full truncate font-mono">{toolName}</ItemTitle>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end gap-2">
										<span className="text-xs text-muted-foreground">
											{t('settings.permissions.defaultMode')}
										</span>
										<Select
											value={permissionFor(permissions, toolName)!.default}
											disabled={saving}
											onValueChange={(value) => {
												if (value) setDefault(toolName, value as PermissionMode);
											}}
										>
											<SelectTrigger className="h-7 w-24 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{PERMISSION_MODES.map((mode) => (
													<SelectItem key={mode} value={mode}>
														{t(`settings.permissions.modes.${mode}`)}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</ItemActions>
								</Item>
							))}
						</SettingsPanel>
					</SettingsSection>
				</>
			)}
		</SettingsPageShell>
	);
};

export default PermissionsPage;
