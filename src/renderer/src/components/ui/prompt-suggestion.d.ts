import * as React from 'react';
import { Button } from '@/components/ui/button';
export type PromptSuggestionProps = {
    children: React.ReactNode;
    variant?: React.ComponentProps<typeof Button>['variant'];
    size?: React.ComponentProps<typeof Button>['size'];
    className?: string;
    highlight?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
declare function PromptSuggestion({ children, variant, size, className, highlight, ...props }: PromptSuggestionProps): import("react/jsx-runtime").JSX.Element;
export { PromptSuggestion };
