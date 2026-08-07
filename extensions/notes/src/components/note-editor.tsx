import { useRef } from "react"
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  Code2,
  Italic,
  List,
  MoreHorizontal,
  Quote,
  Redo2,
  RotateCcw,
  Star,
  Trash2,
  Undo2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CodeMirrorEditor } from "@/components/code-mirror-editor"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/lib/notes"

function IconAction({ label, children, className, ...props }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-8 w-8", className)} aria-label={label} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

function BlankEditor({ onCreate }) {
  return (
    <section className="flex h-full flex-1 items-center justify-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Check className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-semibold">Your thoughts have room here</h2>
        <p className="mx-auto mt-1.5 max-w-64 text-xs leading-5 text-muted-foreground">Select a note from the list or begin with a blank page.</p>
        <Button size="sm" className="mt-4" onClick={onCreate}>Create a note</Button>
      </div>
    </section>
  )
}

export function NoteEditor({ note, onBack, onCreate, onDelete, onRestore, onToggleFavorite, onUpdate }) {
  const editorRef = useRef(null)

  if (!note) return <BlankEditor onCreate={onCreate} />

  const wordCount = note.content.trim() ? note.content.trim().split(/\s+/).length : 0

  const applyFormat = (prefix, suffix = prefix) => {
    editorRef.current?.wrapSelection(prefix, suffix)
  }

  const lineFormat = (prefix) => {
    editorRef.current?.prefixLines(prefix)
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" aria-label="Note editor">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to notes">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>{note.folder}</span>
            <ChevronDown className="h-3 w-3" />
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/75">Edited {formatRelativeTime(note.updatedAt)}</p>
        </div>

        {note.trashed ? (
          <Button variant="outline" size="sm" onClick={onRestore}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </Button>
        ) : (
          <IconAction
            label={note.favorite ? "Remove from favorites" : "Add to favorites"}
            onClick={onToggleFavorite}
            className={note.favorite ? "text-amber-600 hover:text-amber-700 dark:text-amber-300" : undefined}
          >
            <Star className={cn(note.favorite && "fill-current")} />
          </IconAction>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Note options">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!note.trashed && (
              <DropdownMenuItem onClick={onToggleFavorite}>
                <Star className="mr-2 h-4 w-4" /> {note.favorite ? "Unfavorite" : "Favorite"}
              </DropdownMenuItem>
            )}
            {note.trashed && (
              <DropdownMenuItem onClick={onRestore}>
                <RotateCcw className="mr-2 h-4 w-4" /> Restore note
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> {note.trashed ? "Delete forever" : "Move to deleted"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-subtle">
        <article className="mx-auto flex min-h-full w-full max-w-[780px] flex-col px-5 pb-10 pt-9 sm:px-10 sm:pt-12 lg:px-14">
          <input
            value={note.title}
            onChange={(event) => onUpdate({ title: event.target.value })}
            disabled={note.trashed}
            aria-label="Note title"
            placeholder="Untitled note"
            className="w-full border-0 bg-transparent p-0 text-[28px] font-semibold leading-tight tracking-[-0.035em] text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-70 sm:text-[32px]"
          />

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-md px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-none">
                {tag}
              </Badge>
            ))}
            <span className="text-[10px] text-muted-foreground">{wordCount} words</span>
          </div>

          <Separator className="my-7" />

          <CodeMirrorEditor
            key={`${note.id}:${note.trashed}`}
            ref={editorRef}
            value={note.content}
            onChange={(content) => onUpdate({ content })}
            readOnly={note.trashed}
            className="min-h-[360px] flex-1"
          />
        </article>
      </div>

      {!note.trashed && (
        <footer className="flex h-12 shrink-0 items-center gap-0.5 border-t bg-card/70 px-3 sm:px-5">
          <IconAction label="Bold" onClick={() => applyFormat("**")}><Bold /></IconAction>
          <IconAction label="Italic" onClick={() => applyFormat("_")}><Italic /></IconAction>
          <IconAction label="Bulleted list" onClick={() => lineFormat("- ")}><List /></IconAction>
          <IconAction label="Quote" onClick={() => lineFormat("> ")}><Quote /></IconAction>
          <IconAction label="Inline code" onClick={() => applyFormat("`")}><Code2 /></IconAction>
          <Separator orientation="vertical" className="mx-2 h-5" />
          <IconAction label="Undo" onClick={() => editorRef.current?.undo()}><Undo2 /></IconAction>
          <IconAction label="Redo" onClick={() => editorRef.current?.redo()}><Redo2 /></IconAction>
          <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground sm:flex">
            <Check className="h-3 w-3" /> Saved locally
          </span>
        </footer>
      )}
    </section>
  )
}
