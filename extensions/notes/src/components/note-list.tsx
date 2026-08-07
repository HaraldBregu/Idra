import { ArrowDownAZ, Menu, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { formatRelativeTime, notePreview } from "@/lib/notes"

function EmptyList({ activeView, onCreate }) {
  const isTrash = activeView === "trash"

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {isTrash ? <span className="text-lg">Done</span> : <Search className="h-4 w-4" />}
      </div>
      <p className="text-sm font-semibold">{isTrash ? "Nothing in recently deleted" : "No notes found"}</p>
      <p className="mt-1.5 max-w-48 text-xs leading-5 text-muted-foreground">
        {isTrash ? "Deleted notes will appear here." : "Try another search or start a fresh note."}
      </p>
      {!isTrash && (
        <Button size="sm" className="mt-4" onClick={onCreate}>
          <Plus className="h-3.5 w-3.5" /> New note
        </Button>
      )}
    </div>
  )
}

export function NoteList({
  activeView,
  notes,
  onCreate,
  onOpenMenu,
  onSelect,
  search,
  selectedId,
  setSearch,
  setSort,
  sort,
  title,
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-r bg-card/60" aria-label="Note list">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-5">
        <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={onOpenMenu} aria-label="Open sidebar">
          <Menu />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.025em]">{title}</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="List options">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sort notes</div>
            <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
              <DropdownMenuRadioItem value="updated">Recently edited</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" /> New note
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="shrink-0 px-4 pb-3 pt-4 sm:px-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
            className="h-9 bg-background pl-9 pr-9 text-xs shadow-none"
          />
          <SlidersHorizontal className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
        </div>
      </div>

      {notes.length === 0 ? (
        <EmptyList activeView={activeView} onCreate={onCreate} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-20 scrollbar-subtle sm:px-3">
          <div className="space-y-1">
            {notes.map((note) => (
              <button
                type="button"
                key={note.id}
                onClick={() => onSelect(note.id)}
                aria-current={selectedId === note.id ? "true" : undefined}
                className={cn(
                  "group w-full rounded-md border border-transparent px-3 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "hover:bg-muted/70",
                  selectedId === note.id && "border-border bg-background shadow-sm hover:bg-background",
                )}
              >
                <div className="flex items-start gap-2">
                  <h2 className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]">{note.title || "Untitled note"}</h2>
                  {note.favorite && <span className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-300">Star</span>}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-[1.55] text-muted-foreground">
                  {notePreview(note.content)}
                </p>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{formatRelativeTime(note.updatedAt)}</span>
                  <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/60" />
                  <span className="truncate">{note.folder}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center md:hidden">
        <Button onClick={onCreate} className="pointer-events-auto h-10 rounded-full px-4 shadow-soft">
          <Plus className="h-4 w-4" /> New note
        </Button>
      </div>
    </section>
  )
}
