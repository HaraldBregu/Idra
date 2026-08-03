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

const permissionFor = (policy: Permissions | null, toolName: string): Permission | undefined => {
	const entry = policy?.[toolName];
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

const PoliciesPage: React.FC = () => {
	const { t } = useTranslation();
	const [policy, setPolicy] = useState<Permissions | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [newDirectory, setNewDirectory] = useState('');
	const [newDirectoryTools, setNewDirectoryTools] = useState('*');
	const [newDirectoryRecursive, setNewDirectoryRecursive] = useState(true);

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

	const setDefault = (toolName: string, mode: PermissionMode): void => {
		const permission = permissionFor(policy, toolName);
		if (!permission) return;
		apply(window.agent.policySetTool(toolName, { ...permission, default: mode }));
	};

	const addDirectory = (): void => {
		const directory = newDirectory.trim();
		const directoryTools = directoryToolsFor(newDirectoryTools);
		if (!policy || !directory || (directoryTools !== '*' && directoryTools.length === 0)) return;
		apply(
			window.agent.policySetDirectories({
				...policy.dir,
				[directory]: { recoursive: newDirectoryRecursive, tools: directoryTools },
			})
		);
		setNewDirectory('');
	};

	const removeDirectory = (directory: string): void => {
		if (!policy) return;
		const directories = { ...policy.dir };
		delete directories[directory];
		apply(window.agent.policySetDirectories(directories));
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

	const tools = policy
		? Object.keys(policy).filter((toolName) => permissionFor(policy, toolName) !== undefined)
		: [];
	const directories = policy ? Object.entries(policy.dir) : [];
	const parsedDirectoryTools = directoryToolsFor(newDirectoryTools);
	const canAddDirectory =
		newDirectory.trim().length > 0 &&
		(parsedDirectoryTools === '*' || parsedDirectoryTools.length > 0);

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
						title={t('settings.policies.directoriesTitle')}
						description={t('settings.policies.directoriesDescription')}
					>
						<SettingsPanel>
							{directories.length === 0 ? (
								<SettingsEmptyState
									icon={FolderX}
									title={t('settings.policies.directoriesEmpty')}
								/>
							) : (
								directories.map(([directory, permission]) => {
									const tools =
										permission.tools === '*'
											? t('settings.policies.allTools')
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
															? 'settings.policies.recursive'
															: 'settings.policies.currentDirectory'
													)}
												</span>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													aria-label={t('settings.policies.removeDirectory')}
													onClick={() => removeDirectory(directory)}
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
											placeholder={t('settings.policies.directoryPlaceholder')}
											aria-label={t('settings.policies.directoryPath')}
											className="h-7 min-w-48 flex-1 font-mono text-xs"
										/>
										<Input
											value={newDirectoryTools}
											onChange={(event) => setNewDirectoryTools(event.target.value)}
											onKeyDown={(event) => {
												if (event.key === 'Enter') addDirectory();
											}}
											placeholder={t('settings.policies.directoryToolsPlaceholder')}
											aria-label={t('settings.policies.directoryTools')}
											className="h-7 min-w-40 flex-1 font-mono text-xs"
										/>
										<div className="flex h-7 items-center gap-2 px-1">
											<Switch
												id="directory-recursive"
												size="sm"
												checked={newDirectoryRecursive}
												onCheckedChange={setNewDirectoryRecursive}
												aria-label={t('settings.policies.recursive')}
											/>
											<Label htmlFor="directory-recursive" className="text-xs">
												{t('settings.policies.recursive')}
											</Label>
										</div>
									</div>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-2">
									<Button
										type="button"
										variant="outline"
										size="icon-sm"
										aria-label={t('settings.policies.browseDirectory')}
										onClick={() => browseDirectory(setNewDirectory)}
									>
										<FolderOpen className="size-3" />
									</Button>
									<Button
										type="button"
										size="icon-sm"
										aria-label={t('settings.policies.addDirectory')}
										disabled={!canAddDirectory}
										onClick={addDirectory}
									>
										<Plus className="size-3" />
									</Button>
								</ItemActions>
							</Item>
						</SettingsPanel>
					</SettingsSection>

					<SettingsSection
						title={t('settings.policies.toolsTitle')}
						description={t('settings.policies.toolsDescription')}
					>
						<SettingsPanel>
							{tools.map((toolName) => (
								<Item key={toolName} variant="outline" size="md" className={ROW_CLASS}>
									<ItemContent className="min-w-0 flex-1">
										<ItemTitle className="max-w-full truncate font-mono">{toolName}</ItemTitle>
									</ItemContent>
									<ItemActions className="ml-auto flex-none justify-end gap-2">
										<span className="text-xs text-muted-foreground">
											{t('settings.policies.defaultMode')}
										</span>
										<Select
											value={permissionFor(policy, toolName)!.default}
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
														{t(`settings.policies.modes.${mode}`)}
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

export default PoliciesPage;
