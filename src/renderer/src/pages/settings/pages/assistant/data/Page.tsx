import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DataScope } from '../../../../../../../shared/data_types';
import {
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
} from '../../../components';
import { firstErrorMessage } from '../../../components/model-configuration-state';

type DataControlKind =
	| 'memory'
	| 'sessions'
	| 'wiki'
	| 'local_index'
	| 'local_namespace'
	| 'remote_namespace'
	| 'remote_all_namespaces';

const DataPage: React.FC = () => {
	const { t } = useTranslation();
	const [scopes, setScopes] = useState<DataScope[] | null>(null);
	const [action, setAction] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void window.dataControls.listScopes().then(
			(nextScopes) => {
				if (!mounted) return;
				setScopes(nextScopes);
				setError(null);
			},
			(loadError) => {
				if (mounted) setError(firstErrorMessage(loadError, t('settings.dataControls.loadError')));
			}
		);
		return () => {
			mounted = false;
		};
	}, [t]);

	const scopeFor = (kind: DataControlKind): DataScope | undefined => {
		return scopes?.find((scope) => {
			if (kind === 'memory' || kind === 'sessions' || kind === 'wiki') {
				return scope.kind === kind;
			}
			return scope.kind === 'rag' && scope.mode === kind;
		});
	};

	const handleAction = async (
		kind: DataControlKind,
		nextAction: 'export' | 'purge'
	): Promise<void> => {
		const scope = scopeFor(kind);
		if (!scope) return;
		setAction(`${kind}:${nextAction}`);
		setError(null);
		try {
			if (nextAction === 'export') await window.dataControls.export(scope);
			else {
				const preview = await window.dataControls.previewPurge(scope);
				const purged = await window.dataControls.purge(scope, preview.confirmationId);
				if (purged) setScopes(await window.dataControls.listScopes());
			}
		} catch (actionError) {
			setError(firstErrorMessage(actionError, t('settings.dataControls.actionError')));
		} finally {
			setAction(null);
		}
	};

	const actionsFor = (kind: DataControlKind, exportable = true) => (
		<>
			{exportable && (
				<Button
					variant="outline"
					size="sm"
					disabled={!scopeFor(kind) || action !== null}
					onClick={() => void handleAction(kind, 'export')}
				>
					<Download className="size-3" />
					{t('settings.dataControls.export')}
				</Button>
			)}
			<Button
				variant="destructive"
				size="sm"
				disabled={!scopeFor(kind) || action !== null}
				onClick={() => void handleAction(kind, 'purge')}
			>
				<Trash2 className="size-3" />
				{t('settings.dataControls.purge')}
			</Button>
		</>
	);
	const sessionScope = scopeFor('sessions');
	const sessionCount = sessionScope?.kind === 'sessions' ? sessionScope.sessionIds.length : 0;

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.dataControls.title')}
				description={t('settings.dataControls.description')}
			/>

			{error && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{error}
				</SettingsNotice>
			)}

			<SettingsPanel>
				<SettingsRow
					title={t('settings.dataControls.memory')}
					description={t('settings.dataControls.memoryDescription')}
					actions={actionsFor('memory')}
				/>
				<SettingsRow
					title={t('settings.dataControls.sessions')}
					description={t('settings.dataControls.sessionsDescription', {
						count: sessionCount,
					})}
					actions={actionsFor('sessions')}
				/>
				<SettingsRow
					title={t('settings.dataControls.ragIndex')}
					description={t('settings.dataControls.ragIndexDescription')}
					actions={actionsFor('local_index')}
				/>
				<SettingsRow
					title={t('settings.dataControls.ragNamespace')}
					description={t('settings.dataControls.ragNamespaceDescription')}
					actions={actionsFor('local_namespace')}
				/>
				<SettingsRow
					title={t('settings.dataControls.remoteNamespace')}
					description={t('settings.dataControls.remoteNamespaceDescription')}
					actions={actionsFor('remote_namespace', false)}
				/>
				<SettingsRow
					title={t('settings.dataControls.remoteAllNamespaces')}
					description={t('settings.dataControls.remoteAllNamespacesDescription')}
					actions={actionsFor('remote_all_namespaces', false)}
				/>
				<SettingsRow
					title={t('settings.dataControls.wiki')}
					description={t('settings.dataControls.wikiDescription')}
					actions={actionsFor('wiki')}
				/>
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default DataPage;
