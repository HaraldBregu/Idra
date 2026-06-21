import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, ArrowUp, AudioLines, FileAudio, Mic, Paperclip, Plus, Square, X } from 'lucide-react';
import { PageContainer } from '@/components/app/base/page';
import { Button } from '@/components/ui/button';
import { ChatContainerContent, ChatContainerRoot, ChatContainerScrollAnchor, } from '@/components/ui/chat-container';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { GradientSphere } from '@/components/ui/gradient-sphere';
import { PromptInput, PromptInputAction, PromptInputActions, PromptInputTextarea, usePromptInput, } from '@/components/ui/prompt-input';
import { PromptSuggestion } from '@/components/ui/prompt-suggestion';
import { ScrollButton } from '@/components/ui/scroll-button';
import { useChatMode } from '@/contexts/chat-mode';
import { cn } from '@/lib/utils';
import { AssistantMessage } from './components/AssistantMessage';
import { UserMessage } from './components/UserMessage';
import { Provider, welcomeMessage } from './context';
import { useAudioRecorder, useHomeAgent, useRealtimeDictation, useVoiceButtonMode, } from './hooks';
import { appendTranscriptionText, fileToSttAudioInput } from './hooks/stt';
const promptSuggestions = [
    {
        label: 'Introduce yourself',
        prompt: 'Introduce yourself as Friday, my personal assistant. Keep it brief and specific: explain what you can help me do, how I should ask for help, and suggest three useful first tasks.',
    },
    {
        label: 'Say hi',
        prompt: 'Say hi and start a short onboarding conversation. Ask what I am working on today, then offer a few practical ways you can help me right now.',
    },
    {
        label: 'Meet your assistant',
        prompt: 'Give me a quick tour of Friday as my personal assistant. Summarize your main capabilities, explain the best way to work with you, and propose three starter prompts I can try.',
    },
    {
        label: 'Plan my day',
        prompt: 'Help me plan today. Ask for my priorities, time constraints, and any deadlines, then turn them into a practical schedule.',
    },
    {
        label: 'Draft a message',
        prompt: 'Help me draft a clear message. Ask who it is for, what I need to say, and the tone I want.',
    },
    {
        label: 'Brainstorm ideas',
        prompt: 'Brainstorm ten practical ideas for something I can improve this week, then help me choose one small next action.',
    },
];
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
function filesToAttachments(files) {
    return files.map((file) => ({
        id: attachmentId(),
        kind: 'file',
        file,
    }));
}
function RecorderErrorMessage({ message, }) {
    if (!message)
        return null;
    return (_jsxs("div", { className: "mb-2 flex min-w-0 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive shadow-sm", children: [_jsx(AlertCircle, { className: "size-4 shrink-0" }), _jsx("p", { className: "min-w-0 truncate text-xs font-medium", children: message })] }));
}
function EmptyConversation() {
    return (_jsx(Empty, { className: "mx-auto max-w-sm border-0 p-0", children: _jsxs(EmptyHeader, { children: [_jsx(EmptyMedia, { className: "mt-8", children: _jsx(GradientSphere, { size: 72 }) }), _jsx(EmptyTitle, { children: "Start a conversation" }), _jsx(EmptyDescription, { children: "Ask Friday to inspect code, make a change, or help plan the next step." })] }) }));
}
function PromptSuggestions({ onUseSuggestion, }) {
    return (_jsx("div", { className: "mb-2 flex flex-wrap justify-center gap-2 px-1", "aria-label": "Prompt suggestions", children: promptSuggestions.map((suggestion) => (_jsx(PromptSuggestion, { type: "button", variant: "outline", size: "sm", className: "h-8 max-w-full border-border/70 bg-card/95 px-3 text-xs font-medium text-muted-foreground shadow-sm shadow-foreground/5 hover:text-foreground", "aria-label": suggestion.prompt, onClick: () => onUseSuggestion(suggestion.prompt), children: suggestion.label }, suggestion.label))) }));
}
function AttachmentTray({ attachments, onRemove, }) {
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
function AttachmentButton() {
    const { triggerFileUpload } = usePromptInput();
    return (_jsx(PromptInputAction, { tooltip: "Add attachment", children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground", "aria-label": "Add attachment", onClick: triggerFileUpload, children: _jsx(Plus, { className: "size-4" }) }) }));
}
function VoiceButton({ onVoiceModeRequest, disabled, mode, }) {
    const label = mode === 'record' ? 'Record voice' : 'Dictate';
    const tooltip = mode === 'disabled' ? 'Configure speech to text' : label;
    return (_jsx(PromptInputAction, { tooltip: tooltip, children: _jsx(Button, { type: "button", variant: "ghost", size: "icon", className: "size-8 rounded-full text-foreground hover:bg-muted", "aria-label": tooltip, disabled: disabled || mode === 'disabled', onClick: onVoiceModeRequest, children: _jsx(Mic, { className: "size-4" }) }) }));
}
function SubmitButton({ isLoading, canSubmit, disabled, onAction, }) {
    const label = isLoading ? 'Stop generation' : canSubmit ? 'Send message' : 'Start voice conversation';
    const iconKey = isLoading ? 'stop' : canSubmit ? 'send' : 'voice';
    const icon = isLoading ? (_jsx(Square, { className: "size-4 fill-current" })) : canSubmit ? (_jsx(ArrowUp, { className: "size-4" })) : (_jsx(AudioLines, { className: "size-4" }));
    return (_jsx(PromptInputAction, { tooltip: label, children: _jsx(Button, { type: "button", variant: "default", size: "icon", className: "size-9 overflow-hidden rounded-full bg-foreground text-background hover:bg-foreground/90", "aria-label": label, disabled: disabled, onClick: onAction, children: _jsx(AnimatePresence, { mode: "wait", initial: false, children: _jsx(motion.span, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: 0.14, ease: [0.4, 0, 0.2, 1] }, className: "flex items-center justify-center", children: icon }, iconKey) }) }) }));
}
function PageContent() {
    const { mode, setMode } = useChatMode();
    const agent = useHomeAgent({ setMode });
    const dictation = useRealtimeDictation({
        value: agent.input,
        onValueChange: agent.setInput,
    });
    const recorder = useAudioRecorder();
    const voiceButtonMode = useVoiceButtonMode();
    const [voiceMode, setVoiceMode] = useState(null);
    const [activeDictationMode, setActiveDictationMode] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [transcriptionErrorMessage, setTranscriptionErrorMessage] = useState(null);
    const [transcribingRecording, setTranscribingRecording] = useState(false);
    const transcriptionRunRef = useRef(0);
    const visibleMessages = agent.chatState.messages.filter((message) => message.id !== welcomeMessage.id);
    const showEmptyConversation = visibleMessages.length === 0 &&
        !agent.isLoading &&
        !agent.historyLoading;
    const showPromptSuggestions = showEmptyConversation && voiceMode === null;
    const canSubmit = agent.input.trim().length > 0;
    const dictationStatus = dictation.status;
    const cancelDictationSession = dictation.cancel;
    const recorderStatus = recorder.status;
    const cancelRecordingSession = recorder.cancel;
    const dictationBusy = dictationStatus === 'checking-permission' ||
        dictationStatus === 'connecting' ||
        dictationStatus === 'finishing';
    const recordingBusy = recorderStatus === 'checking-permission' ||
        recorderStatus === 'stopping' ||
        transcribingRecording;
    const voiceBusy = dictationBusy || recordingBusy;
    const activeVoiceElapsedMs = activeDictationMode === 'record' ? recorder.elapsedMs : dictation.elapsedMs;
    const activeVoiceMuted = activeDictationMode === 'record' ? recorder.isMuted : dictation.isMuted;
    const activeVoiceStream = activeDictationMode === 'record' ? recorder.stream : dictation.stream;
    const activeVoiceSetMuted = activeDictationMode === 'record' ? recorder.setMuted : dictation.setMuted;
    const voiceErrorMessage = transcriptionErrorMessage ?? recorder.errorMessage ?? dictation.errorMessage;
    useEffect(() => {
        if (mode !== 'chat')
            return;
        setVoiceMode(null);
        setActiveDictationMode(null);
        if (dictationStatus === 'checking-permission' ||
            dictationStatus === 'connecting' ||
            dictationStatus === 'recording') {
            void cancelDictationSession();
        }
        if (recorderStatus === 'checking-permission' ||
            recorderStatus === 'recording' ||
            recorderStatus === 'stopping') {
            void cancelRecordingSession();
        }
    }, [cancelDictationSession, cancelRecordingSession, dictationStatus, mode, recorderStatus]);
    const removeAttachment = useCallback((id) => {
        setAttachments((current) => current.filter((attachment) => {
            if (attachment.id !== id)
                return true;
            if (attachment.url) {
                URL.revokeObjectURL(attachment.url);
            }
            return false;
        }));
    }, []);
    const returnToChat = () => {
        setActiveDictationMode(null);
        setVoiceMode(null);
        setMode('chat');
    };
    const startVoiceConversation = () => {
        setVoiceMode('conversation');
        setMode('voice');
    };
    const startDictation = async () => {
        setTranscriptionErrorMessage(null);
        if (voiceButtonMode === 'disabled') {
            setTranscriptionErrorMessage('Choose a speech-to-text provider and model in Settings.');
            return;
        }
        if (voiceButtonMode === 'record') {
            const started = await recorder.start();
            if (!started) {
                setMode('chat');
                return;
            }
            setActiveDictationMode('record');
            setVoiceMode('dictation');
            setMode('voice');
            return;
        }
        const started = await dictation.start();
        if (!started) {
            setMode('chat');
            return;
        }
        setActiveDictationMode('dictate');
        setVoiceMode('dictation');
        setMode('voice');
    };
    const cancelDictation = async () => {
        transcriptionRunRef.current += 1;
        setTranscribingRecording(false);
        if (activeDictationMode === 'record') {
            await recorder.cancel();
        }
        else {
            await dictation.cancel();
        }
        returnToChat();
    };
    const confirmDictation = async () => {
        if (activeDictationMode === 'record') {
            const runId = transcriptionRunRef.current + 1;
            transcriptionRunRef.current = runId;
            setTranscribingRecording(true);
            setTranscriptionErrorMessage(null);
            try {
                const recording = await recorder.stop();
                if (!recording) {
                    returnToChat();
                    return;
                }
                try {
                    const result = await window.stt.transcribe({
                        audio: await fileToSttAudioInput(recording.file),
                    });
                    if (transcriptionRunRef.current === runId) {
                        agent.setInput(appendTranscriptionText(agent.input, result.text));
                    }
                }
                finally {
                    if (recording.url)
                        URL.revokeObjectURL(recording.url);
                }
            }
            catch (error) {
                const message = error instanceof Error && error.message.trim()
                    ? error.message
                    : 'Speech transcription failed.';
                if (transcriptionRunRef.current === runId)
                    setTranscriptionErrorMessage(message);
            }
            finally {
                if (transcriptionRunRef.current === runId) {
                    setTranscribingRecording(false);
                    returnToChat();
                }
            }
            return;
        }
        await dictation.finish();
        returnToChat();
    };
    const handlePrimaryAction = () => {
        if (agent.isLoading || canSubmit) {
            agent.handleSubmit();
            return;
        }
        startVoiceConversation();
    };
    return (_jsx(PageContainer, { className: "overflow-hidden text-foreground", children: _jsxs("div", { className: "relative flex min-h-0 flex-1 flex-col bg-background text-foreground", children: [_jsxs(ChatContainerRoot, { className: "min-h-0 p-0 [scrollbar-gutter:auto]", "aria-live": "polite", children: [_jsxs(ChatContainerContent, { className: cn('mx-auto w-full max-w-4xl gap-5 px-4', showEmptyConversation
                                ? 'h-full min-h-0 justify-center overflow-hidden pb-36 pt-12'
                                : 'min-h-full pb-28 pt-6'), children: [showEmptyConversation ? (_jsxs(_Fragment, { children: [_jsx(EmptyConversation, {}), showPromptSuggestions ? (_jsx(PromptSuggestions, { onUseSuggestion: agent.useSuggestion })) : null] })) : (_jsx(_Fragment, { children: visibleMessages.map((message, index) => {
                                        const previous = index > 0 ? visibleMessages[index - 1] : null;
                                        const isPreviousMessage = index < visibleMessages.length - 1;
                                        const showAssistantHeader = !previous || previous.role !== 'agent';
                                        const groupedAssistantClassName = showAssistantHeader ? undefined : '-mt-5';
                                        if (message.role === 'user') {
                                            return (_jsx(UserMessage, { content: message.content, collapseLongContent: isPreviousMessage }, message.id));
                                        }
                                        return (_jsx(AssistantMessage, { message: message, isStreaming: agent.isLoading &&
                                                message.id === agent.chatState.activeAgentId, showHeader: showAssistantHeader, collapseLongContent: isPreviousMessage, className: groupedAssistantClassName }, message.id));
                                    }) })), _jsx(ChatContainerScrollAnchor, { className: showEmptyConversation ? 'h-0' : undefined })] }), _jsx("div", { className: "pointer-events-none absolute inset-x-0 bottom-24 flex justify-center", children: _jsx(ScrollButton, { type: "button", "aria-label": "Scroll to latest", className: "pointer-events-auto" }) })] }), _jsx("div", { className: "absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 py-3", children: _jsxs("div", { className: "w-full max-w-[96rem]", children: [_jsx(RecorderErrorMessage, { message: voiceErrorMessage }), _jsx(AttachmentTray, { attachments: attachments, onRemove: removeAttachment }), _jsx(PromptInput, { value: agent.input, onValueChange: agent.setInput, isLoading: agent.isLoading, maxHeight: 360, onSubmit: agent.handleSubmit, textareaRef: agent.inputRef, leadingAction: _jsx(AttachmentButton, {}), voiceMode: voiceMode, voiceElapsedMs: voiceMode === 'dictation' ? activeVoiceElapsedMs : undefined, voiceMuted: voiceMode === 'dictation' ? activeVoiceMuted : undefined, voiceMediaStream: voiceMode === 'dictation' ? activeVoiceStream : null, onVoiceMutedChange: voiceMode === 'dictation' ? activeVoiceSetMuted : undefined, onVoiceEnd: returnToChat, onVoiceCancel: () => void cancelDictation(), onVoiceConfirm: () => void confirmDictation(), onFilesChange: (files) => setAttachments((current) => [...current, ...filesToAttachments(files)]), wrapperClassName: "max-w-none", className: "w-full", actions: _jsxs(PromptInputActions, { className: "justify-end gap-1.5", children: [_jsx(VoiceButton, { onVoiceModeRequest: () => void startDictation(), disabled: voiceBusy || agent.isLoading, mode: voiceButtonMode }), _jsx(SubmitButton, { isLoading: agent.isLoading, canSubmit: canSubmit, disabled: voiceBusy, onAction: handlePrimaryAction })] }), children: _jsx(PromptInputTextarea, { placeholder: "Ask anything", "aria-label": "Message Friday", className: "rounded-none" }) })] }) })] }) }));
}
function Page() {
    return (_jsx(Provider, { children: _jsx(PageContent, {}) }));
}
export default Page;
