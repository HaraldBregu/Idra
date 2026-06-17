import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { FileAudio, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
function attachmentId() {
    if (typeof crypto.randomUUID === 'function')
        return crypto.randomUUID();
    return `attachment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function formatDuration(durationMs) {
    const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
function formatFileSize(size) {
    if (size < 1024)
        return `${size} B`;
    if (size < 1024 * 1024)
        return `${Math.round(size / 1024)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
export function filesToAttachments(files) {
    return files.map((file) => ({
        id: attachmentId(),
        kind: 'file',
        file,
    }));
}
export function AttachmentTray({ attachments, onRemove, }) {
    if (attachments.length === 0)
        return null;
    return (_jsx("div", { className: "mb-2 flex max-h-32 w-full flex-col gap-1.5 overflow-y-auto rounded-lg border border-border/60 bg-card/95 p-2 shadow-sm shadow-foreground/5", children: attachments.map((attachment) => {
            const isAudio = attachment.kind === 'audio';
            const title = isAudio
                ? `Audio ${formatDuration(attachment.durationMs ?? 0)}`
                : attachment.file.name;
            return (_jsxs("div", { className: "flex min-w-0 items-center gap-2 rounded-md border border-border/50 bg-background/70 px-2 py-1.5", children: [_jsx("span", { className: "flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground", children: isAudio ? _jsx(FileAudio, { className: "size-4" }) : _jsx(Paperclip, { className: "size-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "truncate text-xs font-medium leading-4", children: title }), _jsxs("p", { className: "truncate text-[11px] leading-4 text-muted-foreground", children: [attachment.file.name, " - ", formatFileSize(attachment.file.size)] })] }), isAudio && attachment.url ? (_jsx("audio", { controls: true, src: attachment.url, className: "h-7 w-32 shrink-0 sm:w-40" })) : null, _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground", "aria-label": `Remove ${title}`, onClick: () => onRemove(attachment.id), children: _jsx(X, { className: "size-3.5" }) })] }, attachment.id));
        }) }));
}
