import { Bot, ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { useMemo, useState } from "react"
import type { WorkspaceTreeEntry } from "@friday/sdk"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { showNativeContextMenu } from "@/lib/menu"
import { collectDirectoryPaths } from "@/lib/tree"

const agentFilePaths = ["AGENTS.md", "HEALTH.md", "IDENTITY.md", "MEMORY.md", "SOUL.md", "USER.md"] as const
const agentFilePathSet = new Set<string>(agentFilePaths)

function WorkspaceTree({
  expanded,
  files,
  loading,
  error,
  onDeleteRequest,
  onSelect,
  onToggle,
  selectedPath,
  showEmpty,
}: {
  expanded: Set<string>
  files: WorkspaceTreeEntry[]
  loading: boolean
  error: string
  onDeleteRequest: (entry: WorkspaceTreeEntry) => void
  onSelect: (entry: WorkspaceTreeEntry) => void
  onToggle: (path: string) => void
  selectedPath: string | null
  showEmpty: boolean
}) {
  return (
    <div>
      {loading ? (
        <div className="px-3 py-2 text-[12px] text-sidebar-muted">Loading files...</div>
      ) : error ? (
        <div className="px-3 py-2 text-[12px] leading-5 text-sidebar-muted">{error}</div>
      ) : files.length === 0 && showEmpty ? (
        <div className="px-3 py-2 text-[12px] text-sidebar-muted">No files</div>
      ) : (
        <ul>
          {files.map((entry) => (
            <WorkspaceTreeItem
              key={entry.path}
              depth={0}
              entry={entry}
              expanded={expanded}
              onDeleteRequest={onDeleteRequest}
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
  onDeleteRequest: (entry: WorkspaceTreeEntry) => void
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
  onDeleteRequest,
  onToggle,
  onSelect,
  selectedPath,
}: {
  depth: number
  entry: WorkspaceTreeEntry
  expanded: Set<string>
  onDeleteRequest: (entry: WorkspaceTreeEntry) => void
  onToggle: (path: string) => void
  onSelect: (entry: WorkspaceTreeEntry) => void
  selectedPath: string | null
}) {
  const isDirectory = entry.type === "directory"
  const isExpanded = expanded.has(entry.path)
  const selected = selectedPath === entry.path
  const Icon = isDirectory ? (isExpanded ? FolderOpen : Folder) : File

  const trigger = (
      <Button
        type="button"
        variant="ghost"
        size="sm"
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
              ...(!isDirectory
                ? ([{ type: "separator" }, { id: "delete", label: "Delete File" }] as const)
                : []),
            ],
            {
              toggle: () => onToggle(entry.path),
              open: () => onSelect(entry),
              "copy-path": () => navigator.clipboard.writeText(entry.path),
              delete: () => onDeleteRequest(entry),
            },
          )
        }}
        onClick={() => {
          if (!isDirectory) onSelect(entry)
        }}
        onKeyDown={(event) => {
          if (!isDirectory && (event.key === "Backspace" || event.key === "Delete")) {
            event.preventDefault()
            onDeleteRequest(entry)
          }
        }}
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-current={selected ? "page" : undefined}
        aria-keyshortcuts={!isDirectory ? "Backspace Delete" : undefined}
        title={entry.path}
        className={cn(
          "h-7 w-full justify-start gap-1.5 px-0 pr-2 text-left text-[12px] font-medium text-sidebar-muted",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-0",
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
      </Button>
  )

  if (!isDirectory) return <li>{trigger}</li>

  return (
    <Collapsible asChild open={isExpanded} onOpenChange={() => onToggle(entry.path)}>
      <li>
        <CollapsibleTrigger asChild>{trigger}</CollapsibleTrigger>
        <CollapsibleContent asChild>
          <ul>
          {entry.children?.map((child) => (
            <WorkspaceTreeItem
              key={child.path}
              depth={depth + 1}
              entry={child}
              expanded={expanded}
              onDeleteRequest={onDeleteRequest}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
          </ul>
        </CollapsibleContent>
      </li>
    </Collapsible>
  )
}

export function AppSidebar({
  onDeleteRequest,
  onWorkspaceSelect,
  selectedWorkspacePath,
  workspaceError,
  workspaceFiles,
  workspaceLoading,
  workspaceLocation,
}: AppSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [agentExpanded, setAgentExpanded] = useState(false)
  const agentFiles = useMemo(
    () =>
      agentFilePaths.flatMap((path) => {
        const entry = workspaceFiles.find((candidate) => candidate.type === "file" && candidate.path === path)
        return entry ? [entry] : []
      }),
    [workspaceFiles],
  )
  const regularFiles = useMemo(
    () => workspaceFiles.filter((entry) => !agentFilePathSet.has(entry.path)),
    [workspaceFiles],
  )
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
            { id: "expand-all", label: "Expand All", enabled: regularFiles.length > 0 || agentFiles.length > 0 },
            { id: "collapse-all", label: "Collapse All", enabled: expanded.size > 0 || agentExpanded },
            { type: "separator" },
            { id: "copy-workspace-path", label: "Copy Workspace Path", enabled: Boolean(workspaceLocation) },
          ],
          {
            "expand-all": () => {
              setExpanded(collectDirectoryPaths(regularFiles))
              setAgentExpanded(agentFiles.length > 0)
            },
            "collapse-all": () => {
              setExpanded(new Set())
              setAgentExpanded(false)
            },
            "copy-workspace-path": () => navigator.clipboard.writeText(workspaceLocation),
          },
        )
      }}
    >
      <header
        className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border/70 px-4"
        title={workspaceLocation || workspaceName}
      >
        <FolderOpen className="h-4 w-4 shrink-0 text-sidebar-muted" strokeWidth={1.8} />
        <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]">
          {workspaceName}
        </h1>
      </header>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scrollbar-subtle" aria-label="Workspace files">
        {!workspaceLoading && !workspaceError && agentFiles.length > 0 ? (
          <Collapsible open={agentExpanded} onOpenChange={setAgentExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-full justify-start gap-1.5 px-2 text-[12px] font-semibold text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring focus-visible:ring-offset-0"
                onContextMenu={(event) => {
                  showNativeContextMenu(
                    event,
                    [{ id: "toggle-agent", label: agentExpanded ? "Collapse Agent" : "Expand Agent" }],
                    { "toggle-agent": () => setAgentExpanded((current) => !current) },
                  )
                }}
              >
                <ChevronRight
                  className={cn("h-3.5 w-3.5 shrink-0 transition-transform", agentExpanded && "rotate-90")}
                  strokeWidth={1.8}
                />
                <Bot className="h-3.5 w-3.5 shrink-0 text-sidebar-muted" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-left">Agent</span>
                <Badge variant="secondary" className="h-4 border-0 bg-sidebar-accent px-1.5 text-[10px] text-sidebar-foreground">
                  {agentFiles.length}
                </Badge>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul>
                {agentFiles.map((entry) => (
                  <WorkspaceTreeItem
                    key={entry.path}
                    depth={1}
                    entry={entry}
                    expanded={expanded}
                    onDeleteRequest={onDeleteRequest}
                    onToggle={toggleDirectory}
                    onSelect={onWorkspaceSelect}
                    selectedPath={selectedWorkspacePath}
                  />
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
        <WorkspaceTree
          expanded={expanded}
          files={regularFiles}
          loading={workspaceLoading}
          error={workspaceError}
          onDeleteRequest={onDeleteRequest}
          onToggle={toggleDirectory}
          onSelect={onWorkspaceSelect}
          selectedPath={selectedWorkspacePath}
          showEmpty={agentFiles.length === 0}
        />
      </nav>
    </div>
  )
}
