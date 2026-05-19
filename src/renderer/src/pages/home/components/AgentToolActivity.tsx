import type { ReactElement, ReactNode } from 'react';
import { ListChecks } from 'lucide-react';
import { Tool } from '@/components/prompt-kit/tool';
import { Steps, StepsContent, StepsItem, StepsTrigger } from '@/components/ui/steps';
import { cn } from '@/lib/utils';
import type { AgentToolPart } from '../context';

export function AgentToolActivity({
	tools,
	label,
	indicator,
	className,
	triggerClassName,
	defaultOpen = false,
}: {
	readonly tools: readonly AgentToolPart[];
	readonly label?: ReactNode;
	readonly indicator?: ReactNode;
	readonly className?: string;
	readonly triggerClassName?: string;
	readonly defaultOpen?: boolean;
}): ReactElement | null {
	if (tools.length === 0) return null;
	const fallbackLabel = tools.length === 1 ? tools[0]?.type ?? 'Tool used' : 'Tools used';
	const triggerIcon =
		indicator === undefined ? <ListChecks className="size-3.5 shrink-0" /> : indicator;

	return (
		<Steps defaultOpen={defaultOpen} className={className}>
			<StepsTrigger
				className={triggerClassName}
				leftIcon={triggerIcon}
				swapIconOnHover={false}
			>
				<span className="truncate">{label ?? fallbackLabel}</span>
			</StepsTrigger>
			<StepsContent>
				{tools.map((tool) => (
					<StepsItem key={tool.toolCallId}>
						<span
							className={cn(
								'mt-3 size-2 shrink-0 rounded-full',
								tool.state === 'output-error'
									? 'bg-destructive'
									: tool.state === 'output-available'
										? 'bg-success'
										: 'bg-info'
							)}
							aria-hidden
						/>
						<Tool toolPart={tool} defaultOpen className="min-w-0 flex-1" />
					</StepsItem>
				))}
			</StepsContent>
		</Steps>
	);
}
