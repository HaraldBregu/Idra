import { memo, type ReactNode, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

interface TitleBarCenterContainerProps {
	readonly className?: string;
	readonly children: ReactNode;
}

export const TitleBarCenterContainer = memo(function AppTitleBarCenterContainer({
	className,
	children,
}: TitleBarCenterContainerProps): ReactElement {
	return (
		<div
			className={cn(
				'absolute inset-0 flex items-center justify-center pointer-events-none bg-transparent',
				className
			)}
		>
			{children}
		</div>
	);
});
