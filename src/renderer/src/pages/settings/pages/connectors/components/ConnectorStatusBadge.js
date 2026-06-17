import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from '@/components/ui/badge';
export function ConnectorStatusBadge({ status, }) {
    const variant = status === 'configured' ? 'default' : status === 'error' ? 'destructive' : 'outline';
    const label = status === 'configured'
        ? 'Connected'
        : status === 'disabled'
            ? 'Disabled'
            : 'Error';
    return (_jsx(Badge, { variant: variant, className: "h-4 px-1.5 text-[10px]", children: label }));
}
