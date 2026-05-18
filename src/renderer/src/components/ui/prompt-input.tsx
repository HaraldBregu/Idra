"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"
import { WaveAnimation } from "./wave-animation"
import { cn } from "@/lib/utils"
import { Check, Mic, MicOff, MoreHorizontal, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import React, {
  createContext,
  useContext,
  useEffect,
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
  onVoiceEnd?: () => void
  onVoiceCancel?: () => void
  onVoiceConfirm?: () => void
} & React.ComponentProps<"div">

export type PromptInputVoiceMode = "conversation" | "dictation"

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

function formatVoiceDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

function PromptInputVoiceWaveform({
  muted,
  mode,
}: {
  muted: boolean
  mode: PromptInputVoiceMode
}) {
  return (
    <div
      className={cn(
        "relative h-7 min-w-0 overflow-hidden rounded-full bg-muted/70 shadow-inner",
        muted && "bg-muted/50"
      )}
      aria-hidden="true"
    >
      {!muted && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 640 80"
          preserveAspectRatio="none"
          focusable="false"
        >
          <motion.path
            d="M28 43 C86 8 124 69 188 48 C252 26 303 64 360 36 C421 6 474 70 534 47 C578 32 603 34 624 43"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            className={mode === "dictation" ? "text-primary/70" : "text-primary/75"}
            initial={{ pathLength: 0.72, opacity: 0.52 }}
            animate={{ pathLength: [0.72, 1, 0.8], opacity: [0.45, 0.9, 0.55] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M30 35 C88 62 116 22 173 38 C225 53 274 48 323 22 C377 -6 419 55 474 46 C533 36 555 12 604 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-foreground/45"
            initial={{ pathLength: 0.82, opacity: 0.36 }}
            animate={{ pathLength: [0.82, 0.62, 1], opacity: [0.34, 0.72, 0.4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M28 54 C84 20 125 66 190 53 C245 42 296 55 352 45 C414 32 456 10 510 37 C556 61 590 58 622 45"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            className="text-muted-foreground/50"
            initial={{ pathLength: 0.68, opacity: 0.24 }}
            animate={{ pathLength: [0.68, 0.92, 0.74], opacity: [0.22, 0.52, 0.28] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </svg>
      )}
    </div>
  )
}

function PromptInputVoicePanel({
  mode,
  value,
  disabled,
  leadingAction,
  onEnd,
  onCancel,
  onConfirm,
}: {
  mode: PromptInputVoiceMode
  value: string
  disabled?: boolean
  leadingAction?: React.ReactNode
  onEnd?: () => void
  onCancel?: () => void
  onConfirm?: () => void
}) {
  const promptInputContext = usePromptInput()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [muted, setMuted] = useState(false)
  const isDictation = mode === "dictation"
  const isMuted = !isDictation && muted
  const status = isDictation ? "DICTATING" : isMuted ? "MUTED" : "LISTENING"
  const spokenText = isMuted
    ? "Tap the mic to resume"
    : value.trim() ||
      (isDictation ? "Move the one-on-one to Friday morning" : "What's urgent in my inbox today")

  useEffect(() => {
    setElapsedSeconds(0)
    setMuted(false)
    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [mode])

  const handleButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    action?: () => void
  ) => {
    event.stopPropagation()
    action?.()
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
          isDictation
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
            isDictation
              ? "size-2.5 bg-current"
              : isMuted
              ? "size-5 bg-current opacity-60"
              : "size-6 bg-current ring-2 ring-primary/10"
          )}
        />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div
          className={cn(
            "flex shrink-0 items-center gap-1.5 truncate text-[0.65rem] font-bold uppercase tracking-[0.18em]",
            isMuted ? "text-muted-foreground/70" : "text-muted-foreground"
          )}
        >
          <span>{status}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono tracking-normal">{formatVoiceDuration(elapsedSeconds)}</span>
        </div>
        <p
          className={cn(
            "min-w-24 truncate text-sm font-medium leading-6 tracking-normal",
            isMuted ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {spokenText}
        </p>
        <div className="hidden min-w-28 flex-1 sm:block">
          <PromptInputVoiceWaveform muted={isMuted} mode={mode} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isDictation ? (
          <>
            <button
              type="button"
              aria-label="Cancel dictation"
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onCancel)}
              className="flex size-8 items-center justify-center rounded-full border border-border bg-background/70 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/55 disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-4" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Confirm dictation"
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
                setMuted((current) => !current)
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
              <MoreHorizontal className="size-4" strokeWidth={3} />
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
  onVoiceEnd,
  onVoiceCancel,
  onVoiceConfirm,
  onClick,
  ...props
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "")
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaRef = externalTextareaRef ?? internalTextareaRef
  const currentValue = value ?? internalValue
  const hasAdaptiveLayout = Boolean(leadingAction || actions)
  const transition = usePromptInputTransition()
  const isExpanded = usePromptInputExpansion({
    value: currentValue,
    textareaRef,
    threshold: expandedThreshold,
    enabled: hasAdaptiveLayout,
  })

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
          isExpanded,
          adaptiveLayout: hasAdaptiveLayout,
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
              onClick={voiceMode ? onClick : handleClick}
              data-expanded={isExpanded}
              data-voice-mode={voiceMode ?? undefined}
              className={cn(
                "cursor-text border border-border/60 bg-card/95 text-foreground shadow-sm shadow-foreground/5 focus-within:ring-1 focus-within:ring-ring/25",
                voiceMode
                  ? "flex min-h-10 items-center gap-2 rounded-full p-1.5 focus-within:ring-0"
                  : isExpanded
                  ? "flex max-h-[min(48vh,30rem)] min-h-24 flex-col rounded-xl px-4 py-3"
                  : "flex min-h-10 items-center gap-2 rounded-full p-1.5",
                disabled && "cursor-not-allowed opacity-60",
                className
              )}
              {...(props as React.ComponentProps<typeof motion.div>)}
            >
              {voiceMode ? (
                <PromptInputVoicePanel
                  mode={voiceMode}
                  value={currentValue}
                  disabled={disabled}
                  leadingAction={leadingAction}
                  onEnd={onVoiceEnd}
                  onCancel={onVoiceCancel}
                  onConfirm={onVoiceConfirm ?? onSubmit}
                />
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {!isExpanded && leadingAction && (
                      <PromptInputMotionSlot transition={transition}>
                        {leadingAction}
                      </PromptInputMotionSlot>
                    )}
                  </AnimatePresence>
                  <motion.div
                    layout
                    transition={transition}
                    className={cn(
                      isExpanded ? "min-h-0 flex-1" : "min-w-0 flex-1",
                      contentClassName
                    )}
                  >
                    {children}
                  </motion.div>
                  <motion.div
                    layout
                    transition={transition}
                    className={cn(
                      isExpanded
                        ? "mt-3 flex items-center justify-between gap-2"
                        : "flex shrink-0 items-center gap-1.5",
                      footerClassName
                    )}
                  >
                    <AnimatePresence initial={false}>
                      {isExpanded && leadingAction && (
                        <PromptInputMotionSlot transition={transition}>
                          {leadingAction}
                        </PromptInputMotionSlot>
                      )}
                    </AnimatePresence>
                    {actions}
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
  PromptInputAction,
  PromptInputCharCount,
}
