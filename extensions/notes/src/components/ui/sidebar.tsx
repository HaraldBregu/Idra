import * as React from "react"

import { cn } from "@/lib/utils"

const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { width?: number }
>(({ className, style, width, ...props }, ref) => (
  <aside
    ref={ref}
    className={cn("relative hidden h-full shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block", className)}
    style={{ width, ...style }}
    {...props}
  />
))
Sidebar.displayName = "Sidebar"

const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-full w-full flex-col", className)} {...props} />
  ),
)
SidebarContent.displayName = "SidebarContent"

const SidebarResizeHandle = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label="Resize sidebar"
      className={cn(
        "absolute inset-y-0 right-[-4px] z-10 w-2 cursor-col-resize touch-none",
        "after:absolute after:inset-y-3 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-sidebar-border",
        "hover:after:bg-sidebar-foreground/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/50",
        className,
      )}
      {...props}
    />
  ),
)
SidebarResizeHandle.displayName = "SidebarResizeHandle"

export { Sidebar, SidebarContent, SidebarResizeHandle }
