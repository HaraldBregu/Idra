'use client';

import * as React from 'react';
import { ThumbsDown, ThumbsUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FeedbackBarProps = {
	className?: string;
	title?: string;
	icon?: React.ReactNode;
	onHelpful?: () => void;
	onNotHelpful?: () => void;
	onClose?: () => void;
};

function FeedbackBar({
	className,
	title = 'Was this response helpful?',
	icon,
	onHelpful,
	onNotHelpful,
	onClose,
}: FeedbackBarProps) {
	return (
		<div
			className={cn(
				'flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm',
				className
			)}
		>
			<div className="flex items-center gap-2 text-foreground">
				{icon}
				<span>{title}</span>
			</div>
			<div className="flex items-center gap-1">
				<Button variant="ghost" size="icon-sm" onClick={onHelpful} aria-label="Helpful">
					<ThumbsUp className="size-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onNotHelpful}
					aria-label="Not helpful"
				>
					<ThumbsDown className="size-3.5" />
				</Button>
				{onClose && (
					<Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Dismiss">
						<X className="size-3.5" />
					</Button>
				)}
			</div>
		</div>
	);
}

export { FeedbackBar };
