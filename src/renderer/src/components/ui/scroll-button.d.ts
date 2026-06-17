import * as React from 'react';
import { Button } from '@/components/ui/button';
export type ScrollButtonProps = {
    className?: string;
    variant?: React.ComponentProps<typeof Button>['variant'];
    size?: React.ComponentProps<typeof Button>['size'];
} & React.ButtonHTMLAttributes<HTMLButtonElement>;
declare function ScrollButton({ className, variant, size, ...props }: ScrollButtonProps): import("react/jsx-runtime").JSX.Element;
export { ScrollButton };
