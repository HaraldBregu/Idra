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
import { isToolRunning, toolGroupLabel, toolPartLabel } from './tool-label';

type ToolTypeGroup = {
	readonly type: string;
	readonly tools: AgentToolPart[];
};

function groupToolsByType(tools: readonly AgentToolPart[]): ToolTypeGroup[] {
	const groups = new Map<string, AgentToolPart[]>();
	for (const tool of tools) {
		const existing = groups.get(tool.type);
		if (existing) {
			existing.push(tool);
		} else {
			groups.set(tool.type, [tool]);
		}
	}
	return [...groups.entries()].map(([type, list]) => ({ type, tools: list }));
}

function staggerStyle(index: number): { animationDelay: string } {
	return { animationDelay: `${Math.min(index * 40, 240)}ms` };
}

function ToolTypeSection({ group }: { readonly group: ToolTypeGroup }): ReactElement {
	const [isOpen, setIsOpen] = useState(false);
	const isRunning = group.tools.some(isToolRunning);
	const label = toolGroupLabel(group.type, group.tools);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						className="p-0! h-auto w-full justify-start rounded-md bg-transparent! py-1 font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
					>
						<div className="flex min-w-0 items-center gap-1.5">
							<span className="flex min-w-0 items-baseline gap-1 truncate text-xs font-medium">
								{isRunning ? <TextShimmer>{label}</TextShimmer> : <span>{label}</span>}
								<span className="text-muted-foreground/50">{group.tools.length}</span>
							</span>
							<ChevronDown
								className={cn(
									'size-3 shrink-0 transition-transform duration-200',
									isOpen && 'rotate-180'
								)}
							/>
						</div>
					</Button>
				}
			/>
			<CollapsibleContent>
				<div className="flex flex-col gap-1 pl-3">
					{group.tools.map((tool, index) => (
						<Tool
							key={tool.toolCallId}
							toolPart={tool}
							label={toolPartLabel(tool)}
							className="mt-0"
							style={staggerStyle(index)}
						/>
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function ToolActivityGroup({
	tools,
	className,
}: {
	readonly tools: readonly AgentToolPart[];
	readonly className?: string;
}): ReactElement {
	const groups = groupToolsByType(tools);

	return (
		<div className={cn('flex w-full max-w-2xl flex-col gap-1', className)}>
			{groups.map((group, index) =>
				group.tools.length > 1 ? (
					<ToolTypeSection key={group.tools[0].toolCallId} group={group} />
				) : (
					<Tool
						key={group.tools[0].toolCallId}
						toolPart={group.tools[0]}
						label={toolPartLabel(group.tools[0])}
						className="mt-0"
						style={staggerStyle(index)}
					/>
				)
			)}
		</div>
	);
}
