import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer, PageHeader, PageHeaderTitle, PageBody } from './page';

export const PageLoadingSkeleton = React.memo(function PageLoadingSkeleton() {
	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>
					<Skeleton className="h-6 w-48" />
				</PageHeaderTitle>
			</PageHeader>
			<PageBody className="p-6">
				<div className="flex flex-col gap-4 max-w-3xl">
					<Skeleton className="h-8 w-1/2" />
					<Skeleton className="h-4 w-2/3" />
					<div className="space-y-2 pt-4">
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-11/12" />
						<Skeleton className="h-3 w-10/12" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-9/12" />
					</div>
				</div>
			</PageBody>
		</PageContainer>
	);
});
PageLoadingSkeleton.displayName = 'PageLoadingSkeleton';

export const HomePageLoadingSkeleton = React.memo(function HomePageLoadingSkeleton() {
	return (
		<PageContainer className="overflow-hidden text-foreground">
			<div className="relative flex min-h-0 flex-1 flex-col bg-background">
				<div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center px-4 pb-32">
					<div className="w-full max-w-sm">
						<Skeleton className="mx-auto h-5 w-44 max-w-full" />
						<Skeleton className="mx-auto mt-3 h-3 w-64 max-w-full" />
					</div>
				</div>

				<div className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 py-3">
					<div className="w-full max-w-[96rem] rounded-2xl border border-border/70 bg-card/95 p-3 shadow-sm shadow-foreground/5">
						<Skeleton className="h-4 w-32 max-w-full" />
						<div className="mt-4 flex items-center gap-2">
							<Skeleton className="size-8 rounded-full" />
							<Skeleton className="h-9 flex-1 rounded-full" />
							<Skeleton className="size-9 rounded-full" />
						</div>
					</div>
				</div>
			</div>
		</PageContainer>
	);
});
HomePageLoadingSkeleton.displayName = 'HomePageLoadingSkeleton';
