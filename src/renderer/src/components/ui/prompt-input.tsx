"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"
import { BarWaveAnimation } from "./bar-wave-animation"
import { WaveAnimation } from "./wave-animation"
import { TypingLoader } from "./loader"
import { Button } from "./button"
import { cn } from "@/lib/utils"
import { AudioLines, Check, Mic, MicOff, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react"

type PromptInputContextType = {
  isLoading: boolean
  value: string
  setValue: (value: string) => void
  maxHeight: number | string
  maxLength?: number
  onSubmit?: () => void
  disabled?: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  isExpanded: boolean
  adaptiveLayout: boolean
  triggerFileUpload: () => void
}

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  maxLength: undefined,
  onSubmit: undefined,
  disabled: false,
  textareaRef: React.createRef<HTMLTextAreaElement>(),
  isExpanded: false,
  adaptiveLayout: false,
  triggerFileUpload: () => {},
})

function usePromptInput() {
  return useContext(PromptInputContext)
}

export type PromptInputProps = {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  maxHeight?: number | string
  maxLength?: number
  expandedThreshold?: number
  onSubmit?: () => void
  children: React.ReactNode
  className?: string
  wrapperClassName?: string
  contentClassName?: string
  footerClassName?: string
  leadingAction?: React.ReactNode
  actions?: React.ReactNode
  disabled?: boolean
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>
  voiceMode?: PromptInputVoiceMode | null
  voiceElapsedMs?: number
  voiceMuted?: boolean
  voiceMediaStream?: MediaStream | null
  onVoiceEnd?: () => void
  onVoiceCancel?: () => void
  onVoiceConfirm?: () => void
  onVoiceMutedChange?: (muted: boolean) => void
  onFilesChange?: (files: File[]) => void
} & React.ComponentProps<"div">

export type PromptInputVoiceMode = "conversation" | "dictation" | "recording"
export type PromptInputSpeechToTextMode = "dictate" | "record" | "disabled"

const SPEECH_TO_TEXT_ACTION_LABELS: Record<PromptInputSpeechToTextMode, string> = {
  dictate: "Start dictation",
  record: "Record speech to text",
  disabled: "No speech-to-text model configured",
}

function usePromptInputTransition() {
  const prefersReducedMotion = useReducedMotion()

  return prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 24, mass: 0.5 }
}

function usePromptInputExpansion({
  value,
  textareaRef,
  threshold,
  enabled,
}: {
  value: string
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  threshold: number
  enabled: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!enabled || !textarea || value.length === 0) {
      setIsExpanded(false)
      return
    }

    setIsExpanded(value.includes("\n") || textarea.scrollHeight > threshold)
  }, [enabled, threshold, textareaRef, value])

  return isExpanded
}

function PromptInputMotionSlot({
  children,
  transition,
}: {
  children: React.ReactNode
  transition: ReturnType<typeof usePromptInputTransition>
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={transition}
      className="shrink-0"
    >
      {children}
    </motion.div>
  )
}

function PromptInputVoiceWaveform({
  muted,
  mode,
  mediaStream,
}: {
  muted: boolean
  mode: PromptInputVoiceMode
  mediaStream?: MediaStream | null
}) {
  const isSpeechToText = mode === "dictation" || mode === "recording"

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-full bg-muted/70 shadow-inner",
        muted && "bg-muted/50"
      )}
      aria-hidden="true"
    >
      {isSpeechToText ? (
        <BarWaveAnimation active={!muted} height={28} mediaStream={mediaStream} />
      ) : (
        <WaveAnimation active={!muted} height={28} />
      )}
    </div>
  )
}

