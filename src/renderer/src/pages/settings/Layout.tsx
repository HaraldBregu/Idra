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
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => navigate('/settings')}
							className="h-auto min-w-0 justify-start gap-2 rounded-md px-1.5 py-1 text-left whitespace-normal"
							aria-label={t('settings.overview.backToSettings')}
						>
							<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-foreground">
								<Settings className="size-3.5" strokeWidth={1.9} />
							</span>
							<span className="truncate text-lg font-semibold leading-6 tracking-normal text-foreground">
								{t('settings.title')}
							</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							size="xs"
							onClick={openCommandMenu}
							className="h-7 shrink-0 gap-1.5 rounded-md border-border/80 bg-card/90 px-2 text-xs text-muted-foreground shadow-none hover:bg-card hover:text-foreground"
							aria-label={t('settings.overview.searchCardLabel', { shortcut })}
						>
							<Command className="size-3" strokeWidth={1.9} />
							<kbd className="font-sans text-xs font-semibold tracking-normal">{shortcut}</kbd>
						</Button>
					</div>
				</div>
				<main className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
					<Outlet />
				</main>
				<footer className="app-translucent-surface shrink-0 border-t border-border/70 bg-background/80 px-4 py-2 backdrop-blur-xl sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 text-xs text-muted-foreground">
						<span className="min-w-0 truncate">{t('settings.overview.browseNormally')}</span>
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={openCommandMenu}
							className="h-auto shrink-0 rounded-md px-1.5 py-0.5 text-right text-xs text-muted-foreground hover:text-foreground"
						>
							{t('settings.overview.searchWithShortcut', { shortcut })}
						</Button>
					</div>
				</footer>
			</div>
		</PageContainer>
	);
}
