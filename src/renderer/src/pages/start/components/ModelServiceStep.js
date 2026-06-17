import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { getProviderCatalogItem } from '../constants';
import { StepField } from './StepField';
export function ModelServiceStep({ service, serviceState, loadingModels, savingConfig, onProviderChange, onModelChange, }) {
    const ServiceIcon = service.icon;
    const availableModels = serviceState.modelGroups.find((g) => g.provider.id === serviceState.providerId)?.models ?? [];
    const noModels = !loadingModels && serviceState.modelGroups.length === 0;
    const selectedProviderLabel = serviceState.providerId
        ? getProviderCatalogItem(serviceState.providerId).name
        : undefined;
    const selectedModelLabel = serviceState.modelId
        ? (availableModels.find((m) => m.id === serviceState.modelId)?.name ?? undefined)
        : undefined;
    return (_jsxs("div", { className: "mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6", children: [_jsx("div", { className: "mb-6 flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground", children: _jsx(ServiceIcon, { className: "size-5", strokeWidth: 1.6, "aria-hidden": "true" }) }), _jsx(Badge, { variant: service.required ? 'default' : 'secondary', className: "mb-3 w-fit", children: service.required ? 'Required' : 'Optional' }), _jsx("h1", { className: "text-2xl font-bold leading-tight tracking-normal text-foreground", children: service.stepTitle }), _jsx("p", { className: "mt-2 max-w-md text-xs font-medium leading-relaxed text-muted-foreground", children: service.stepDescription }), _jsxs("div", { className: "mt-8 max-w-xs space-y-4", children: [_jsx(StepField, { id: `${service.id}-provider`, label: "Provider", children: _jsxs(Select, { value: serviceState.providerId, onValueChange: (value) => onProviderChange(service.id, value), disabled: loadingModels || serviceState.modelGroups.length === 0 || savingConfig, children: [_jsx(SelectTrigger, { id: `${service.id}-provider`, className: "w-full text-xs", children: _jsx(SelectValue, { placeholder: loadingModels ? 'Loading...' : noModels ? 'No providers' : 'Select provider', children: selectedProviderLabel }) }), _jsx(SelectContent, { children: serviceState.modelGroups.map((group) => (_jsx(SelectItem, { value: group.provider.id, children: getProviderCatalogItem(group.provider.id).name }, group.provider.id))) })] }) }), _jsx(StepField, { id: `${service.id}-model`, label: "Model", children: _jsxs(Select, { value: serviceState.modelId, onValueChange: (value) => onModelChange(service.id, value), disabled: loadingModels || availableModels.length === 0 || savingConfig, children: [_jsx(SelectTrigger, { id: `${service.id}-model`, className: "w-full text-xs", children: _jsx(SelectValue, { placeholder: loadingModels ? 'Loading...' : noModels ? 'No models' : 'Select model', children: selectedModelLabel }) }), _jsx(SelectContent, { children: availableModels.map((model) => (_jsx(SelectItem, { value: model.id, children: model.name }, model.id))) })] }) })] }), loadingModels ? (_jsxs("div", { className: "mt-4 flex items-center gap-2 text-xs text-muted-foreground", children: [_jsx(LoaderCircle, { className: "size-3.5 animate-spin" }), _jsx("span", { children: "Loading compatible models..." })] })) : null] }));
}
