import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
	Bot,
	ChevronRight,
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
	DOCUMENT_READER_AGENT_ID,
	IMAGE_ASSISTANT_AGENT_ID,
	MUSIC_CREATOR_AGENT_ID,
	SPEECH_TRANSCRIBER_AGENT_ID,
	TEXT_TO_SPEECH_AGENT_ID,
	VIDEO_CREATOR_AGENT_ID,
} from '../../../../../../shared/service';

const FRIDAY_AGENT_SLUG = 'friday';

const AGENT_ROWS = [
	{
		id: FRIDAY_AGENT_SLUG,
		nameKey: 'settings.operators.fridayName',
		icon: Bot,
	},
	{
		id: SPEECH_TRANSCRIBER_AGENT_ID,
		nameKey: 'settings.operators.speechTranscriberName',
		icon: Mic,
	},
	{
		id: TEXT_TO_SPEECH_AGENT_ID,
		nameKey: 'settings.operators.textToSpeechName',
		icon: Volume2,
	},
	{
		id: IMAGE_ASSISTANT_AGENT_ID,
		nameKey: 'settings.operators.imageAssistantName',
		icon: ImageIcon,
	},
	{
		id: VIDEO_CREATOR_AGENT_ID,
		nameKey: 'settings.operators.videoCreatorName',
		icon: Video,
	},
	{
		id: MUSIC_CREATOR_AGENT_ID,
		nameKey: 'settings.operators.musicCreatorName',
		icon: Music,
	},
	{
		id: DOCUMENT_READER_AGENT_ID,
		nameKey: 'settings.operators.documentReaderName',
		icon: ScanText,
	},
] satisfies readonly {
	readonly id: string;
	readonly nameKey: string;
	readonly icon: LucideIcon;
}[];

const OperatorsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const openAgentDetails = useCallback((agentId: string) => {
		navigate(`/settings/operators/${encodeURIComponent(agentId)}/details`);
	}, [navigate]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.operators')}
				description={t('settings.operators.description')}
			/>

			<SettingsSection title={t('settings.operators.allAgents')}>
				<SettingsPanel>
					{AGENT_ROWS.map((agent) => {
						const Icon = agent.icon;
						return (
							<Item
								key={agent.id}
								as="button"
								type="button"
								variant="outline"
								size="md"
								className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
								onClick={() => openAgentDetails(agent.id)}
							>
								<ItemMedia variant="icon">
									<Icon className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
									<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
										<span className="flex min-w-0 flex-wrap items-center gap-1.5">
											<span className="truncate">{t(agent.nameKey)}</span>
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
