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

function optionalStringField(value: unknown, key: string): string | undefined {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
	const entry = (value as Record<string, unknown>)[key];
	return typeof entry === 'string' ? entry : undefined;
}

function optionalStringListField(value: unknown, key: string): string[] {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
	const entry = (value as Record<string, unknown>)[key];
	return Array.isArray(entry) ? entry.filter((item): item is string => typeof item === 'string') : [];
}

function approvalMode(value: unknown): string {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return 'none';
	const approval = (value as Record<string, unknown>).approval;
	if (!approval || typeof approval !== 'object' || Array.isArray(approval)) return 'none';
	const mode = (approval as Record<string, unknown>).mode;
	return typeof mode === 'string' ? mode : 'none';
}

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
									{optionalStringField(tool, 'availability') && optionalStringField(tool, 'availability') !== 'default' ? (
										<Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
											{optionalStringField(tool, 'availability')}
										</Badge>
									) : null}
								</div>
								<p className="line-clamp-2 max-w-full text-[11px] leading-4 text-muted-foreground/60">
									{tool.description}
								</p>
								<div className="flex flex-wrap gap-1">
									{optionalStringListField(tool, 'permissions').map((permission) => (
										<Badge
											key={permission}
											variant="outline"
											className="h-5 rounded-md px-1.5 text-[10px]"
										>
											{permission}
										</Badge>
									))}
									{approvalMode(tool) !== 'none' ? (
										<Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
											approval: {approvalMode(tool)}
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
