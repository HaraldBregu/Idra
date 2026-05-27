import type { ReactElement } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentSkillUsage as AgentSkillUsageItem } from '../context';

export function AgentSkillUsage({
	skills,
	className,
}: {
	readonly skills: readonly AgentSkillUsageItem[];
	readonly className?: string;
}): ReactElement | null {
	if (skills.length === 0) return null;
	const label = skills.length === 1 ? 'Skill used' : 'Skills used';

	return (
		<div
			className={cn(
				'flex max-w-full flex-wrap items-center gap-1.5 pl-1 text-[11px] leading-5 text-muted-foreground',
				className
			)}
			aria-label={label}
		>
			<span className="font-medium">{label}</span>
			{skills.map((skill) => (
				<span
					key={skill.version ? `${skill.id}@${skill.version}` : skill.id}
					className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0 font-mono text-[10px] text-foreground"
					title={skill.reason ? `${skill.label}: ${skill.reason}` : skill.label}
				>
					<Sparkles className="size-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
					<span className="min-w-0 truncate">{skill.label}</span>
				</span>
			))}
		</div>
	);
}
