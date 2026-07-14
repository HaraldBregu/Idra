import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FolderX, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
	SettingsRow,
	SettingsSection,
	SettingsValue,
} from '../../components';

type Permissions = Awaited<ReturnType<typeof window.agent.policyGet>>;
type PermissionMode = Permissions['defaultMode'];

const MODES: readonly PermissionMode[] = ['allow', 'ask', 'deny'];

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
		apply(window.agent.policyGet());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const addDirectory = (): void => {
		const path = newPath.trim();
		if (!path) return;
		apply(window.agent.policyAddRestrictedDirectory(path, newRecursive));
		setNewPath('');
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
							<SettingsRow
								title={t('settings.policies.defaultMode')}
								actions={<SettingsValue>{t(`settings.policies.modes.${policy.defaultMode}`)}</SettingsValue>}
							/>
							{Object.entries(policy.tools).map(([toolName, entry]) => {
								const grants = [...(entry.allowedCommands ?? []), ...(entry.allowedPaths ?? [])];
								return (
									<SettingsRow
										key={toolName}
										title={<span className="font-mono">{toolName}</span>}
										description={
											grants.length > 0
												? t('settings.policies.granted', { items: grants.join(', ') })
												: undefined
										}
										actions={
											<Select
												value={entry.mode}
												onValueChange={(value) => {
													if (value) apply(window.agent.policySetToolMode(toolName, value as PermissionMode));
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
										}
									/>
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
									<SettingsRow
										key={dir.path}
										title={<span className="font-mono">{dir.path}</span>}
										actions={
											<>
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
													onClick={() =>
														apply(window.agent.policyRemoveRestrictedDirectory(dir.path))
													}
												>
													<Trash2 className="size-3" />
												</Button>
											</>
										}
									/>
								))
							)}
						</SettingsPanel>

						<div className="flex flex-wrap items-center gap-2">
							<Input
								value={newPath}
								onChange={(event) => setNewPath(event.target.value)}
								onKeyDown={(event) => {
									if (event.key === 'Enter') addDirectory();
								}}
								placeholder={t('settings.policies.pathPlaceholder')}
								className="h-7 w-64 font-mono text-xs"
								aria-label={t('settings.policies.pathPlaceholder')}
							/>
							<Label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
								{t('settings.policies.recursive')}
								<Switch checked={newRecursive} onCheckedChange={setNewRecursive} />
							</Label>
							<Button type="button" size="sm" disabled={!newPath.trim()} onClick={addDirectory}>
								<Plus className="size-3" />
								{t('settings.policies.add')}
							</Button>
						</div>
					</SettingsSection>
				</>
			)}
		</SettingsPageShell>
	);
};

export default PoliciesPage;
