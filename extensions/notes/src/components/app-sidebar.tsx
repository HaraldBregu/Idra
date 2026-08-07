import {
  Archive,
  ChevronRight,
  File,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState, type ComponentType } from "react"
import type { WorkspaceTreeEntry } from "@friday/sdk"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export type ViewId = "all" | "favorites" | "search" | "trash"

type Counts = Record<string, number>

interface SidebarItemProps {
  active: boolean
  count: number
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  onClick: () => void
}

function SidebarItem({ active, count, icon: Icon, label, onClick }: SidebarItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium text-sidebar-muted transition-colors",
        "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/50",
        active && "bg-sidebar-accent text-sidebar-foreground",
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={1.8} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-[11px] tabular-nums text-sidebar-muted group-hover:text-sidebar-foreground/70">
        {count}
      </span>
    </button>
  )
}

function WorkspaceTree({
  expanded,
  files,
  loading,
  error,
  onSelect,
  onToggle,
  selectedPath,
}: {
  expanded: Set<string>
  files: WorkspaceTreeEntry[]
  loading: boolean
  error: string
  onSelect: (entry: WorkspaceTreeEntry) => void
  onToggle: (path: string) => void
  selectedPath: string | null
}) {
  if (loading) return <div className="px-8 py-2 text-[12px] text-sidebar-muted">Loading workspace...</div>
  if (error) return <div className="px-8 py-2 text-[12px] leading-5 text-sidebar-muted">{error}</div>
  if (files.length === 0) return <div className="px-8 py-2 text-[12px] text-sidebar-muted">No files</div>

  return (
    <ul className="mt-1 space-y-0.5 border-l border-sidebar-border/70 pl-2 ml-4">
      {files.map((entry) => (
        <WorkspaceTreeItem
          key={entry.path}
          depth={0}
          entry={entry}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          selectedPath={selectedPath}
        />
      ))}
    </ul>
  )
}

interface AppSidebarProps {
  activeView: ViewId | `folder:${string}`
  counts: Counts
  onCreate: () => void
  onViewChange: (view: ViewId | `folder:${string}`) => void
  onWorkspaceSelect: (entry: WorkspaceTreeEntry) => void
  selectedWorkspacePath: string | null
  workspaceError: string
  workspaceFiles: WorkspaceTreeEntry[]
  workspaceLoading: boolean
  workspaceLocation: string
}

function collectDirectoryPaths(entries: WorkspaceTreeEntry[]): string[] {
  return entries.flatMap((entry) =>
    entry.type === "directory" ? [entry.path, ...collectDirectoryPaths(entry.children ?? [])] : [],
  )
}

function WorkspaceTreeItem({
  depth,
  entry,
  expanded,
  onToggle,
  onSelect,
  selectedPath,
}: {
  depth: number
  entry: WorkspaceTreeEntry
  expanded: Set<string>
  onToggle: (path: string) => void
  onSelect: (entry: WorkspaceTreeEntry) => void
  selectedPath: string | null
}) {
  const isDirectory = entry.type === "directory"
  const isExpanded = expanded.has(entry.path)
  const selected = selectedPath === entry.path
  const Icon = isDirectory ? (isExpanded ? FolderOpen : Folder) : File

  return (
    <li>
      <button
        type="button"
        onClick={() => {
          if (isDirectory) onToggle(entry.path)
          onSelect(entry)
        }}
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-current={selected ? "page" : undefined}
        title={entry.path}
        className={cn(
          "flex h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-[12px] font-medium text-sidebar-muted transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/50",
          selected && "bg-sidebar-accent text-sidebar-foreground",
        )}
        style={{ paddingLeft: `${10 + depth * 12}px` }}
      >
        {isDirectory ? (
          <ChevronRight
            className={cn("h-3.5 w-3.5 shrink-0 transition-transform", isExpanded && "rotate-90")}
            strokeWidth={1.8}
          />
        ) : (
          <span className="h-3.5 w-3.5 shrink-0" />
        )}
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
      </button>
      {isDirectory && isExpanded && entry.children && entry.children.length > 0 ? (
        <ul className="mt-0.5 space-y-0.5">
          {entry.children.map((child) => (
            <WorkspaceTreeItem
              key={child.path}
              depth={depth + 1}
              entry={child}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function AppSidebar({
  activeView,
  counts,
  onCreate,
  onViewChange,
  onWorkspaceSelect,
  selectedWorkspacePath,
  workspaceError,
  workspaceFiles,
  workspaceLoading,
  workspaceLocation,
}: AppSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const workspaceName = useMemo(() => {
    if (!workspaceLocation) return "Workspace"
    return workspaceLocation.split(/[\\/]/).filter(Boolean).pop() ?? workspaceLocation
  }, [workspaceLocation])

  useEffect(() => {
    setExpanded(new Set(collectDirectoryPaths(workspaceFiles)))
  }, [workspaceFiles])

  function toggleDirectory(path: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-3 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground text-sidebar">
          <Archive className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">Fieldnotes</p>
          <p className="truncate text-[11px] text-sidebar-muted">{workspaceName}</p>
        </div>
      </div>

      <div className="px-4 pb-5">
        <Button
          onClick={onCreate}
          className="h-9 w-full justify-start bg-sidebar-foreground px-3 text-sidebar shadow-none hover:bg-sidebar-foreground/90"
        >
          <Plus className="h-4 w-4" />
          New note
          <span className="ml-auto text-[10px] font-medium opacity-55">Cmd N</span>
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-subtle" aria-label="Notes navigation">
        <div className="space-y-0.5">
          <SidebarItem
            active={activeView === "all"}
            count={counts.all}
            icon={FileText}
            label="All notes"
            onClick={() => onViewChange("all")}
          />
          <WorkspaceTree
            expanded={expanded}
            files={workspaceFiles}
            loading={workspaceLoading}
            error={workspaceError}
            onToggle={toggleDirectory}
            onSelect={onWorkspaceSelect}
            selectedPath={selectedWorkspacePath}
          />
          <SidebarItem
            active={activeView === "favorites"}
            count={counts.favorites}
            icon={Star}
            label="Favorites"
            onClick={() => onViewChange("favorites")}
          />
          <SidebarItem
            active={activeView === "search"}
            count={counts.all}
            icon={Search}
            label="Search"
            onClick={() => onViewChange("search")}
          />
        </div>
      </nav>

      <div className="p-3 pt-0">
        <Separator className="mb-3 bg-sidebar-border" />
        <SidebarItem
          active={activeView === "trash"}
          count={counts.trash}
          icon={Trash2}
          label="Recently deleted"
          onClick={() => onViewChange("trash")}
        />
      </div>
    </div>
  )
}
