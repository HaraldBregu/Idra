import * as React from 'react';
export type FeedbackBarProps = {
    className?: string;
    title?: string;
    icon?: React.ReactNode;
    onHelpful?: () => void;
    onNotHelpful?: () => void;
    onClose?: () => void;
};
declare function FeedbackBar({ className, title, icon, onHelpful, onNotHelpful, onClose, }: FeedbackBarProps): import("react/jsx-runtime").JSX.Element;
export { FeedbackBar };
