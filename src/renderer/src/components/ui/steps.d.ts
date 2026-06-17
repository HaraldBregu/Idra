import * as React from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
export type StepsItemProps = React.ComponentProps<'div'>;
declare function StepsItem({ children, className, ...props }: StepsItemProps): import("react/jsx-runtime").JSX.Element;
export type StepsTriggerProps = React.ComponentProps<typeof CollapsibleTrigger> & {
    leftIcon?: React.ReactNode;
    swapIconOnHover?: boolean;
};
declare function StepsTrigger({ children, className, leftIcon, swapIconOnHover, ...props }: StepsTriggerProps): import("react/jsx-runtime").JSX.Element;
export type StepsContentProps = React.ComponentProps<typeof CollapsibleContent> & {
    bar?: React.ReactNode;
};
declare function StepsContent({ children, className, bar, ...props }: StepsContentProps): import("react/jsx-runtime").JSX.Element;
export type StepsBarProps = React.HTMLAttributes<HTMLSpanElement>;
declare function StepsBar({ className, ...props }: StepsBarProps): import("react/jsx-runtime").JSX.Element;
export type StepsProps = React.ComponentProps<typeof Collapsible> & {
    defaultOpen?: boolean;
};
declare function Steps({ defaultOpen, className, ...props }: StepsProps): import("react/jsx-runtime").JSX.Element;
export { Steps, StepsBar, StepsContent, StepsItem, StepsTrigger };
