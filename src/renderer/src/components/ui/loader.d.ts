type LoaderVariant = 'circular' | 'classic' | 'pulse' | 'pulse-dot' | 'dots' | 'typing' | 'wave' | 'bars' | 'terminal' | 'text-blink' | 'text-shimmer' | 'loading-dots';
type LoaderSize = 'sm' | 'md' | 'lg';
export type LoaderProps = {
    variant?: LoaderVariant;
    size?: LoaderSize;
    text?: string;
    className?: string;
};
declare function CircularLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function ClassicLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function PulseLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function PulseDotLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function DotsLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function TypingLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function WaveLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function BarsLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function TerminalLoader({ size, className }: {
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function TextBlinkLoader({ text, size, className, }: {
    text?: string;
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function TextShimmerLoader({ text, size, className, }: {
    text?: string;
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function TextDotsLoader({ text, size, className, }: {
    text?: string;
    size?: LoaderSize;
    className?: string;
}): import("react/jsx-runtime").JSX.Element;
declare function Loader({ variant, size, text, className }: LoaderProps): import("react/jsx-runtime").JSX.Element;
export { Loader, CircularLoader, ClassicLoader, PulseLoader, PulseDotLoader, DotsLoader, TypingLoader, WaveLoader, BarsLoader, TerminalLoader, TextBlinkLoader, TextShimmerLoader, TextDotsLoader, };