function formatVoiceDuration(elapsedMs: number) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function PromptInputVoicePanel({
  mode,
  disabled,
  leadingAction,
  elapsedMs,
  muted,
  mediaStream,
  onEnd,
  onCancel,
  onConfirm,
  onMutedChange,
}: {
  mode: PromptInputVoiceMode
  disabled?: boolean
  leadingAction?: React.ReactNode
  elapsedMs?: number
  muted?: boolean
  mediaStream?: MediaStream | null
  onEnd?: () => void
  onCancel?: () => void
  onConfirm?: () => void
  onMutedChange?: (muted: boolean) => void
}) {
  const promptInputContext = usePromptInput()
  const [localMuted, setLocalMuted] = useState(false)
  const isSpeechToText = mode === "dictation" || mode === "recording"
  const isRecording = mode === "recording"
  const isMuted = !isSpeechToText && (muted ?? localMuted)

  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    action?: () => void
  ) => {
    event.stopPropagation()
    action?.()
  }

  const handleMutedChange = (nextMuted: boolean) => {
    setLocalMuted(nextMuted)
    onMutedChange?.(nextMuted)
  }

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
      className="flex min-w-0 flex-1 cursor-default items-center gap-2 text-foreground"
    >
      {leadingAction ? (
        <PromptInputContext.Provider value={{ ...promptInputContext, disabled: true }}>
          <div className="shrink-0 opacity-50" aria-disabled="true">
            {leadingAction}
          </div>
        </PromptInputContext.Provider>
      ) : null}
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isSpeechToText
            ? "bg-destructive/10 text-destructive"
            : isMuted
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "block rounded-full",
            isSpeechToText
              ? "size-2.5 bg-current"
              : isMuted
              ? "size-5 bg-current opacity-60"
              : "size-6 bg-current ring-2 ring-primary/10"
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-28 flex-1">
          <PromptInputVoiceWaveform muted={isMuted} mode={mode} mediaStream={mediaStream} />
        </div>
        {elapsedMs !== undefined ? (
          <span className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {formatVoiceDuration(elapsedMs)}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isSpeechToText ? (
          <>
            <button
              type="button"
              aria-label={isRecording ? "Cancel recording" : "Cancel dictation"}
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onCancel)}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-4" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label={isRecording ? "Confirm recording" : "Confirm dictation"}
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onConfirm)}
              className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-50"
            >
              <Check className="size-4" strokeWidth={2.8} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              aria-label={isMuted ? "Unmute" : "Mute"}
              disabled={disabled}
              onClick={(event) => {
                event.stopPropagation()
                handleMutedChange(!isMuted)
              }}
              className={cn(
                "flex size-8 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
                isMuted
                  ? "border-destructive/40 bg-destructive/10 text-destructive focus-visible:ring-destructive/40"
                  : "border-border bg-background/70 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/55"
              )}
            >
              {isMuted ? (
                <MicOff className="size-4" strokeWidth={2.4} />
              ) : (
                <Mic className="size-4" strokeWidth={2.2} />
              )}
            </button>
            <button
              type="button"
              aria-label="End voice conversation"
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onEnd)}
              className="flex h-9 w-16 items-center justify-center gap-1 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-50"
            >
              <TypingLoader size="sm" />
              <span>End</span>
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

