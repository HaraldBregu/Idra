import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Item, ItemActions, ItemContent, ItemIcon, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const AGENTS = [
	{
		id: 'main',
		nameKey: 'settings.agents.fridayName',
		descriptionKey: 'settings.agents.fridayDescription',
	},
] as const;

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const openAgent = (agentId: string): void => {
		navigate(`/settings/agents/agentdetails/${encodeURIComponent(agentId)}`);
	};

	const handleAgentKeyDown = (
		event: React.KeyboardEvent<HTMLDivElement>,
		agentId: string
	): void => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		openAgent(agentId);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.agents')}
				description={t('settings.agents.description')}
				icon={Bot}
			/>

			<SettingsSection title={t('settings.agents.allAgents')}>
				<SettingsPanel>
					{AGENTS.map((agent) => (
						<Item
							key={agent.id}
							role="button"
							tabIndex={0}
							variant="outline"
							size="sm"
							className="cursor-pointer border-b border-border/60 last:border-b-0 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring/55"
							onClick={() => openAgent(agent.id)}
							onKeyDown={(event) => handleAgentKeyDown(event, agent.id)}
						>
							<ItemMedia variant="icon">
								<Bot className="size-3" strokeWidth={1.8} />
							</ItemMedia>
							<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
								<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
									{t(agent.nameKey)}
								</ItemTitle>
								<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
									{t(agent.descriptionKey)}
								</p>
							</ItemContent>
							<ItemActions className="ml-auto flex-none justify-end">
								<ItemIcon icon={ChevronRight} className="bg-transparent text-muted-foreground" />
							</ItemActions>
						</Item>
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AgentsPage;
