import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
function Item({ as = 'div', children, variant = 'outline', size = 'sm', className, ...props }) {
    const Component = as;
    return (_jsx(Component, { ...props, "data-slot": "item", "data-variant": variant, "data-size": size, className: cn('group/item flex w-full flex-wrap items-center transition-colors duration-100 outline-none', 'focus-visible:ring-[3px] focus-visible:ring-ring/50', size === 'sm' && 'gap-2 px-3 py-2', size === 'md' && 'gap-3 px-4 py-3', className), children: children }));
}
function ItemMedia({ children, variant = 'icon', className }) {
    return (_jsx("div", { "data-slot": "item-media", "data-variant": variant, className: cn('flex shrink-0 items-center justify-center [&_svg]:pointer-events-none', variant === 'icon' && 'size-6 rounded-md bg-muted/60 text-muted-foreground', className), children: children }));
}
function ItemContent({ children, className }) {
    return (_jsx("div", { "data-slot": "item-content", className: cn('flex flex-1 flex-row items-center gap-3', className), children: children }));
}
function ItemTitle({ children, className }) {
    return (_jsx("div", { "data-slot": "item-title", className: cn('line-clamp-1 flex w-fit shrink-0 items-center text-[13px] font-medium text-foreground', className), children: children }));
}
function ItemActions({ children, className }) {
    return (_jsx("div", { "data-slot": "item-actions", className: cn('flex flex-1 items-center', className), children: children }));
}
function ItemIcon({ icon: Icon, className }) {
    return (_jsx(ItemMedia, { variant: "icon", className: className, children: _jsx(Icon, { className: "size-3", strokeWidth: 1.8 }) }));
}
export { Item, ItemMedia, ItemContent, ItemTitle, ItemActions, ItemIcon };
