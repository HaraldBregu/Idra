import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	AlertTriangle,
	FolderOpen,
	FolderX,
	Pencil,
	Plus,
	RotateCcw,
	Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Field } from '@/components/ui/field';
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
type Permission = Permissions['tools'][string];
type PermissionMode = Permission['default'];

const PERMISSION_MODES: PermissionMode[] = ['allow', 'ask', 'deny'];
const ROW_CLASS = 'border-b border-border/60 last:border-b-0';

const permissionFor = (permissions: Permissions | null, toolName: string): Permission | undefined =>
	permissions?.tools[toolName];

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

const PermissionsPage: React.FC = () => {
	const { t } = useTranslation();
	const [permissions, setPermissions] = useState<Permissions | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const savingRef = useRef(false);
	const [workspaceDirectory, setWorkspaceDirectory] = useState('');
	const [editingDirectory, setEditingDirectory] = useState<string | null>(null);
	const [newDirectory, setNewDirectory] = useState('');
	const [newDirectoryTools, setNewDirectoryTools] = useState('*');
	const [newDirectoryEnabled, setNewDirectoryEnabled] = useState(true);
	const [newDirectoryRecursive, setNewDirectoryRecursive] = useState(true);

	const apply = (operation: () => Promise<Permissions>, onSuccess?: () => void): void => {
		if (savingRef.current) return;
		savingRef.current = true;
		setSaving(true);
		setError(null);
		operation()
			.then((nextPermissions) => {
				setPermissions(nextPermissions);
				onSuccess?.();
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : t('settings.permissions.saveFailed'));
			})
			.finally(() => {
				savingRef.current = false;
				setSaving(false);
			});
	};

	useEffect(() => {
		Promise.all([window.agent.policyGet(), window.agent.getWorkspaceLocation()])
			.then(([loadedPermissions, workspaceLocation]) => {
				setPermissions(loadedPermissions);
				setWorkspaceDirectory(workspaceLocation);
			})
			.catch((err: unknown) => {
				setError(err instanceof Error ? err.message : String(err));
			});
	}, []);

	const setDefault = (toolName: string, mode: PermissionMode): void => {
		const permission = permissionFor(permissions, toolName);
		if (!permission) return;
		apply(() => window.agent.policySetTool(toolName, { ...permission, default: mode }));
	};

	const saveDirectory = (): void => {
		const directory = newDirectory.trim();
		const directoryTools = directoryToolsFor(newDirectoryTools);
		if (!permissions || !directory || (directoryTools !== '*' && directoryTools.length === 0))
			return;
		apply(
			() =>
				window.agent.policySetDirectories([
					...permissions.directories.filter(
						(permission) => permission.path !== directory && permission.path !== editingDirectory
					),
					{
						path: directory,
						enabled: newDirectoryEnabled,
						recoursive: newDirectoryRecursive,
						tools: directoryTools,
					},
				]),
			() => {
				setEditingDirectory(null);
				setNewDirectory('');
				setNewDirectoryTools('*');
				setNewDirectoryEnabled(true);
				setNewDirectoryRecursive(true);
			}
		);
	};

	const editDirectory = (permission: Permissions['directories'][number]): void => {
		setEditingDirectory(permission.path);
		setNewDirectory(permission.path);
		setNewDirectoryTools(permission.tools === '*' ? '*' : permission.tools.join(', '));
		setNewDirectoryEnabled(permission.enabled);
		setNewDirectoryRecursive(permission.recoursive);
	};

	const cancelDirectoryEdit = (): void => {
		setEditingDirectory(null);
		setNewDirectory('');
		setNewDirectoryTools('*');
		setNewDirectoryEnabled(true);
		setNewDirectoryRecursive(true);
	};

	const removeDirectory = (directory: string): void => {
		if (!permissions) return;
		apply(
			() =>
				window.agent.policySetDirectories(
					permissions.directories.filter((permission) => permission.path !== directory)
				),
			editingDirectory === directory ? cancelDirectoryEdit : undefined
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

	const tools = permissions ? Object.keys(permissions.tools) : [];
	const directories = permissions?.directories ?? [];
	const parsedDirectoryTools = directoryToolsFor(newDirectoryTools);
	const canSaveDirectory =
		newDirectory.trim().length > 0 &&
		(parsedDirectoryTools === '*' || parsedDirectoryTools.length > 0);
	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.permissions')}
				description={t('settings.overview.descriptions.permissions')}
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => apply(window.agent.policyReset, cancelDirectoryEdit)}
						disabled={saving}
					>
						<RotateCcw className="size-3" />
						{t('settings.permissions.reset')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			{!permissions ? (
				<SettingsLoadingRows rows={4} />
			) : (
				<>
					<section aria-labelledby="directory-permissions-title">
						<Card size="sm" className="gap-0! py-0!">
							<CardHeader className="border-b border-border/60 py-3">
								<CardTitle>
									<h2 id="directory-permissions-title">
										{t('settings.permissions.directoriesTitle')}
									</h2>
								</CardTitle>
								<CardDescription className="text-xs">
									{t('settings.permissions.directoriesDescription')}
								</CardDescription>
							</CardHeader>

							<CardContent className="p-0!">
								<form
									className="grid gap-3 border-b border-border/60 bg-muted/20 px-3 py-3 sm:grid-cols-2"
									onSubmit={(event) => {
										event.preventDefault();
										saveDirectory();
									}}
								>
									<div className="sm:col-span-2">
										<h3 className="text-xs font-semibold text-foreground">
											{t(
												editingDirectory
													? 'settings.permissions.editDirectoryTitle'
													: 'settings.permissions.addDirectoryTitle'
											)}
										</h3>
									</div>

									<Field className="sm:col-span-2">
										<Label htmlFor="directory-path">
											{t('settings.permissions.directoryPath')}
										</Label>
										<div className="flex min-w-0 gap-2">
											<Input
												id="directory-path"
												value={newDirectory}
												onChange={(event) => setNewDirectory(event.target.value)}
												placeholder={t('settings.permissions.directoryPlaceholder')}
												className="h-8 min-w-0 flex-1 font-mono text-xs"
												disabled={saving || editingDirectory === workspaceDirectory}
											/>
											<Button
												type="button"
												variant="outline"
												size="icon-sm"
												aria-label={t('settings.permissions.browseDirectory')}
												onClick={() => browseDirectory(setNewDirectory)}
												disabled={saving || editingDirectory === workspaceDirectory}
											>
												<FolderOpen className="size-3" />
											</Button>
										</div>
									</Field>

									<Field>
										<Label htmlFor="directory-tools">
											{t('settings.permissions.directoryTools')}
										</Label>
										<Input
											id="directory-tools"
											value={newDirectoryTools}
											onChange={(event) => setNewDirectoryTools(event.target.value)}
											placeholder={t('settings.permissions.directoryToolsPlaceholder')}
											className="h-8 font-mono text-xs"
											disabled={saving}
										/>
									</Field>

									<div className="flex flex-wrap items-end gap-4 pb-1">
										<div className="flex h-8 items-center gap-2">
											<Switch
												id="directory-enabled"
												size="sm"
												checked={newDirectoryEnabled}
												onCheckedChange={setNewDirectoryEnabled}
												disabled={saving}
											/>
											<Label htmlFor="directory-enabled" className="text-xs">
												{t('settings.permissions.enabled')}
											</Label>
										</div>
										<div className="flex h-8 items-center gap-2">
											<Switch
												id="directory-recursive"
												size="sm"
												checked={newDirectoryRecursive}
												onCheckedChange={setNewDirectoryRecursive}
												disabled={saving}
											/>
											<Label htmlFor="directory-recursive" className="text-xs">
												{t('settings.permissions.recursive')}
											</Label>
										</div>
									</div>

									<div className="flex justify-end gap-2 sm:col-span-2">
										{editingDirectory && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={cancelDirectoryEdit}
												disabled={saving}
											>
												{t('common.cancel')}
											</Button>
										)}
										<Button type="submit" size="sm" disabled={!canSaveDirectory || saving}>
											{!editingDirectory && <Plus className="size-3" />}
											{t(
												editingDirectory ? 'common.save' : 'settings.permissions.addDirectory'
											)}
										</Button>
									</div>
								</form>

								<div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
									<h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
										{t('settings.permissions.configuredDirectories')}
									</h3>
									<Badge variant="secondary" className="text-[10px]">
										{directories.length}
									</Badge>
								</div>

								{directories.length === 0 ? (
									<SettingsEmptyState
										icon={FolderX}
										title={t('settings.permissions.directoriesEmpty')}
									/>
								) : (
									directories.map((permission) => {
										const directory = permission.path;
										const directoryTools =
											permission.tools === '*'
												? t('settings.permissions.allTools')
												: permission.tools.join(', ');
										const isWorkspace = directory === workspaceDirectory;
										return (
											<Item key={directory} variant="outline" size="md" className={ROW_CLASS}>
												<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
													<ItemTitle className="max-w-full truncate font-mono">
														{directory}
													</ItemTitle>
													<span
														className="max-w-full truncate font-mono text-xs text-muted-foreground"
														title={directoryTools}
													>
														{directoryTools}
													</span>
												</ItemContent>
												<ItemActions className="ml-auto flex-wrap justify-end gap-1.5">
													<Badge variant={permission.enabled ? 'secondary' : 'outline'}>
														{t(
															permission.enabled
																? 'settings.permissions.enabled'
																: 'settings.permissions.disabled'
														)}
													</Badge>
													{isWorkspace && (
														<Badge variant="outline">
															{t('settings.permissions.workspaceDirectory')}
														</Badge>
													)}
													<span className="px-1 text-xs text-muted-foreground">
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
														aria-label={t('settings.permissions.editDirectory', { directory })}
														onClick={() => editDirectory(permission)}
														disabled={saving}
													>
														<Pencil className="size-3" />
													</Button>
													{!isWorkspace && (
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															aria-label={t('settings.permissions.removeDirectory', { directory })}
															onClick={() => removeDirectory(directory)}
															disabled={saving}
														>
															<Trash2 className="size-3" />
														</Button>
													)}
												</ItemActions>
											</Item>
										);
									})
								)}
							</CardContent>
						</Card>
					</section>

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
