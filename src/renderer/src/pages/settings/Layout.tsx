import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Command, Settings } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import { getCommandShortcutLabel, openCommandMenu } from './navigation';

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const shortcut = getCommandShortcutLabel();

	return (
		<PageContainer className="bg-muted/20">
			<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/20">
				<div className="app-translucent-surface shrink-0 border-b border-border/70 bg-background/80 px-4 py-5 backdrop-blur-xl sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
						<button
							type="button"
							onClick={() => navigate('/settings')}
							className="flex min-w-0 items-center gap-3 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
							aria-label={t('settings.overview.backToSettings')}
						>
							<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted/70 text-foreground">
								<Settings className="size-5" strokeWidth={1.9} />
							</span>
							<span className="truncate text-2xl font-semibold leading-tight tracking-normal text-foreground">
								{t('settings.title')}
							</span>
						</button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={openCommandMenu}
							className="h-10 shrink-0 gap-2 rounded-xl border-border/80 bg-card/90 px-3 text-sm text-muted-foreground shadow-[0_8px_24px_rgba(15,23,42,0.1)] hover:bg-card hover:text-foreground"
							aria-label={t('settings.overview.searchCardLabel', { shortcut })}
						>
							<Command className="size-4" strokeWidth={1.9} />
							<kbd className="font-sans text-sm font-semibold tracking-normal">{shortcut}</kbd>
						</Button>
					</div>
				</div>
				<main className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
					<Outlet />
				</main>
				<footer className="app-translucent-surface shrink-0 border-t border-border/70 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 text-sm text-muted-foreground">
						<span className="min-w-0 truncate">{t('settings.overview.browseNormally')}</span>
						<button
							type="button"
							onClick={openCommandMenu}
							className="shrink-0 rounded-lg text-right hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55"
						>
							{t('settings.overview.searchWithShortcut', { shortcut })}
						</button>
					</div>
				</footer>
			</div>
		</PageContainer>
	);
}
