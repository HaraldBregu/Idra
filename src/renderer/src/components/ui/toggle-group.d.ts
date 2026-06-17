import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import * as React from "react";
type ToggleGroupBaseProps = Omit<React.ComponentProps<typeof ToggleGroupPrimitive>, "value" | "defaultValue" | "onValueChange" | "multiple">;
type ToggleGroupProps = (ToggleGroupBaseProps & {
    type?: "single";
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
}) | (ToggleGroupBaseProps & {
    type: "multiple";
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
});
declare function ToggleGroup({ className, type, value, defaultValue, onValueChange, ...props }: ToggleGroupProps): import("react/jsx-runtime").JSX.Element;
declare function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof TogglePrimitive>): import("react/jsx-runtime").JSX.Element;
export { ToggleGroup, ToggleGroupItem };
