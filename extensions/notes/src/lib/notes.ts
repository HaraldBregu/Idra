const now = Date.now()

export const starterNotes = [
  {
    id: "quiet-interface",
    title: "Designing for calm",
    content:
      "Good tools should lower the volume.\n\nLeave room for the work itself. Keep actions close at hand, make hierarchy obvious, and let empty space do some of the explaining.\n\nA useful test: can someone return after a week and know exactly where they left off?",
    folder: "Ideas",
    tags: ["design", "principles"],
    favorite: true,
    trashed: false,
    updatedAt: now - 1000 * 60 * 18,
  },
  {
    id: "launch-notes",
    title: "Launch notes",
    content:
      "Tuesday release checklist\n\n- Final pass on the onboarding copy\n- Record the two-minute walkthrough\n- Confirm support coverage\n- Send the release note at 10:00\n\nKeep the announcement focused on the faster capture flow.",
    folder: "Work",
    tags: ["launch"],
    favorite: true,
    trashed: false,
    updatedAt: now - 1000 * 60 * 52,
  },
  {
    id: "weekly-reset",
    title: "Sunday reset",
    content:
      "A small reset for the week ahead.\n\n1. Clear the desk\n2. Pick three priorities\n3. Plan simple dinners\n4. Put one quiet hour on the calendar",
    folder: "Personal",
    tags: ["routine"],
    favorite: false,
    trashed: false,
    updatedAt: now - 1000 * 60 * 60 * 4,
  },
  {
    id: "product-decisions",
    title: "Product decisions · July",
    content:
      "Decisions from the July product review.\n\n- Keep quick capture available from every screen\n- Ship local-first storage before collaboration\n- Use folders for broad structure and tags for context\n\nOpen question: should archived notes appear in global search?",
    folder: "Work",
    tags: ["product", "decisions"],
    favorite: false,
    trashed: false,
    updatedAt: now - 1000 * 60 * 60 * 23,
  },
  {
    id: "reading-list",
    title: "Reading list",
    content:
      "Books and essays to return to:\n\n- The Creative Act\n- Ways of Seeing\n- The Shape of Design\n- Ursula K. Le Guin's steering the craft notes",
    folder: "Personal",
    tags: ["books"],
    favorite: false,
    trashed: false,
    updatedAt: now - 1000 * 60 * 60 * 27,
  },
  {
    id: "field-notes",
    title: "Field notes: better capture",
    content:
      "Capture should be instant, organization can come later. A blank note needs a cursor, not a form.\n\nExplore an inbox that gently empties as notes find a home.",
    folder: "Ideas",
    tags: ["research"],
    favorite: false,
    trashed: false,
    updatedAt: now - 1000 * 60 * 60 * 46,
  },
  {
    id: "old-outline",
    title: "Old homepage outline",
    content: "Previous outline kept here in case the positioning language becomes useful again.",
    folder: "Work",
    tags: ["archive"],
    favorite: false,
    trashed: true,
    updatedAt: now - 1000 * 60 * 60 * 24 * 8,
  },
]

export const folders = [
  { name: "Work", color: "bg-amber-400" },
  { name: "Personal", color: "bg-rose-300" },
  { name: "Ideas", color: "bg-sky-300" },
]

export function formatRelativeTime(timestamp) {
  // Host notes may send updatedAt as an ISO string (or omit it); normalize both, guard NaN.
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return "just now"

  const difference = time - Date.now()
  const minutes = Math.round(difference / (1000 * 60))

  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(minutes, "minute")
  }

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(hours, "hour")
  }

  const days = Math.round(hours / 24)
  if (Math.abs(days) < 7) {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(days, "day")
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(time)
}

export function notePreview(content) {
  return content.replace(/[#>*_`-]/g, "").replace(/\s+/g, " ").trim() || "No additional text"
}
