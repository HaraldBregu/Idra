import { AlertCircle, Check, FileText, LoaderCircle, Save } from "lucide-react"
import type { WorkspaceFileKind } from "@friday/sdk"

import { FileViewer } from "@/components/viewer"
import { Button } from "@/components/ui/button"
import { showNativeContextMenu } from "@/lib/menu"

interface WorkspaceViewerProps {
  content: string
  dirty: boolean
  error: string
  kind: WorkspaceFileKind | null
  loading: boolean
  mediaUrl: string
  onChange: (content: string) => void
  onSave: () => Promise<boolean>
  path: string | null
  saveError: string
  saving: boolean
}

export function WorkspaceViewer({
  content,
  dirty,
  error,
  kind,
  loading,
  mediaUrl,
  onChange,
  onSave,
  path,
  saveError,
  saving,
}: WorkspaceViewerProps) {
  if (!path || !kind) {
    return (
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background" aria-label="Workspace file">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-semibold tracking-[-0.025em]">Workspace</h1>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Select a file from the sidebar.</p>
          </div>
        </header>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-sm font-semibold">No file selected</h2>
            <p className="mx-auto mt-1.5 max-w-64 text-xs leading-5 text-muted-foreground">
              Choose a workspace file to view or edit it here.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background"
      aria-label="Workspace file"
      onContextMenu={(event) => {
        showNativeContextMenu(
          event,
          [
            ...(kind === "markdown"
              ? [{ id: "save", label: "Save", accelerator: "CommandOrControl+S", enabled: dirty && !saving } as const, { type: "separator" } as const]
              : []),
            { id: "copy-path", label: "Copy Path" },
          ],
          {
            save: () => onSave(),
            "copy-path": () => navigator.clipboard.writeText(path),
          },
        )
      }}
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold tracking-[-0.02em]">{path.split(/[\\/]/).pop()}</h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{path}</p>
        </div>

        {kind === "markdown" && !loading ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex" title={saveError || undefined}>
              {saveError ? <AlertCircle className="h-3.5 w-3.5 text-destructive" /> : saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saveError ? "Save failed" : saving ? "Saving..." : dirty ? "Unsaved" : "Saved"}
            </span>
            <Button variant="outline" size="sm" disabled={!dirty || saving} onClick={() => void onSave()}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
        {loading ? (
          <div className="flex min-h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Loading file...
          </div>
        ) : error ? (
          <div className="flex min-h-full items-center justify-center px-6 text-center">
            <p className="max-w-md text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <FileViewer canSave={dirty && !saving} content={content} kind={kind} onChange={onChange} onSave={onSave} path={path} url={mediaUrl} />
        )}
      </div>
    </section>
  )
}
