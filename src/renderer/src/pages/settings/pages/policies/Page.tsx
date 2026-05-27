import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Permission, PolicyConfig, PolicyEntry, PolicyOutcome } from '../../../../../../shared/policy';
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

const PERMISSION_ORDER: readonly Permission[] = ['read', 'write', 'create', 'delete'];

function formatPermissions(entry: PolicyEntry): string {
	const permissions = PERMISSION_ORDER.filter((permission) => entry.permissions.includes(permission));
	return permissions.length > 0 ? permissions.join(', ') : 'none';
}

function defaultPolicyVariant(defaultPolicy: PolicyOutcome): React.ComponentProps<typeof Badge>['variant'] {
	return defaultPolicy === 'allow' ? 'default' : 'secondary';
}

const PoliciesPage: React.FC = () => {
	const { t } = useTranslation();
	const [policy, setPolicy] = useState<PolicyConfig | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadPolicy = useCallback(async (): Promise<void> => {
		setLoading(true);
		setError(null);
		try {
			setPolicy(await window.policy.get());
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadPolicy();
	}, [loadPolicy]);

	const sortedPaths = useMemo(() => {
		return [...(policy?.paths ?? [])].sort((a, b) => a.path.localeCompare(b.path));
	}, [policy]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.policies')}
				description={t('settings.policies.description')}
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => void loadPolicy()}
						disabled={loading}
					>
						<RefreshCw className="size-3.5" />
						{t('common.refresh')}
					</Button>
				}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsSection title={t('settings.policies.activePolicy')}>
				<SettingsPanel>
					{loading ? (
						<SettingsLoadingRows rows={3} />
					) : policy ? (
						<>
							<SettingsRow
								title={t('settings.policies.defaultPolicy')}
								description={t('settings.policies.defaultPolicyDescription')}
								icon={ShieldCheck}
								actions={
									<Badge variant={defaultPolicyVariant(policy.defaultPolicy)}>
										{t(`settings.policies.outcomes.${policy.defaultPolicy}`)}
									</Badge>
								}
							/>
							{sortedPaths.length > 0 ? (
								sortedPaths.map((entry) => (
									<SettingsRow
										key={entry.path}
										title={entry.path}
										description={
											entry.recursive
												? t('settings.policies.recursive')
												: t('settings.policies.singlePath')
										}
										icon={FileText}
										actions={
											<SettingsValue mono>{formatPermissions(entry)}</SettingsValue>
										}
									/>
								))
							) : (
								<SettingsEmptyState
									icon={FileText}
									title={t('settings.policies.noPaths')}
								/>
							)}
						</>
					) : (
						<SettingsEmptyState
							icon={FileText}
							title={t('settings.policies.unavailable')}
						/>
					)}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default PoliciesPage;
