import { useEffect, useRef } from "react"
import { FileText } from "lucide-react"

import { CodeMirrorEditor } from "@/components/code-mirror-editor"
import { Separator } from "@/components/ui/separator"

interface WorkspaceViewerProps {
  content: string
  error: string
  loading: boolean
  path: string | null
}

export function WorkspaceViewer({ content, error, loading, path }: WorkspaceViewerProps) {
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section || !path) return undefined

    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.metaKey && !event.ctrlKey) || event.key.toLowerCase() !== "c") return
      const selection = window.getSelection()?.toString()
      if (selection) return
      event.preventDefault()
      void navigator.clipboard?.writeText(content)
    }

    section.addEventListener("keydown", onKeyDown)
    return () => section.removeEventListener("keydown", onKeyDown)
  }, [content, path])

  if (!path) {
    return (
      <section ref={sectionRef} className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background" aria-label="Workspace file">
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
              Choose a workspace file to read its content here.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" aria-label="Workspace file" tabIndex={0}>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
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
