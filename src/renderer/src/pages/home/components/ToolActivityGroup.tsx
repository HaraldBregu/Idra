import { useState, type ReactElement } from 'react';
import { ChevronDown, Image, Plug, Sparkles } from 'lucide-react';
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
import {
	isToolRunning,
	toolActivitySummary,
	toolGroupLabel,
	toolPartLabel,
	toolVerbs,
} from './tool-label';

type ToolTypeGroup = {
	readonly type: string;
	readonly tools: AgentToolPart[];
};

function groupToolsByType(tools: readonly AgentToolPart[]): ToolTypeGroup[] {
	const groups: ToolTypeGroup[] = [];
	for (const tool of tools) {
		const last = groups[groups.length - 1];
		if (last && toolVerbs(last.type).done === toolVerbs(tool.type).done) {
			last.tools.push(tool);
		} else {
			groups.push({ type: tool.type, tools: [tool] });
		}
	}
	return groups;
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
	const [isOpen, setIsOpen] = useState(false);
	const isExploring = tools.some(isToolRunning);
	const { verb, detail } = toolActivitySummary(tools);
	const groups = groupToolsByType(tools);
	const showImageIcon = verb === 'Creating image' || verb === 'Created image';
	const showSkillIcon = verb === 'Skill';
	const showMcpIcon = verb === 'Calling' || verb === 'Called';

	return (
		<div className={cn('w-full max-w-2xl', className)}>
			<Collapsible open={isOpen} onOpenChange={setIsOpen}>
				<CollapsibleTrigger
					render={
						<Button
							type="button"
							variant="ghost"
							className="p-0! h-auto w-full justify-start rounded-md bg-transparent! py-1 font-normal text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground"
						>
							<div className="flex min-w-0 items-center gap-1.5">
								{showImageIcon && <Image className="size-3.5 shrink-0" />}
								{showSkillIcon && <Sparkles className="size-3.5 shrink-0" />}
								{showMcpIcon && <Plug className="size-3.5 shrink-0" />}
								<span className="flex min-w-0 items-baseline gap-1 truncate text-xs font-medium">
									{isExploring ? (
										<TextShimmer>{verb}</TextShimmer>
									) : (
										<span>{verb}</span>
									)}
									<span className="text-muted-foreground/50">{detail}</span>
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
					<div className="flex flex-col gap-1">
						{groups.length === 1
							? groups[0].tools.map((tool, index) => (
									<Tool
										key={tool.toolCallId}
										toolPart={tool}
										label={toolPartLabel(tool)}
										className="mt-0"
										style={staggerStyle(index)}
									/>
								))
							: groups.map((group, index) =>
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
				</CollapsibleContent>
			</Collapsible>
		</div>
	);
}
