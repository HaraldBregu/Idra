import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight, ImageIcon, Mic, Volume2, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	IMAGE_ASSISTANT_AGENT_ID,
	SPEECH_TRANSCRIBER_AGENT_ID,
	TEXT_TO_SPEECH_AGENT_ID,
} from '../../../../../../shared/service';

const FRIDAY_AGENT_SLUG = 'friday';

const AGENT_ROWS = [
	{
		id: FRIDAY_AGENT_SLUG,
		nameKey: 'settings.agents.fridayName',
		descriptionKey: 'settings.agents.fridayDescription',
		icon: Bot,
		badgeKey: 'settings.agents.defaultAgent',
	},
	{
		id: SPEECH_TRANSCRIBER_AGENT_ID,
		nameKey: 'settings.agents.speechTranscriberName',
		descriptionKey: 'settings.agents.speechTranscriberDescription',
		icon: Mic,
	},
	{
		id: TEXT_TO_SPEECH_AGENT_ID,
		nameKey: 'settings.agents.textToSpeechName',
		descriptionKey: 'settings.agents.textToSpeechDescription',
		icon: Volume2,
	},
	{
		id: IMAGE_ASSISTANT_AGENT_ID,
		nameKey: 'settings.agents.imageAssistantName',
		descriptionKey: 'settings.agents.imageAssistantDescription',
		icon: ImageIcon,
	},
] satisfies readonly {
	readonly id: string;
	readonly nameKey: string;
	readonly descriptionKey: string;
	readonly icon: LucideIcon;
	readonly badgeKey?: string;
}[];

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const openAgentDetails = useCallback((agentId: string) => {
		navigate(`/settings/agents/${encodeURIComponent(agentId)}/details`);
	}, [navigate]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.agents')}
				description={t('settings.agents.description')}
			/>

			<SettingsSection title={t('settings.agents.allAgents')}>
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
											{agent.badgeKey && (
												<Badge
													variant="outline"
													className="h-4 rounded-md bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground"
												>
													{t(agent.badgeKey)}
												</Badge>
											)}
										</span>
									</ItemTitle>
									<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
										{t(agent.descriptionKey)}
									</p>
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

export default AgentsPage;
