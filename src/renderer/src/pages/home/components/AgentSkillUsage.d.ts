import type { ReactElement } from 'react';
import type { AgentSkillUsage as AgentSkillUsageItem } from '../context';
export declare function AgentSkillUsage({ skills, className, }: {
    readonly skills: readonly AgentSkillUsageItem[];
    readonly className?: string;
}): ReactElement | null;
