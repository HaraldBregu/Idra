"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cn } from "@/lib/utils";
function toPrimitiveValue(value) {
    if (value === undefined)
        return undefined;
    if (Array.isArray(value))
        return value;
    return value ? [value] : [];
}
function ToggleGroup({ className, type = "single", value, defaultValue, onValueChange, ...props }) {
    const multiple = type === "multiple";
    const handleValueChange = (nextValue) => {
        if (multiple) {
            const handleMultipleValueChange = onValueChange;
            handleMultipleValueChange?.(nextValue);
            return;
        }
        const handleSingleValueChange = onValueChange;
        handleSingleValueChange?.(nextValue[0] ?? "");
    };
    return (_jsx(ToggleGroupPrimitive, { multiple: multiple, value: toPrimitiveValue(value), defaultValue: toPrimitiveValue(defaultValue), onValueChange: handleValueChange, className: cn("flex w-fit items-center gap-1", className), ...props }));
}
function ToggleGroupItem({ className, ...props }) {
    return (_jsx(TogglePrimitive, { className: cn("inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none select-none hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className), ...props }));
}
export { ToggleGroup, ToggleGroupItem };
