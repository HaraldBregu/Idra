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
