import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Item, ItemContent, ItemTitle } from '@/components/ui/item';
import {
	AGENT_TOOLS,
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

			<SettingsSection hideTitle title={t('settings.tabs.tools')} description={t('settings.overview.descriptions.tools')}>
				<SettingsPanel>
					{AGENT_TOOLS.map((tool) => (
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
									{'availability' in tool && tool.availability !== 'default' ? (
										<Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
											{tool.availability}
										</Badge>
									) : null}
								</div>
								<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground/60">
									{tool.description}
								</p>
								<div className="flex flex-wrap gap-1">
									{('permissions' in tool ? tool.permissions : []).map((permission) => (
										<Badge
											key={permission}
											variant="outline"
											className="h-5 rounded-md px-1.5 text-[10px]"
										>
											{permission}
										</Badge>
									))}
									{'approval' in tool && tool.approval.mode !== 'none' ? (
										<Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
											approval: {tool.approval.mode}
										</Badge>
									) : null}
								</div>
							</ItemContent>
						</Item>
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ToolsPage;
