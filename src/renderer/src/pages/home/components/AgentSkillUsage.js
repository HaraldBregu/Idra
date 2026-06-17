import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
export function AgentSkillUsage({ skills, className, }) {
    if (skills.length === 0)
        return null;
    const label = skills.length === 1 ? 'Skill used' : 'Skills used';
    return (_jsxs("div", { className: cn('flex max-w-full flex-wrap items-center gap-1.5 pl-1 text-[11px] leading-5 text-muted-foreground', className), "aria-label": label, children: [_jsx("span", { className: "font-medium", children: label }), skills.map((skill) => (_jsxs("span", { className: "inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 py-0 font-mono text-[10px] text-foreground", title: skill.label, children: [_jsx(Sparkles, { className: "size-3 shrink-0 text-muted-foreground", strokeWidth: 1.8 }), _jsx("span", { className: "min-w-0 truncate", children: skill.label })] }, skill.version ? `${skill.id}@${skill.version}` : skill.id)))] }));
}
