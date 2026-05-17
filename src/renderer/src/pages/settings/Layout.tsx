import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageContainer } from '@/components/app/base/page';

export function Layout(): React.JSX.Element {
	return (
		<PageContainer className="bg-muted/20">
			<main className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
				<Outlet />
			</main>
			<footer className="shrink-0 border-t border-border/50 px-4 py-2 sm:px-6 lg:px-8">
				<div className="mx-auto flex max-w-4xl items-center justify-between">
					<div className="flex items-center gap-4">
						<span className="text-[10px] text-muted-foreground">{__APP_NAME__} {__APP_VERSION__}</span>
						<span className="text-[10px] text-muted-foreground/50">·</span>
						<span className="text-[10px] text-muted-foreground">{__APP_LICENSE__} license</span>
					</div>
					<div className="flex items-center gap-4">
						<span className="text-[10px] text-muted-foreground">{__APP_AUTHOR__}</span>
						<span className="text-[10px] text-muted-foreground/50">·</span>
						<span className="text-[10px] text-muted-foreground">{__APP_HOMEPAGE__}</span>
					</div>
				</div>
			</footer>
		</PageContainer>
	);
}
