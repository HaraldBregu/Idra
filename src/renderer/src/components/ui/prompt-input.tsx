"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"
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
        "relative h-16 min-w-0 overflow-hidden rounded-[2rem] bg-white/[0.055] shadow-inner",
        muted && "bg-white/[0.045]"
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
            stroke={
              mode === "dictation"
                ? "rgba(129, 178, 255, 0.74)"
                : "rgba(126, 160, 255, 0.82)"
            }
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0.72, opacity: 0.52 }}
            animate={{ pathLength: [0.72, 1, 0.8], opacity: [0.45, 0.9, 0.55] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M30 35 C88 62 116 22 173 38 C225 53 274 48 323 22 C377 -6 419 55 474 46 C533 36 555 12 604 40"
            fill="none"
            stroke="rgba(142, 211, 198, 0.66)"
            strokeWidth="4"
            strokeLinecap="round"
            initial={{ pathLength: 0.82, opacity: 0.36 }}
            animate={{ pathLength: [0.82, 0.62, 1], opacity: [0.34, 0.72, 0.4] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.path
            d="M28 54 C84 20 125 66 190 53 C245 42 296 55 352 45 C414 32 456 10 510 37 C556 61 590 58 622 45"
            fill="none"
            stroke="rgba(135, 117, 217, 0.42)"
            strokeWidth="4"
            strokeLinecap="round"
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
  onEnd,
  onCancel,
  onConfirm,
}: {
  mode: PromptInputVoiceMode
  value: string
  disabled?: boolean
  onEnd?: () => void
  onCancel?: () => void
  onConfirm?: () => void
}) {
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
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="grid w-full cursor-default grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[2rem] border border-white/10 bg-[#202024] px-3 py-3 text-white shadow-[0_22px_70px_rgba(0,0,0,0.46)] sm:grid-cols-[3.25rem_minmax(0,1fr)_auto] sm:gap-x-4 sm:rounded-[2.25rem] sm:px-4"
    >
      <div
        className={cn(
          "row-span-2 flex size-11 items-center justify-center rounded-full shadow-[0_0_34px_rgba(101,132,255,0.34)] sm:size-12",
          isDictation
            ? "bg-[#f35f54]/15 shadow-[0_0_28px_rgba(243,95,84,0.22)]"
            : isMuted
            ? "bg-[#747b99]/18 shadow-none"
            : "bg-[#6f8cff]/20"
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "block rounded-full",
            isDictation
              ? "size-4 bg-[#ed5b50]"
              : isMuted
              ? "size-8 bg-gradient-to-br from-[#9096a8] to-[#58617f] opacity-75"
              : "size-9 bg-[radial-gradient(circle_at_35%_25%,#b9c8ff,#7190ff_58%,#556be7)] shadow-[0_0_0_3px_rgba(255,255,255,0.08),0_0_26px_rgba(111,140,255,0.82)]"
          )}
        />
      </div>
      <div className="min-w-0 self-end">
        <div className="flex items-center gap-2 truncate text-[0.72rem] font-bold uppercase tracking-[0.32em] text-white/52 sm:text-sm">
          <span className="truncate">{status}</span>
          <span className="text-white/34">·</span>
          <span className="font-mono tracking-[0.12em]">
            {formatVoiceDuration(elapsedSeconds)}
          </span>
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-lg font-semibold leading-tight tracking-normal sm:text-2xl",
            isMuted ? "text-white/48" : "text-white/92"
          )}
        >
          {spokenText}
        </p>
      </div>
      <div className="row-span-2 flex shrink-0 items-center gap-2 sm:gap-3">
        {isDictation ? (
          <>
            <button
              type="button"
              aria-label="Cancel dictation"
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onCancel)}
              className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.055] text-white/74 transition hover:bg-white/[0.085] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72b8ff]/55 disabled:pointer-events-none disabled:opacity-50 sm:size-14"
            >
              <X className="size-6" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              aria-label="Confirm dictation"
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onConfirm)}
              className="flex size-12 items-center justify-center rounded-full bg-[#67b4ff] text-white shadow-[0_0_30px_rgba(103,180,255,0.44)] transition hover:bg-[#7dc1ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9dd2ff]/70 disabled:pointer-events-none disabled:opacity-50 sm:size-16"
            >
              <Check className="size-7" strokeWidth={2.8} />
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
                "flex size-12 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 sm:size-14",
                isMuted
                  ? "border-[#ee695d]/45 bg-[#ee695d]/16 text-[#ff7c70] focus-visible:ring-[#ee695d]/50"
                  : "border-white/10 bg-white/[0.055] text-white/74 hover:bg-white/[0.085] hover:text-white focus-visible:ring-[#7fa1ff]/55"
              )}
            >
              {isMuted ? (
                <MicOff className="size-6" strokeWidth={2.4} />
              ) : (
                <Mic className="size-6" strokeWidth={2.2} />
              )}
            </button>
            <button
              type="button"
              aria-label="End voice conversation"
              disabled={disabled}
              onClick={(event) => handleButtonClick(event, onEnd)}
              className="flex h-12 items-center gap-2 rounded-full bg-[#5c83f6] px-5 text-base font-bold text-white shadow-[0_0_32px_rgba(92,131,246,0.5)] transition hover:bg-[#6d91ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bb5ff]/70 disabled:pointer-events-none disabled:opacity-50 sm:h-14 sm:px-6 sm:text-xl"
            >
              <MoreHorizontal className="size-6" strokeWidth={3} />
              <span>End</span>
            </button>
          </>
        )}
      </div>
      <PromptInputVoiceWaveform muted={isMuted} mode={mode} />
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
              onClick={handleClick}
              data-expanded={isExpanded}
              className={cn(
                "cursor-text border border-border/60 bg-card/95 text-foreground shadow-sm shadow-foreground/5 focus-within:ring-1 focus-within:ring-ring/25",
                isExpanded
                  ? "flex max-h-[min(48vh,30rem)] min-h-24 flex-col rounded-xl px-4 py-3"
                  : "flex min-h-10 items-center gap-2 rounded-full p-1.5",
                disabled && "cursor-not-allowed opacity-60",
                className
              )}
              {...(props as React.ComponentProps<typeof motion.div>)}
            >
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
