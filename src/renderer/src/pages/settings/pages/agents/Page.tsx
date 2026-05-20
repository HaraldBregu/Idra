import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const FRIDAY_AGENT_SLUG = 'friday';

const AgentsPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	const openFridayDetails = useCallback(() => {
		navigate(`/settings/agents/${FRIDAY_AGENT_SLUG}/details`);
	}, [navigate]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.agents')}
				description={t('settings.agents.description')}
			/>

			<SettingsSection title={t('settings.agents.allAgents')}>
				<SettingsPanel>
					<Item
						as="button"
						type="button"
						variant="outline"
						size="md"
						className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
						onClick={openFridayDetails}
					>
						<ItemMedia variant="icon">
							<Bot className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
								<span className="flex min-w-0 flex-wrap items-center gap-1.5">
									<span className="truncate">{t('settings.agents.fridayName')}</span>
									<Badge
										variant="outline"
										className="h-4 rounded-md bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground"
									>
										{t('settings.agents.defaultAgent')}
									</Badge>
								</span>
							</ItemTitle>
							<p className="mt-0.5 w-full text-[11px] leading-4 text-muted-foreground">
								{t('settings.agents.fridayDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<ChevronRight className="size-3 text-muted-foreground" strokeWidth={1.8} />
						</ItemActions>
					</Item>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default AgentsPage;
