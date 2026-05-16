'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextShimmerProps = React.HTMLAttributes<HTMLElement> & {
	as?: React.ElementType;
	duration?: number;
	spread?: number;
};

function TextShimmer({
	children,
	as,
	className,
	duration = 4,
	spread = 20,
	style,
	...props
}: TextShimmerProps) {
	const Component = as ?? 'span';
	const spreadPercent = Math.min(45, Math.max(5, spread));

	return (
		<Component
			className={cn('inline-block bg-clip-text text-transparent', className)}
			style={
				{
					'--text-shimmer-duration': `${duration}s`,
					backgroundImage: `linear-gradient(110deg, color-mix(in oklch, var(--foreground) 40%, transparent) 0%, var(--foreground) ${spreadPercent}%, color-mix(in oklch, var(--foreground) 40%, transparent) ${spreadPercent * 2}%)`,
					backgroundSize: '250% 100%',
					animation: 'text-shimmer var(--text-shimmer-duration) linear infinite',
					...style,
				} as React.CSSProperties
			}
			{...props}
		>
			{children}
		</Component>
	);
}

export { TextShimmer };
