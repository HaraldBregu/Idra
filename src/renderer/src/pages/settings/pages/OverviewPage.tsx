import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
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
		<button
			type="button"
			onClick={() => navigate(item.path)}
			className={cn(
				'group grid min-h-[104px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-5 rounded-[28px] border border-border/80 bg-card/95 px-6 py-5 text-left text-card-foreground shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 active:translate-y-0 sm:px-7'
			)}
		>
			<span className="flex size-14 shrink-0 items-center justify-center rounded-[22px] bg-muted/60 text-muted-foreground transition group-hover:bg-foreground group-hover:text-background">
				<Icon className="size-7" strokeWidth={1.8} />
			</span>
			<span className="min-w-0">
				<span className="block truncate text-xl font-semibold leading-7 tracking-normal text-foreground">
					{t(item.labelKey)}
				</span>
				<span className="mt-1 block text-base leading-6 text-muted-foreground">
					{t(item.descriptionKey)}
				</span>
			</span>
			<ChevronRight
				className="size-6 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
				strokeWidth={1.8}
			/>
		</button>
	);
}

const OverviewPage: React.FC = () => {
	const { t } = useTranslation();
	const shortcut = getCommandShortcutLabel();

	return (
		<SettingsPageShell className="gap-4">
			<button
				type="button"
				onClick={openCommandMenu}
				className="group grid min-h-[148px] w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-6 rounded-[32px] border border-border/80 bg-card/95 px-8 py-7 text-left text-card-foreground shadow-[0_14px_34px_rgba(15,23,42,0.1)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 active:translate-y-0"
				aria-label={t('settings.overview.searchCardLabel', { shortcut })}
			>
				<span className="flex size-20 shrink-0 items-center justify-center rounded-[28px] bg-foreground text-background">
					<Sparkles className="size-10" strokeWidth={1.8} />
				</span>
				<span className="min-w-0">
					<span className="block text-2xl font-semibold leading-8 tracking-normal text-foreground">
						{t('settings.overview.searchTitle')}
					</span>
					<span className="mt-1 block max-w-2xl text-lg leading-7 text-muted-foreground">
						{t('settings.overview.searchDescription')}
					</span>
				</span>
			</button>

			<div className="grid gap-4">
				{SETTINGS_NAVIGATION.map((item) => (
					<SettingsOverviewCard key={item.path} item={item} />
				))}
			</div>
		</SettingsPageShell>
	);
};

export default OverviewPage;
