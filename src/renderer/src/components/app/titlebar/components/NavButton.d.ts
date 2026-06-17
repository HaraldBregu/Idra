import { type ReactNode } from 'react';
interface NavButtonProps {
    onClick: () => void;
    title: string;
    disabled?: boolean;
    ghost?: boolean;
    className?: string;
    children: ReactNode;
}
export declare function NavButton({ onClick, title, disabled, ghost, className, children }: NavButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
