import React, { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface TitleBarContainerProps {
	readonly className?: string;
	readonly children: ReactNode;
}

export const TitleBarContainer = memo(function AppTitleBarContainer({
	className,
	children,
}: TitleBarContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'app-translucent-surface relative z-20 flex h-12 shrink-0 items-center select-none border-b border-border/60',
				className
			)}
			style={
				{
					WebkitAppRegion: 'drag',
				} as React.CSSProperties
			}
		>
			{children}
		</div>
	);
});
