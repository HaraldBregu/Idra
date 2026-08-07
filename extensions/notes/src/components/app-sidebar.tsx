import {
  Archive,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import type { WorkspaceTreeEntry } from "@friday/sdk"

import { cn } from "@/lib/utils"

function WorkspaceTree({
  expanded,
  files,
  loading,
  error,
  label,
  onSelect,
  onToggle,
  selectedPath,
}: {
  expanded: Set<string>
  files: WorkspaceTreeEntry[]
  loading: boolean
  error: string
  label: string
  onSelect: (entry: WorkspaceTreeEntry) => void
  onToggle: (path: string) => void
  selectedPath: string | null
}) {
  return (
    <div className="ml-4 mt-1 border-l border-sidebar-border/70 pl-2">
      <div className="flex h-8 items-center gap-2 rounded-md px-2 text-[12px] font-medium text-sidebar-foreground">
        <FolderOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </div>
      {loading ? (
        <div className="px-7 py-2 text-[12px] text-sidebar-muted">Loading files...</div>
      ) : error ? (
        <div className="px-7 py-2 text-[12px] leading-5 text-sidebar-muted">{error}</div>
      ) : files.length === 0 ? (
        <div className="px-7 py-2 text-[12px] text-sidebar-muted">No files</div>
      ) : (
        <ul className="space-y-0.5">
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
      )}
    </div>
  )
}

interface AppSidebarProps {
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

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-subtle" aria-label="Workspace files">
        <WorkspaceTree
          expanded={expanded}
          files={workspaceFiles}
          loading={workspaceLoading}
          error={workspaceError}
          label={workspaceName}
          onToggle={toggleDirectory}
          onSelect={onWorkspaceSelect}
          selectedPath={selectedWorkspacePath}
        />
      </nav>
    </div>
  )
}
