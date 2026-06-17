import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { KeyRound } from 'lucide-react';
import { actionableProviderCatalog, STEP_COPY } from '../constants';
import { ProviderCard } from './ProviderCard';
export function ProviderStep({ providerEntries, savingProviderId, onUpdateEntry, onApiKeyChange, onSave, onOpenLink, }) {
    const { title, description } = STEP_COPY.providers;
    return (_jsxs("div", { className: "mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold leading-tight tracking-normal text-foreground", children: title }), _jsx("p", { className: "mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground", children: description })] }), _jsx("div", { className: "mt-4 space-y-2", children: actionableProviderCatalog.map((provider) => (_jsx(ProviderCard, { provider: provider, entry: providerEntries.find((item) => item.providerId === provider.id), savingProviderId: savingProviderId, onUpdateEntry: onUpdateEntry, onApiKeyChange: onApiKeyChange, onSave: onSave, onOpenLink: onOpenLink }, provider.id))) }), _jsx("div", { className: "mt-auto pt-4", children: _jsxs("div", { className: "flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-muted-foreground", children: [_jsx(KeyRound, { className: "size-4 shrink-0" }), _jsx("p", { className: "text-xs font-medium leading-snug", children: "Keys are stored locally and never shared." })] }) })] }));
}
