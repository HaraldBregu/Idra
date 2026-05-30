import React from 'react';
import { cn } from '@/lib/utils';
import { SETUP_STEPS, SETUP_STEP_TITLES } from '../constants';

type StepProgressProps = {
	readonly currentIndex: number;
};

export function StepProgress({ currentIndex }: StepProgressProps): React.JSX.Element {
	const currentStep = SETUP_STEPS[currentIndex];
	const currentStepName = currentStep ? SETUP_STEP_TITLES[currentStep] : 'Setup';

	return (
		<div
			className="grid gap-1.5"
			aria-label={`Step ${currentIndex + 1} of ${SETUP_STEPS.length}`}
		>
			<div className="flex items-center gap-1.5">
				{SETUP_STEPS.map((setupStep, index) => (
					<span
						key={setupStep}
						className={cn(
							'h-1.5 rounded-full transition-all',
							index === currentIndex ? 'w-6 bg-primary' : 'w-1.5',
							index < currentIndex ? 'bg-primary' : 'bg-muted',
							index > currentIndex ? 'bg-muted' : undefined
						)}
					/>
				))}
			</div>
			<p className="truncate text-[11px] text-muted-foreground">{currentStepName}</p>
		</div>
	);
}
