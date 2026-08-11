import React, { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface TitleBarContainerProps {
	readonly className?: string;
	readonly style?: React.CSSProperties;
	readonly onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
	readonly children: ReactNode;
}

export const TitleBarContainer = memo(function AppTitleBarContainer({
	className,
	style,
	onContextMenu,
	children,
}: TitleBarContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'app-translucent-surface fixed inset-x-0 top-0 z-50 flex h-12 shrink-0 items-center select-none border-b border-border/50 bg-background/70 backdrop-blur-xl',
				className
			)}
			style={
				{
					WebkitAppRegion: 'drag',
					...style,
				} as React.CSSProperties
			}
			onContextMenu={onContextMenu}
		>
			{children}
		</div>
	);
});
