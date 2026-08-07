import {
  Archive,
  Check,
  FileText,
  Lightbulb,
  Moon,
  Plus,
  Search,
  Star,
  Sun,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { folders } from "@/lib/notes"

const primaryItems = [
  { id: "all", label: "All notes", icon: FileText },
  { id: "favorites", label: "Favorites", icon: Star },
]

function SidebarItem({ active, count, icon: Icon, label, onClick }) {
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

export function AppSidebar({ activeView, counts, darkMode, onCreate, onThemeChange, onViewChange }) {
  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-3 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-foreground text-sidebar">
          <Archive className="h-[17px] w-[17px]" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.02em]">Fieldnotes</p>
          <p className="text-[11px] text-sidebar-muted">Local workspace</p>
        </div>
      </div>

      <div className="px-4 pb-5">
        <Button
          onClick={onCreate}
          className="h-9 w-full justify-start bg-sidebar-foreground px-3 text-sidebar shadow-none hover:bg-sidebar-foreground/90"
        >
          <Plus className="h-4 w-4" />
          New note
          <span className="ml-auto text-[10px] font-medium opacity-55">⌘ N</span>
        </Button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 scrollbar-subtle" aria-label="Notes navigation">
        <div className="space-y-0.5">
          {primaryItems.map((item) => (
            <SidebarItem
              key={item.id}
              {...item}
              active={activeView === item.id}
              count={counts[item.id]}
              onClick={() => onViewChange(item.id)}
            />
          ))}
          <SidebarItem
            active={activeView === "search"}
            count={counts.all}
            icon={Search}
            label="Search"
            onClick={() => onViewChange("search")}
          />
        </div>

        <div className="mb-2 mt-7 flex items-center justify-between px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">Notebooks</p>
          <Plus className="h-3.5 w-3.5 text-sidebar-muted" aria-hidden="true" />
        </div>
        <div className="space-y-0.5">
          {folders.map((folder) => (
            <button
              type="button"
              key={folder.name}
              onClick={() => onViewChange(`folder:${folder.name}`)}
              aria-current={activeView === `folder:${folder.name}` ? "page" : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium text-sidebar-muted transition-colors",
                "hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/50",
                activeView === `folder:${folder.name}` && "bg-sidebar-accent text-sidebar-foreground",
              )}
            >
              <span className={cn("h-2 w-2 rounded-sm", folder.color)} />
              <span className="flex-1">{folder.name}</span>
              <span className="text-[11px] tabular-nums text-sidebar-muted">{counts[folder.name]}</span>
            </button>
          ))}
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
        <button
          type="button"
          onClick={onThemeChange}
          className="mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-foreground">
            {darkMode ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          </span>
          <span className="flex-1">
            <span className="block font-medium text-sidebar-foreground">{darkMode ? "Dark mode" : "Light mode"}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[10px]">
              <Check className="h-3 w-3" /> Saved locally
            </span>
          </span>
          <Lightbulb className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
