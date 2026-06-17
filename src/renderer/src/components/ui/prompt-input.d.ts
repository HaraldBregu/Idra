import { Textarea } from "@/components/ui/textarea";
import { Tooltip } from "./tooltip";
import React from "react";
type PromptInputContextType = {
    isLoading: boolean;
    value: string;
    setValue: (value: string) => void;
    maxHeight: number | string;
    maxLength?: number;
    onSubmit?: () => void;
    disabled?: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    isExpanded: boolean;
    adaptiveLayout: boolean;
    triggerFileUpload: () => void;
};
declare function usePromptInput(): PromptInputContextType;
export type PromptInputProps = {
    isLoading?: boolean;
    value?: string;
    onValueChange?: (value: string) => void;
    maxHeight?: number | string;
    maxLength?: number;
    expandedThreshold?: number;
    onSubmit?: () => void;
    children: React.ReactNode;
    className?: string;
    wrapperClassName?: string;
    contentClassName?: string;
    footerClassName?: string;
    leadingAction?: React.ReactNode;
    actions?: React.ReactNode;
    disabled?: boolean;
    textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
    voiceMode?: PromptInputVoiceMode | null;
    voiceElapsedMs?: number;
    voiceMuted?: boolean;
    voiceMediaStream?: MediaStream | null;
    onVoiceEnd?: () => void;
    onVoiceCancel?: () => void;
    onVoiceConfirm?: () => void;
    onVoiceMutedChange?: (muted: boolean) => void;
    onFilesChange?: (files: File[]) => void;
} & React.ComponentProps<"div">;
export type PromptInputVoiceMode = "conversation" | "dictation";
declare function PromptInput({ className, wrapperClassName, contentClassName, footerClassName, isLoading, maxHeight, maxLength, expandedThreshold, value, onValueChange, onSubmit, children, leadingAction, actions, disabled, textareaRef: externalTextareaRef, voiceMode, voiceElapsedMs, voiceMuted, voiceMediaStream, onVoiceEnd, onVoiceCancel, onVoiceConfirm, onVoiceMutedChange, onFilesChange, onClick, ...props }: PromptInputProps): import("react/jsx-runtime").JSX.Element;
export type PromptInputTextareaProps = {
    disableAutosize?: boolean;
} & React.ComponentProps<typeof Textarea>;
declare function PromptInputTextarea({ className, onKeyDown, disableAutosize, ...props }: PromptInputTextareaProps): import("react/jsx-runtime").JSX.Element;
export type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>;
declare function PromptInputActions({ children, className, ...props }: PromptInputActionsProps): import("react/jsx-runtime").JSX.Element;
export type PromptInputActionProps = {
    className?: string;
    tooltip: React.ReactNode;
    children: React.ReactElement<{
        disabled?: boolean;
        onClick?: React.MouseEventHandler<HTMLElement>;
    }>;
    side?: "top" | "bottom" | "left" | "right";
} & React.ComponentProps<typeof Tooltip>;
declare function PromptInputAction({ tooltip, children, className, side, ...props }: PromptInputActionProps): import("react/jsx-runtime").JSX.Element;
export type PromptInputCharCountProps = {
    className?: string;
};
declare function PromptInputCharCount({ className }: PromptInputCharCountProps): import("react/jsx-runtime").JSX.Element | null;
export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction, PromptInputCharCount, usePromptInput, };
