import React from 'react';
import { Outlet } from 'react-router-dom';
import { PageContainer } from '@/components/app/base/page';

export function Layout(): React.JSX.Element {
	return (
		<PageContainer className="bg-muted/20">
			<main className="chat-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 lg:px-8">
				<Outlet />
			</main>
		</PageContainer>
	);
}
