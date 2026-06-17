import { type ReactElement } from 'react';
export type PromptAttachment = {
    readonly id: string;
    readonly kind: 'file' | 'audio';
    readonly file: File;
    readonly url?: string;
    readonly durationMs?: number;
};
export declare function filesToAttachments(files: File[]): PromptAttachment[];
export declare function AttachmentTray({ attachments, onRemove, }: {
    readonly attachments: readonly PromptAttachment[];
    readonly onRemove: (id: string) => void;
}): ReactElement | null;
