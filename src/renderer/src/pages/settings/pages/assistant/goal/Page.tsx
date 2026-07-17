import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Item, ItemActions, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	SettingsLoadingRows,
	SettingsNotice,
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
} from '../../../components';

type GoalSettings = Awaited<ReturnType<typeof window.agent.goalGetSettings>>;

const GoalBudgetRow: React.FC<{
	id: string;
	title: string;
	value: number;
	onCommit: (value: number) => void;
}> = ({ id, title, value, onCommit }) => (
	<Item variant="outline" size="md" className="border-b border-border/60 last:border-b-0">
		<ItemContent className="min-w-0 flex-1">
			<ItemTitle className="max-w-full truncate">{title}</ItemTitle>
		</ItemContent>
		<ItemActions className="ml-auto flex-none justify-end">
			<Input
				key={`${id}-${value}`}
				id={id}
				type="number"
				min={1}
				defaultValue={value}
				aria-label={title}
				className="h-7 w-44 text-xs"
				onKeyDown={(event) => {
					if (event.key === 'Enter') event.currentTarget.blur();
				}}
				onBlur={(event) => {
					const next = Number.parseInt(event.currentTarget.value, 10);
					if (!Number.isInteger(next) || next < 1) {
						event.currentTarget.value = String(value);
						return;
					}
					if (next !== value) onCommit(next);
				}}
			/>
		</ItemActions>
	</Item>
);

const GoalPage: React.FC = () => {
	const { t } = useTranslation();
	const [goalSettings, setGoalSettings] = useState<GoalSettings | null>(null);
	const [goalError, setGoalError] = useState<string | null>(null);

	useEffect(() => {
		let mounted = true;
		void window.agent
			.goalGetSettings()
			.then((settings) => {
				if (mounted) setGoalSettings(settings);
			})
			.catch((error: unknown) => {
				if (!mounted) return;
				setGoalError(error instanceof Error ? error.message : t('settings.goal.errors.load'));
			});
		return () => {
			mounted = false;
		};
	}, [t]);

	const saveGoalSettings = (patch: Partial<GoalSettings>): void => {
		setGoalError(null);
		window.agent
			.goalSaveSettings(patch)
			.then(setGoalSettings)
			.catch((error: unknown) => {
				setGoalError(error instanceof Error ? error.message : t('settings.goal.errors.save'));
			});
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.goal.title')}
				description={t('settings.goal.description')}
			/>

			{goalError && (
				<SettingsNotice variant="destructive" icon={AlertTriangle}>
					{goalError}
				</SettingsNotice>
			)}

			{goalSettings ? (
				<SettingsPanel>
					<GoalBudgetRow
						id="goal-max-iterations"
						title={t('settings.goal.fields.maxIterations')}
						value={goalSettings.maxIterations}
						onCommit={(value) => saveGoalSettings({ maxIterations: value })}
					/>
					<GoalBudgetRow
						id="goal-max-tool-calls"
						title={t('settings.goal.fields.maxToolCalls')}
						value={goalSettings.maxToolCalls}
						onCommit={(value) => saveGoalSettings({ maxToolCalls: value })}
					/>
					<GoalBudgetRow
						id="goal-timeout-minutes"
						title={t('settings.goal.fields.timeoutMinutes')}
						value={Math.max(1, Math.round((goalSettings.timeoutMs ?? 600000) / 60000))}
						onCommit={(value) => saveGoalSettings({ timeoutMs: value * 60000 })}
					/>
				</SettingsPanel>
			) : (
				<SettingsLoadingRows rows={3} />
			)}
		</SettingsPageShell>
	);
};

export default GoalPage;
