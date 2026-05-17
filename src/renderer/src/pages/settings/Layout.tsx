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
					<div className="flex items-center gap-3">
						<span className="text-[10px] text-muted-foreground/60">Privacy</span>
						<span className="text-[10px] text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/60">Terms</span>
						<span className="text-[10px] text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/60">Support</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-[10px] text-muted-foreground/60">Open Source</span>
						<span className="text-[10px] text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/60">macOS</span>
					</div>
				</div>
			</footer>
		</PageContainer>
	);
}
