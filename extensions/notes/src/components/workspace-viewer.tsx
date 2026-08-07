import { ArrowLeft, FileText } from "lucide-react"

import { CodeMirrorEditor } from "@/components/code-mirror-editor"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface WorkspaceViewerProps {
  content: string
  error: string
  loading: boolean
  onOpenMenu: () => void
  path: string | null
}

export function WorkspaceViewer({ content, error, loading, onOpenMenu, path }: WorkspaceViewerProps) {
  if (!path) {
    return (
      <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background" aria-label="Workspace file">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label="Open sidebar">
            <ArrowLeft />
          </Button>
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
              Choose a workspace file to read its content here.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" aria-label="Workspace file">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label="Open sidebar">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.025em]">{path.split(/[\\/]/).pop()}</h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{path}</p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
        <article className="mx-auto flex min-h-full w-full max-w-[900px] flex-col px-5 pb-10 pt-7 sm:px-8 lg:px-10">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading file...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : (
            <>
              <Separator className="mb-5" />
              <CodeMirrorEditor value={content} onChange={() => undefined} readOnly className="min-h-[420px] flex-1" />
            </>
          )}
        </article>
      </div>
    </section>
  )
}
