'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from 'react';
import { cn } from '@/lib/utils';
const sizeMap = {
    sm: 'size-3',
    md: 'size-4',
    lg: 'size-5',
};
const textSizeMap = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
};
function CircularLoader({ size = 'md', className }) {
    return (_jsx("div", { className: cn('animate-spin rounded-full border-2 border-current border-t-transparent', sizeMap[size], className) }));
}
function ClassicLoader({ size = 'md', className }) {
    const bars = Array.from({ length: 12 });
    return (_jsx("div", { className: cn('relative', sizeMap[size], className), children: bars.map((_, i) => (_jsx("span", { className: "absolute left-1/2 top-0 h-1/4 w-[8%] -translate-x-1/2 rounded-full bg-current", style: {
                transform: `translate(-50%, 0) rotate(${i * 30}deg) translateY(0)`,
                transformOrigin: '50% 200%',
                opacity: 1 - (i / bars.length) * 0.9,
                animation: 'spin 1s linear infinite',
                animationDelay: `${-i * (1 / bars.length)}s`,
            } }, i))) }));
}
function PulseLoader({ size = 'md', className }) {
    return (_jsx("div", { className: cn('animate-pulse rounded-full bg-current opacity-75', sizeMap[size], className) }));
}
function PulseDotLoader({ size = 'md', className }) {
    return (_jsxs("div", { className: cn('relative inline-flex', sizeMap[size], className), children: [_jsx("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" }), _jsx("span", { className: "relative inline-flex h-full w-full rounded-full bg-current" })] }));
}
function DotsLoader({ size = 'md', className }) {
    const dot = cn('rounded-full bg-current animate-bounce', sizeMap[size]);
    return (_jsxs("div", { className: cn('inline-flex items-center gap-1', className), children: [_jsx("span", { className: dot, style: { animationDelay: '0ms' } }), _jsx("span", { className: dot, style: { animationDelay: '150ms' } }), _jsx("span", { className: dot, style: { animationDelay: '300ms' } })] }));
}
function TypingLoader({ size = 'md', className }) {
    const dotSize = size === 'sm' ? 'size-1' : size === 'lg' ? 'size-2.5' : 'size-1.5';
    const dot = cn('rounded-full bg-current animate-bounce', dotSize);
    return (_jsxs("div", { className: cn('inline-flex items-center gap-1', className), children: [_jsx("span", { className: dot, style: { animationDelay: '0ms' } }), _jsx("span", { className: dot, style: { animationDelay: '200ms' } }), _jsx("span", { className: dot, style: { animationDelay: '400ms' } })] }));
}
function WaveLoader({ size = 'md', className }) {
    const barH = size === 'sm' ? 'h-3' : size === 'lg' ? 'h-5' : 'h-4';
    return (_jsx("div", { className: cn('inline-flex items-end gap-0.5', className), children: [0, 1, 2, 3, 4].map((i) => (_jsx("span", { className: cn('w-0.5 bg-current animate-pulse', barH), style: { animationDelay: `${i * 100}ms` } }, i))) }));
}
function BarsLoader({ size = 'md', className }) {
    return _jsx(WaveLoader, { size: size, className: className });
}
function TerminalLoader({ size = 'md', className }) {
    return (_jsx("span", { className: cn('inline-block animate-pulse font-mono', textSizeMap[size], className), children: "\u258B" }));
}
function TextBlinkLoader({ text = 'Thinking', size = 'md', className, }) {
    return (_jsx("span", { className: cn('inline-block animate-pulse', textSizeMap[size], className), children: text }));
}
function TextShimmerLoader({ text = 'Thinking', size = 'md', className, }) {
    return (_jsx("span", { className: cn('inline-block bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent', textSizeMap[size], className), style: { animation: 'shimmer 2s linear infinite' }, children: text }));
}
function TextDotsLoader({ text = 'Thinking', size = 'md', className, }) {
    const [dots, setDots] = React.useState('');
    React.useEffect(() => {
        const id = setInterval(() => {
            setDots((d) => (d.length >= 3 ? '' : d + '.'));
        }, 400);
        return () => clearInterval(id);
    }, []);
    return (_jsxs("span", { className: cn('inline-block', textSizeMap[size], className), children: [text, dots] }));
}
function Loader({ variant = 'circular', size = 'md', text, className }) {
    switch (variant) {
        case 'circular':
            return _jsx(CircularLoader, { size: size, className: className });
        case 'classic':
            return _jsx(ClassicLoader, { size: size, className: className });
        case 'pulse':
            return _jsx(PulseLoader, { size: size, className: className });
        case 'pulse-dot':
            return _jsx(PulseDotLoader, { size: size, className: className });
        case 'dots':
            return _jsx(DotsLoader, { size: size, className: className });
        case 'typing':
            return _jsx(TypingLoader, { size: size, className: className });
        case 'wave':
            return _jsx(WaveLoader, { size: size, className: className });
        case 'bars':
            return _jsx(BarsLoader, { size: size, className: className });
        case 'terminal':
            return _jsx(TerminalLoader, { size: size, className: className });
        case 'text-blink':
            return _jsx(TextBlinkLoader, { text: text, size: size, className: className });
        case 'text-shimmer':
            return _jsx(TextShimmerLoader, { text: text, size: size, className: className });
        case 'loading-dots':
            return _jsx(TextDotsLoader, { text: text, size: size, className: className });
        default:
            return _jsx(CircularLoader, { size: size, className: className });
    }
}
export { Loader, CircularLoader, ClassicLoader, PulseLoader, PulseDotLoader, DotsLoader, TypingLoader, WaveLoader, BarsLoader, TerminalLoader, TextBlinkLoader, TextShimmerLoader, TextDotsLoader, };
