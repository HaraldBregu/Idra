import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsPageShell } from '../components';
import {
	SETTINGS_NAVIGATION,
	getCommandShortcutLabel,
	openCommandMenu,
	type SettingsNavigationItem,
} from '../navigation';

function SettingsOverviewCard({
	item,
}: {
	readonly item: SettingsNavigationItem;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const Icon = item.icon;

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			onClick={() => navigate(item.path)}
			className="group grid h-auto min-h-12 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border-border/70 bg-card px-3 py-2 text-left text-card-foreground whitespace-normal shadow-none hover:border-foreground/15 hover:bg-card/95 focus-visible:ring-2 focus-visible:ring-ring/55 active:translate-y-0"
		>
			<span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground transition group-hover:bg-foreground group-hover:text-background">
				<Icon className="size-3" strokeWidth={1.8} />
			</span>
			<span className="min-w-0">
				<span className="block truncate text-[13px] font-medium leading-4 tracking-normal text-foreground">
					{t(item.labelKey)}
				</span>
				<span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
					{t(item.descriptionKey)}
				</span>
			</span>
			<ChevronRight
				className="size-3 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
				strokeWidth={1.8}
			/>
		</Button>
	);
}

const OverviewPage: React.FC = () => {
	const { t } = useTranslation();
	const shortcut = getCommandShortcutLabel();

	return (
		<SettingsPageShell className="gap-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={openCommandMenu}
				className="group grid h-auto min-h-14 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg border-border/70 bg-card px-3 py-2 text-left text-card-foreground whitespace-normal shadow-none hover:bg-card/95 focus-visible:ring-2 focus-visible:ring-ring/55 active:translate-y-0"
				aria-label={t('settings.overview.searchCardLabel', { shortcut })}
			>
				<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
					<Sparkles className="size-3.5" strokeWidth={1.8} />
				</span>
				<span className="min-w-0">
					<span className="block text-sm font-medium leading-5 tracking-normal text-foreground">
						{t('settings.overview.searchTitle')}
					</span>
					<span className="mt-0.5 block max-w-2xl text-[11px] leading-4 text-muted-foreground">
						{t('settings.overview.searchDescription')}
					</span>
				</span>
			</Button>

			<div className="grid gap-2">
				{SETTINGS_NAVIGATION.map((item) => (
					<SettingsOverviewCard key={item.path} item={item} />
				))}
			</div>
		</SettingsPageShell>
	);
};

export default OverviewPage;
