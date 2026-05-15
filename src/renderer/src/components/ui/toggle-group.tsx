"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group"
import * as React from "react"

import { cn } from "@/lib/utils"

type ToggleGroupBaseProps = Omit<
  React.ComponentProps<typeof ToggleGroupPrimitive>,
  "value" | "defaultValue" | "onValueChange" | "multiple"
>

type ToggleGroupProps =
  | (ToggleGroupBaseProps & {
      type?: "single"
      value?: string
      defaultValue?: string
      onValueChange?: (value: string) => void
    })
  | (ToggleGroupBaseProps & {
      type: "multiple"
      value?: string[]
      defaultValue?: string[]
      onValueChange?: (value: string[]) => void
    })

function toPrimitiveValue(value: string | string[] | undefined): string[] | undefined {
  if (value === undefined) return undefined
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function ToggleGroup({
  className,
  type = "single",
  value,
  defaultValue,
  onValueChange,
  ...props
}: ToggleGroupProps) {
  const multiple = type === "multiple"
  const handleValueChange = (nextValue: string[]) => {
    if (multiple) {
      const handleMultipleValueChange = onValueChange as
        | ((value: string[]) => void)
        | undefined
      handleMultipleValueChange?.(nextValue)
      return
    }

    const handleSingleValueChange = onValueChange as
      | ((value: string) => void)
      | undefined
    handleSingleValueChange?.(nextValue[0] ?? "")
  }

  return (
    <ToggleGroupPrimitive
      multiple={multiple}
      value={toPrimitiveValue(value)}
      defaultValue={toPrimitiveValue(defaultValue)}
      onValueChange={handleValueChange}
      className={cn("flex w-fit items-center gap-1", className)}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none select-none hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[pressed]:bg-background data-[pressed]:text-foreground data-[pressed]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
