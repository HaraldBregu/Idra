import * as React from 'react';
export type TextShimmerProps = React.HTMLAttributes<HTMLElement> & {
    as?: React.ElementType;
    duration?: number;
    spread?: number;
};
declare function TextShimmer({ children, as, className, duration, spread, style, ...props }: TextShimmerProps): import("react/jsx-runtime").JSX.Element;
export { TextShimmer };
