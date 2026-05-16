import type { ReactElement } from 'react';
import { ListChecks } from 'lucide-react';
import { Tool } from '@/components/prompt-kit/tool';
import { Steps, StepsContent, StepsItem, StepsTrigger } from '@/components/ui/steps';
import { cn } from '@/lib/utils';
import type { AssistantToolPart } from '../context';

export function AssistantToolActivity({
	tools,
}: {
	readonly tools: readonly AssistantToolPart[];
}): ReactElement | null {
	if (tools.length === 0) return null;
	const hasRunning = tools.some(
		(tool) => tool.state === 'input-streaming' || tool.state === 'input-available'
	);
	const hasError = tools.some((tool) => tool.state === 'output-error');

	return (
		<Steps defaultOpen>
			<StepsTrigger leftIcon={<ListChecks className="size-3.5" />}>
				{hasRunning || hasError
					? 'Tool calls and responses'
					: `${tools.length} tool response${tools.length === 1 ? '' : 's'}`}
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
