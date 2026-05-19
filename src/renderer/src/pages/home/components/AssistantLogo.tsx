import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';

export function AssistantLogo({
	className,
}: {
	readonly className?: string;
}): ReactElement {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-200/30 bg-[radial-gradient(circle_at_35%_28%,#f8dc92_0%,#d2a243_45%,#80601f_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_18px_rgba(0,0,0,0.2)] dark:border-amber-200/20 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_18px_rgba(0,0,0,0.4)]',
				className
			)}
		>
			<span className="absolute inset-[2px] rounded-full bg-[radial-gradient(circle_at_32%_22%,rgba(255,247,192,0.82),rgba(237,191,88,0.32)_42%,rgba(112,82,29,0)_72%)]" />
		</span>
	);
}
