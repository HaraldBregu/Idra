import type { ReactElement } from 'react';
import { Tool } from '@/components/prompt-kit/tool';
import { cn } from '@/lib/utils';
import type { AgentToolPart } from '../context';

export function AgentToolActivity({
	tools,
	className,
}: {
	readonly tools: readonly AgentToolPart[];
	readonly className?: string;
}): ReactElement | null {
	if (tools.length === 0) return null;

	return (
		<div className={cn('w-full', className)}>
			<div className="flex w-full flex-col gap-0">
				{tools.map((tool) => (
					<Tool key={tool.toolCallId} toolPart={tool} className="mt-0 w-full max-w-md" />
				))}
			</div>
		</div>
	);
}
