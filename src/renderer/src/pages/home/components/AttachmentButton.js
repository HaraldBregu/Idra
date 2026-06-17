import { jsx as _jsx } from "react/jsx-runtime";
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PromptInputAction, usePromptInput } from '@/components/ui/prompt-input';
export function AttachmentButton() {
    const { triggerFileUpload } = usePromptInput();
    return (_jsx(PromptInputAction, { tooltip: "Add attachment", children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground", "aria-label": "Add attachment", onClick: triggerFileUpload, children: _jsx(Plus, { className: "size-4" }) }) }));
}
