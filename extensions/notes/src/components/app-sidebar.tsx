import { ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { useMemo, useState } from "react"
import type { WorkspaceTreeEntry } from "@friday/sdk"

import { cn } from "@/lib/utils"
import { showNativeContextMenu } from "@/lib/menu"

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
  return (
    <div>
      {loading ? (
        <div className="px-3 py-2 text-[12px] text-sidebar-muted">Loading files...</div>
      ) : error ? (
        <div className="px-3 py-2 text-[12px] leading-5 text-sidebar-muted">{error}</div>
      ) : files.length === 0 ? (
        <div className="px-3 py-2 text-[12px] text-sidebar-muted">No files</div>
      ) : (
        <ul>
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
        onContextMenu={(event) => {
          showNativeContextMenu(
            event,
            [
              {
                id: isDirectory ? "toggle" : "open",
                label: isDirectory ? (isExpanded ? "Collapse" : "Expand") : "Open",
                enabled: !isDirectory || Boolean(entry.children?.length),
              },
              { type: "separator" },
              { id: "copy-path", label: "Copy Path" },
            ],
            {
              toggle: () => onToggle(entry.path),
              open: () => onSelect(entry),
              "copy-path": () => navigator.clipboard.writeText(entry.path),
            },
          )
        }}
        onClick={() => {
          if (isDirectory) onToggle(entry.path)
          else onSelect(entry)
        }}
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-current={selected ? "page" : undefined}
        title={entry.path}
        className={cn(
          "flex h-7 w-full items-center gap-1.5 rounded-md pr-2 text-left text-[12px] font-medium text-sidebar-muted transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/50",
          selected && "bg-sidebar-accent text-sidebar-foreground",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
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
        <ul>
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

  function toggleDirectory(path: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <div
      className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground"
      onContextMenu={(event) => {
        showNativeContextMenu(
          event,
          [
            { id: "copy-workspace-path", label: "Copy Workspace Path", enabled: Boolean(workspaceLocation) },
            { id: "collapse-all", label: "Collapse All", enabled: expanded.size > 0 },
          ],
          {
            "copy-workspace-path": () => navigator.clipboard.writeText(workspaceLocation),
            "collapse-all": () => setExpanded(new Set()),
          },
        )
      }}
    >
      <header
        className="flex h-14 shrink-0 items-center gap-2 px-4"
        title={workspaceLocation || workspaceName}
      >
        <FolderOpen className="h-4 w-4 shrink-0 text-sidebar-muted" strokeWidth={1.8} />
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]">
          {workspaceName}
        </h1>
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-subtle" aria-label="Workspace files">
        <WorkspaceTree
          expanded={expanded}
          files={workspaceFiles}
          loading={workspaceLoading}
          error={workspaceError}
          onToggle={toggleDirectory}
          onSelect={onWorkspaceSelect}
          selectedPath={selectedWorkspacePath}
        />
      </nav>
    </div>
  )
}
