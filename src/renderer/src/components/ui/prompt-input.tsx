"use client"

import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip"
import { cn } from "@/lib/utils"
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
} & React.ComponentProps<"div">

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
    <TooltipProvider>
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
            <div
              onClick={handleClick}
              data-expanded={isExpanded}
              className={cn(
                "cursor-text border border-border/60 bg-card/95 text-foreground shadow-sm shadow-foreground/5 transition-[border-radius,min-height,padding,gap] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] focus-within:ring-1 focus-within:ring-ring/25",
                isExpanded
                  ? "flex max-h-[min(48vh,30rem)] min-h-36 flex-col rounded-lg px-4 py-3"
                  : "flex min-h-12 items-center gap-2 rounded-lg px-3 py-1.5",
                disabled && "cursor-not-allowed opacity-60",
                className
              )}
              {...props}
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
            </div>
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
            ? "max-h-[34vh] min-h-24 overflow-y-auto py-0"
            : "h-8 min-h-8 overflow-hidden py-1"),
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
