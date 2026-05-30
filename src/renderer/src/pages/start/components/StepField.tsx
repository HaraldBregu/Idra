import React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type StepFieldProps = {
	readonly id: string;
	readonly label: string;
	readonly children: React.ReactNode;
	readonly className?: string;
};

export function StepField({ id, label, children, className }: StepFieldProps): React.JSX.Element {
	return (
		<div className={cn('grid gap-1.5', className)}>
			<div className="grid gap-1">
				<Label htmlFor={id} className="text-[11px] leading-4">
					{label}
				</Label>
			</div>
			{children}
		</div>
	);
}
