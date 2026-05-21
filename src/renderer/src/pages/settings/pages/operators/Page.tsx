import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	Bot,
	ChevronRight,
	ClipboardList,
	Clock3,
	ImageIcon,
	Mic,
	Music,
	ScanText,
	Video,
	Volume2,
	type LucideIcon,
} from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	DOCUMENT_READER_OCR_OPERATOR_ID,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	VIDEO_CREATOR_OPERATOR_ID,
} from '../../../../../../shared/service';

const FRIDAY_OPERATOR_SLUG = 'friday';
const CRON_TASK_OPERATOR_ID = 'cron-task';
const BACKGROUND_TASK_OPERATOR_ID = 'background-task';

const OPERATOR_ROWS = [
	{
		id: FRIDAY_OPERATOR_SLUG,
		nameKey: 'settings.operators.fridayName',
		icon: Bot,
	},
	{
		id: SPEECH_TO_TEXT_OPERATOR_ID,
		nameKey: 'settings.operators.speechTranscriberName',
		icon: Mic,
	},
	{
		id: TEXT_TO_SPEECH_OPERATOR_ID,
		nameKey: 'settings.operators.textToSpeechName',
		icon: Volume2,
	},
	{
		id: IMAGE_CREATOR_OPERATOR_ID,
		nameKey: 'settings.operators.imageAssistantName',
		icon: ImageIcon,
	},
	{
		id: VIDEO_CREATOR_OPERATOR_ID,
		nameKey: 'settings.operators.videoCreatorName',
		icon: Video,
	},
	{
		id: MUSIC_CREATOR_OPERATOR_ID,
		nameKey: 'settings.operators.musicCreatorName',
		icon: Music,
	},
	{
		id: DOCUMENT_READER_OCR_OPERATOR_ID,
		nameKey: 'settings.operators.documentReaderName',
		icon: ScanText,
	},
	{
		id: CRON_TASK_OPERATOR_ID,
		nameKey: 'settings.operators.cronTaskName',
		icon: Clock3,
	},
	{
		id: BACKGROUND_TASK_OPERATOR_ID,
		nameKey: 'settings.operators.backgroundTaskName',
		icon: ClipboardList,
	},
] satisfies readonly {
	readonly id: string;
	readonly nameKey: string;
	readonly icon: LucideIcon;
}[];

const OperatorsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const openOperatorDetails = useCallback((operatorId: string) => {
		navigate(`/settings/operators/${encodeURIComponent(operatorId)}/details`);
	}, [navigate]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.operators')}
				description={t('settings.operators.description')}
			/>

			<SettingsSection title={t('settings.operators.allOperators')}>
				<SettingsPanel>
					{OPERATOR_ROWS.map((operator) => {
						const Icon = operator.icon;
						return (
							<Item
								key={operator.id}
								as="button"
								type="button"
								variant="outline"
								size="md"
								className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
								onClick={() => openOperatorDetails(operator.id)}
							>
								<ItemMedia variant="icon">
									<Icon className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{t(operator.nameKey)}</span>
										</span>
									</ItemTitle>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end">
									<ChevronRight className="size-3 text-muted-foreground" strokeWidth={1.8} />
								</ItemActions>
							</Item>
						);
					})}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default OperatorsPage;
