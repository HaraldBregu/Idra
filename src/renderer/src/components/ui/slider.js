import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';
function Slider({ className, ...props }) {
    return (_jsxs(SliderPrimitive.Root, { "data-slot": "slider", className: cn('relative flex touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col w-full', className), ...props, children: [_jsx(SliderPrimitive.Track, { "data-slot": "slider-track", className: "relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1", children: _jsx(SliderPrimitive.Range, { "data-slot": "slider-range", className: "absolute bg-foreground/30 data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full" }) }), _jsx(SliderPrimitive.Thumb, { "data-slot": "slider-thumb", className: "block size-3 shrink-0 rounded-full border border-border bg-background shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" })] }));
}
export { Slider };
