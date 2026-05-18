import React from 'react';
import { Bot, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
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
						<Item key={agent.id} variant="outline" size="sm" className="border-b border-border/60 last:border-b-0">
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
							<ItemActions className="ml-auto flex-none flex-wrap justify-end gap-1.5">
								<Badge variant="secondary" className="h-5 rounded-md px-2 text-[11px]">
									<CheckCircle2 className="size-3" />
									{t('settings.agents.defaultAgent')}
								</Badge>
								<Badge
									variant="outline"
									className="h-5 rounded-md bg-muted/40 px-2 font-mono text-[10px] text-muted-foreground"
								>
									{agent.id}
								</Badge>
							</ItemActions>
						</Item>
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AgentsPage;