function PromptInput({
  className,
  wrapperClassName,
  contentClassName,
  footerClassName,
  isLoading = false,
  maxHeight = 240,
  maxLength,
  expandedThreshold = 52,
  value,
  onValueChange,
  onSubmit,
  children,
  leadingAction,
  actions,
  disabled = false,
  textareaRef: externalTextareaRef,
  voiceMode,
  voiceElapsedMs,
  voiceMuted,
  voiceMediaStream,
  onVoiceEnd,
  onVoiceCancel,
  onVoiceConfirm,
  onVoiceMutedChange,
  onFilesChange,
  onClick,
  ...props
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "")
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = externalTextareaRef ?? internalTextareaRef
  const triggerFileUpload = () => fileInputRef.current?.click()
  const currentValue = value ?? internalValue
  const hasAdaptiveLayout = Boolean(leadingAction || actions)
  const transition = usePromptInputTransition()
  const isExpanded = usePromptInputExpansion({
    value: currentValue,
    textareaRef,
    threshold: expandedThreshold,
    enabled: hasAdaptiveLayout,
  })
  const isConversationMode = voiceMode === "conversation"
  const isDictationMode = voiceMode === "dictation"
  const isRecordingMode = voiceMode === "recording"
  const isVoicePanelOnlyMode = isConversationMode || isRecordingMode
  const isPromptExpanded = isExpanded || isDictationMode

  const handleChange = (newValue: string) => {
    setInternalValue(newValue)
    onValueChange?.(newValue)
  }

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      textareaRef.current?.focus()
    }
  }

  return (
    <TooltipProvider delay={1000}>
      <PromptInputContext.Provider
        value={{
          isLoading,
          value: currentValue,
          setValue: onValueChange ?? handleChange,
          maxHeight,
          maxLength,
          onSubmit,
          disabled,
          textareaRef,
          isExpanded: isPromptExpanded,
          adaptiveLayout: hasAdaptiveLayout,
          triggerFileUpload,
        }}
      >
        {hasAdaptiveLayout ? (
          <motion.div
            layout
            transition={transition}
            className={cn("mx-auto w-full max-w-[96rem]", wrapperClassName)}
          >
            <motion.div
              layout
              transition={transition}
              onClick={isVoicePanelOnlyMode ? onClick : handleClick}
              data-expanded={isPromptExpanded}
              data-voice-mode={voiceMode ?? undefined}
              className={cn(
                "cursor-text border border-border/60 bg-card/95 text-foreground shadow-sm shadow-foreground/5 focus-within:ring-1 focus-within:ring-ring/25",
                isVoicePanelOnlyMode
                  ? "flex min-h-10 items-center gap-2 rounded-full p-1.5 focus-within:ring-0"
                  : isPromptExpanded
                  ? "flex max-h-[min(48vh,30rem)] min-h-24 flex-col rounded-xl px-4 py-3"
                  : "flex min-h-10 items-center gap-2 rounded-full p-1.5",
                disabled && "cursor-not-allowed opacity-60",
                className
              )}
              {...(props as React.ComponentProps<typeof motion.div>)}
            >
              {isVoicePanelOnlyMode ? (
                <PromptInputVoicePanel
                  mode={voiceMode}
                  disabled={disabled}
                  leadingAction={leadingAction}
                  elapsedMs={voiceElapsedMs}
                  muted={voiceMuted}
                  mediaStream={voiceMediaStream}
                  onEnd={onVoiceEnd}
                  onCancel={onVoiceCancel}
                  onConfirm={onVoiceConfirm ?? onSubmit}
                  onMutedChange={onVoiceMutedChange}
                />
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {!isPromptExpanded && leadingAction && (
                      <PromptInputMotionSlot transition={transition}>
                        {leadingAction}
                      </PromptInputMotionSlot>
                    )}
                  </AnimatePresence>
                  <motion.div
                    layout
                    transition={transition}
                    className={cn(
                      isPromptExpanded ? "min-h-0 flex-1" : "min-w-0 flex-1",
                      contentClassName
                    )}
                  >
                    {children}
                  </motion.div>
                  <motion.div
                    layout
                    transition={transition}
                    className={cn(
                      isPromptExpanded
                        ? "mt-3 flex items-center justify-between gap-2"
                        : "flex shrink-0 items-center gap-1.5",
                      footerClassName
                    )}
                  >
                    <AnimatePresence initial={false}>
                      {isPromptExpanded && leadingAction && (
                        <PromptInputMotionSlot transition={transition}>
                          {leadingAction}
                        </PromptInputMotionSlot>
                      )}
                    </AnimatePresence>
                    {isDictationMode ? (
                      <PromptInputVoicePanel
                        mode="dictation"
                        disabled={disabled}
                        elapsedMs={voiceElapsedMs}
                        muted={voiceMuted}
                        mediaStream={voiceMediaStream}
                        onCancel={onVoiceCancel}
                        onConfirm={onVoiceConfirm ?? onSubmit}
                        onMutedChange={onVoiceMutedChange}
                      />
                    ) : (
                      actions
                    )}
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : (
          <div
            onClick={handleClick}
            className={cn(
              "border-input bg-background cursor-text rounded-2xl border px-3 py-1.5 shadow-xs",
              disabled && "cursor-not-allowed opacity-60",
              className
            )}
            {...props}
          >
            {children}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            if (files.length > 0) onFilesChange?.(files)
            e.target.value = ""
          }}
        />
      </PromptInputContext.Provider>
    </TooltipProvider>
  )
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean
} & React.ComponentProps<typeof Textarea>

function PromptInputTextarea({
  className,
  onKeyDown,
  disableAutosize = false,
  ...props
}: PromptInputTextareaProps) {
  const {
    value,
    setValue,
    maxHeight,
    onSubmit,
    disabled,
    textareaRef,
    isExpanded,
    adaptiveLayout,
  } = usePromptInput()

  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el || disableAutosize) return

    el.style.height = "auto"

    if (typeof maxHeight === "number") {
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    } else {
      el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`
    }
  }

  const handleRef = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el
    adjustHeight(el)
  }

  useLayoutEffect(() => {
    if (!textareaRef.current || disableAutosize) return

    const el = textareaRef.current
    el.style.height = "auto"

    if (typeof maxHeight === "number") {
      el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
    } else {
      el.style.height = `min(${el.scrollHeight}px, ${maxHeight})`
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, maxHeight, disableAutosize])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight(e.target)
    setValue(e.target.value)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit?.()
    }
    onKeyDown?.(e)
  }

  return (
    <Textarea
      ref={handleRef}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(
        "text-primary min-h-[32px] w-full resize-none border-none bg-transparent! shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        adaptiveLayout &&
          "appearance-none !border-0 bg-transparent px-0 text-sm leading-6 text-foreground !shadow-none !outline-none placeholder:text-muted-foreground focus:!border-transparent focus:!outline-none focus:!ring-0 focus-visible:!border-transparent focus-visible:!outline-none focus-visible:!ring-0 md:text-sm",
        adaptiveLayout &&
          (isExpanded
            ? "max-h-[34vh] min-h-14 overflow-y-auto py-0"
            : "h-7 min-h-7 overflow-hidden py-0"),
        className
      )}
      rows={1}
      disabled={disabled}
      {...props}
    />
  )
}

export type PromptInputActionsProps = React.HTMLAttributes<HTMLDivElement>

function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  )
}

export type PromptInputVoiceActionsProps = {
  speechToTextMode: PromptInputSpeechToTextMode
  onSpeechToText: () => void | Promise<void>
  speechToTextDisabled?: boolean
  onVoiceConversation?: () => void | Promise<void>
  voiceConversationDisabled?: boolean
  showVoiceConversation?: boolean
}

function PromptInputVoiceActions({
  speechToTextMode,
  onSpeechToText,
  speechToTextDisabled,
  onVoiceConversation,
  voiceConversationDisabled = true,
  showVoiceConversation = true,
}: PromptInputVoiceActionsProps) {
  const speechToTextLabel = SPEECH_TO_TEXT_ACTION_LABELS[speechToTextMode]
  const isSpeechToTextDisabled =
    speechToTextDisabled || speechToTextMode === "disabled"
  const voiceConversationLabel = "Start voice conversation"

  const handleSpeechToText = () => {
    if (isSpeechToTextDisabled) return
    void onSpeechToText()
  }

  const handleVoiceConversation = () => {
    if (voiceConversationDisabled || !onVoiceConversation) return
    void onVoiceConversation()
  }

  return (
    <>
      <PromptInputAction tooltip={speechToTextLabel}>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-foreground hover:bg-muted"
          aria-label={speechToTextLabel}
          disabled={isSpeechToTextDisabled}
          onClick={handleSpeechToText}
        >
          <Mic className="size-4" />
        </Button>
      </PromptInputAction>
      {showVoiceConversation ? (
        <PromptInputAction tooltip={voiceConversationLabel}>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-9 overflow-hidden rounded-full bg-foreground text-background hover:bg-foreground/90"
            aria-label={voiceConversationLabel}
            disabled={voiceConversationDisabled}
            onClick={handleVoiceConversation}
          >
            <AudioLines className="size-4" />
          </Button>
        </PromptInputAction>
      ) : null}
    </>
  )
}

export type PromptInputActionProps = {
  className?: string
  tooltip: React.ReactNode
  children: React.ReactElement<{
    disabled?: boolean
    onClick?: React.MouseEventHandler<HTMLElement>
  }>
  side?: "top" | "bottom" | "left" | "right"
} & React.ComponentProps<typeof Tooltip>

function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput()
  const child = React.cloneElement(children, {
    disabled: disabled || children.props.disabled,
    onClick: (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation()
      children.props.onClick?.(event)
    },
  })

  return (
    <Tooltip {...props}>
      <TooltipTrigger render={child} disabled={disabled} />
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export type PromptInputCharCountProps = {
  className?: string
}

function PromptInputCharCount({ className }: PromptInputCharCountProps) {
  const { value, maxLength } = usePromptInput()
  if (maxLength === undefined) return null
  const remaining = maxLength - value.length
  const isWarning = remaining >= 0 && remaining <= Math.ceil(maxLength * 0.15)
  return (
    <span
      role="status"
      aria-label={`${remaining} characters remaining`}
      className={cn(
        "shrink-0 font-mono text-xs tabular-nums transition-colors duration-200",
        remaining < 0
          ? "text-destructive"
          : isWarning
          ? "text-warning"
          : "text-muted-foreground/50",
        className
      )}
    >
      {remaining}
    </span>
  )
}

export {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputVoiceActions,
  PromptInputAction,
  PromptInputCharCount,
  usePromptInput,
}
