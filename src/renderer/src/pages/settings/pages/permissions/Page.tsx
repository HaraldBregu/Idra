import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
} from '../../components';
import Sandbox from './Sandbox';

type Permissions = Awaited<ReturnType<typeof window.agent.policyGet>>;
type PermissionKind = keyof Permissions;

const KINDS: PermissionKind[] = ['read', 'write', 'exec'];

const PermissionsPage: React.FC = () => {
	const { t } = useTranslation();
	const [permissions, setPermissions] = useState<Permissions | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const savingRef = useRef(false);

	const apply = (operation: () => Promise<Permissions>): void => {
		if (savingRef.current) return;
		savingRef.current = true;
		setSaving(true);
		setError(null);
		operation()
			.then(setPermissions)
			.catch((cause: unknown) => {
				setError(cause instanceof Error ? cause.message : t('settings.permissions.saveFailed'));
			})
			.finally(() => {
				savingRef.current = false;
				setSaving(false);
			});
	};

	useEffect(() => {
		window.agent.policyGet().then(setPermissions).catch((cause: unknown) => {
			setError(cause instanceof Error ? cause.message : String(cause));
		});
	}, []);

	const updateRules = (kind: PermissionKind, bucket: 'allow' | 'deny', value: string): void => {
		if (!permissions) return;
		const rules = [...new Set(value.split('\n').map((rule) => rule.trim()).filter(Boolean))];
		setPermissions({ ...permissions, [kind]: { ...permissions[kind], [bucket]: rules } });
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.permissions')}
				description={t('settings.overview.descriptions.permissions')}
				action={
					<div className="flex gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => apply(window.agent.policyReset)} disabled={saving}>
							<RotateCcw className="size-3" />
							{t('settings.permissions.reset')}
						</Button>
						<Button type="button" size="sm" onClick={() => permissions && apply(() => window.agent.policySet(permissions))} disabled={!permissions || saving}>
							<Save className="size-3" />
							{t('common.save')}
						</Button>
					</div>
				}
			/>

			{error && <SettingsNotice variant="destructive" icon={AlertTriangle}>{error}</SettingsNotice>}
			<Sandbox />

			{!permissions ? (
				<SettingsLoadingRows rows={3} />
			) : (
				<div className="grid gap-4 xl:grid-cols-3">
					{KINDS.map((kind) => (
						<Card key={kind} size="sm">
							<CardHeader>
								<CardTitle>{t(`settings.permissions.kinds.${kind}.title`)}</CardTitle>
								<CardDescription>{t(`settings.permissions.kinds.${kind}.description`)}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor={`${kind}-allow`}>{t('settings.permissions.allowRules')}</Label>
									<Textarea id={`${kind}-allow`} className="min-h-36 resize-y font-mono text-xs" value={permissions[kind].allow.join('\n')} onChange={(event) => updateRules(kind, 'allow', event.target.value)} disabled={saving} />
								</div>
								<div className="space-y-2">
									<Label htmlFor={`${kind}-deny`}>{t('settings.permissions.denyRules')}</Label>
									<Textarea id={`${kind}-deny`} className="min-h-36 resize-y font-mono text-xs" value={permissions[kind].deny.join('\n')} onChange={(event) => updateRules(kind, 'deny', event.target.value)} disabled={saving} />
								</div>
								<p className="text-xs text-muted-foreground">{t('settings.permissions.rulesHint')}</p>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</SettingsPageShell>
	);
};

export default PermissionsPage;
