import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '@/lib/utils';
function Field({ children, orientation = 'vertical', className }) {
    return (_jsx("div", { "data-slot": "field", "data-orientation": orientation, className: cn(orientation === 'horizontal'
            ? 'flex flex-row items-center gap-2'
            : 'flex flex-col gap-1.5', className), children: children }));
}
export { Field };
