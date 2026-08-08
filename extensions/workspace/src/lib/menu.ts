import { isFriday, win, type ContextMenuDescriptor } from "@friday/sdk"

interface ContextMenuEvent {
  preventDefault: () => void
  stopPropagation: () => void
}

type ContextMenuActions = Record<string, () => void | Promise<void>>

export function showNativeContextMenu(
  event: ContextMenuEvent,
  items: ContextMenuDescriptor[],
  actions: ContextMenuActions = {},
) {
  if (!isFriday()) return
  event.preventDefault()
  event.stopPropagation()
  void win
    .showContextMenu(items)
    .then((action) => (action ? actions[action]?.() : undefined))
    .catch(() => undefined)
}
