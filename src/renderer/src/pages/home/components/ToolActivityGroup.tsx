import { useState, type ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';
import { TextShimmer } from '@/components/prompt-kit/text-shimmer';
import { Tool } from '@/components/prompt-kit/tool';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { AgentToolPart } from '../context';
import { isToolRunning, toolActivitySummary, toolPartLabel } from './tool-label';

export function ToolActivityGroup({
	tools,
	className,
}: {
	readonly tools: readonly AgentToolPart[];
	readonly className?: string;
}): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const isExploring = tools.some(isToolRunning);
	const summary = toolActivitySummary(tools);

	return (
		<div className={cn('w-full max-w-2xl', className)}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							className="p-0! h-auto w-full justify-start rounded-md bg-transparent! py-1 font-normal text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
						>
							<div className="flex min-w-0 items-center gap-1.5">
								{isExploring ? (
									<TextShimmer className="truncate text-sm font-medium">
										{summary}
									</TextShimmer>
								) : (
									<span className="truncate text-sm font-medium">{summary}</span>
								)}
								<ChevronDown className={cn('size-3.5 shrink-0', isOpen && 'rotate-180')} />
							</div>
						</Button>
					}
				/>
				<CollapsibleContent
					className={cn(
						'overflow-hidden',
						'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'
					)}
				>
					<div className="flex flex-col gap-1 py-1">
						{tools.map((tool) => (
							<Tool
								key={tool.toolCallId}
								toolPart={tool}
								label={toolPartLabel(tool)}
								className="mt-0"
							/>
						))}
					</div>
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
