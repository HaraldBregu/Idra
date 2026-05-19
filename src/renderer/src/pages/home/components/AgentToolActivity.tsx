import type { ReactElement, ReactNode } from 'react';
import { ListChecks } from 'lucide-react';
import { Tool } from '@/components/prompt-kit/tool';
import { Steps, StepsContent, StepsItem, StepsTrigger } from '@/components/ui/steps';
import type { AgentToolPart } from '../context';

function ToolStep({ tool }: { readonly tool: AgentToolPart }): ReactElement {
	return (
		<StepsItem>
			<Tool toolPart={tool} collapsible={false} className="min-w-0 flex-1" />
		</StepsItem>
	);
}

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
	const fallbackLabel = 'Tasks';
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
					<ToolStep key={tool.toolCallId} tool={tool} />
				))}
			</StepsContent>
		</Steps>
	);
}
