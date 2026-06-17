'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
function TextShimmer({ children, as, className, duration = 4, spread = 20, style, ...props }) {
    const Component = as ?? 'span';
    const spreadPercent = Math.min(45, Math.max(5, spread));
    return (_jsx(Component, { className: cn('inline-block bg-clip-text text-transparent', className), style: {
            '--text-shimmer-duration': `${duration}s`,
            backgroundImage: `linear-gradient(110deg, color-mix(in oklch, var(--foreground) 40%, transparent) 0%, var(--foreground) ${spreadPercent}%, color-mix(in oklch, var(--foreground) 40%, transparent) ${spreadPercent * 2}%)`,
            backgroundSize: '250% 100%',
            animation: 'text-shimmer var(--text-shimmer-duration) linear infinite',
            ...style,
        }, ...props, children: children }));
}
export { TextShimmer };
