import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	AGENT_TOOL_GROUP_METADATA,
	AGENT_TOOL_GROUPS,
	type AgentToolGroupName,
} from '../../../../../../shared/tools';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';

const ToolsPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.tools')}
				description={t('settings.overview.descriptions.tools')}
			/>

			{Object.entries(AGENT_TOOL_GROUPS).map(([groupName, tools]) => {
				const metadata = AGENT_TOOL_GROUP_METADATA[groupName as AgentToolGroupName];

				return (
					<SettingsSection
						key={groupName}
						title={metadata.title}
						description={metadata.description}
					>
						<SettingsPanel>
							{tools.map((tool) => (
								<Item
									key={tool.name}
									variant="outline"
									size="md"
									className="border-b border-border/60 last:border-b-0"
								>
									<ItemContent className="min-w-0 flex-1 flex-col items-start gap-1">
										<div className="flex w-full min-w-0 items-center gap-2">
											<ItemTitle className="min-w-0 truncate">
												{tool.title}
											</ItemTitle>
											<Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
												{tool.name}
											</Badge>
										</div>
										<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground/60">
											{tool.description}
										</p>
									</ItemContent>
								</Item>
							))}
						</SettingsPanel>
					</SettingsSection>
				);
			})}
		</SettingsPageShell>
	);
};

export default ToolsPage;
