import React, { type HTMLAttributes, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
interface ItemProps extends HTMLAttributes<HTMLElement> {
    readonly children: ReactNode;
    readonly variant?: 'outline' | 'ghost';
    readonly size?: 'sm' | 'md';
    readonly as?: 'div' | 'button';
    readonly type?: 'button' | 'submit' | 'reset';
    readonly disabled?: boolean;
}
declare function Item({ as, children, variant, size, className, ...props }: ItemProps): React.JSX.Element;
interface ItemMediaProps {
    readonly children: ReactNode;
    readonly variant?: 'icon';
    readonly className?: string;
}
declare function ItemMedia({ children, variant, className }: ItemMediaProps): React.JSX.Element;
interface ItemContentProps {
    readonly children: ReactNode;
    readonly className?: string;
}
declare function ItemContent({ children, className }: ItemContentProps): React.JSX.Element;
interface ItemTitleProps {
    readonly children: ReactNode;
    readonly className?: string;
}
declare function ItemTitle({ children, className }: ItemTitleProps): React.JSX.Element;
interface ItemActionsProps {
    readonly children: ReactNode;
    readonly className?: string;
}
declare function ItemActions({ children, className }: ItemActionsProps): React.JSX.Element;
interface ItemIconProps {
    readonly icon: LucideIcon;
    readonly className?: string;
}
declare function ItemIcon({ icon: Icon, className }: ItemIconProps): React.JSX.Element;
export { Item, ItemMedia, ItemContent, ItemTitle, ItemActions, ItemIcon };
