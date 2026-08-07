import { starterNotes } from "@/lib/notes"

// The host injects window.notes (the NotesApi). Everything below the `localNotes`
// fallback exists only so the widget still runs standalone in dev, preview, and tests.
// ponytail: localStorage fallback mirrors the old persistence; delete it if the host is always present.
const KEY = "friday-notes:v1"

function read() {
  try {
    const stored = localStorage.getItem(KEY)
    return stored ? JSON.parse(stored) : starterNotes
  } catch {
    return starterNotes
  }
}

function write(notes) {
  localStorage.setItem(KEY, JSON.stringify(notes))
}

const localNotes = {
  async list() {
    return read()
  },
  async get(id) {
    return read().find((note) => note.id === id)
  },
  async create(input) {
    const note = { tags: [], favorite: false, trashed: false, ...input, id: crypto.randomUUID(), updatedAt: Date.now() }
    write([note, ...read()])
    return note
  },
  async update(id, updates) {
    let updated
    write(
      read().map((note) => {
        if (note.id !== id) return note
        updated = { ...note, ...updates, updatedAt: Date.now() }
        return updated
      }),
    )
    return updated
  },
  async delete(id) {
    const before = read()
    const after = before.filter((note) => note.id !== id)
    write(after)
    return after.length !== before.length
  },
}

// The host NotesApi stores only { title, content, metadata }; the widget's extra
// fields (folder/tags/favorite/trashed) live inside metadata, and updatedAt is an
// ISO string host-side but a number widget-side. Adapt at this seam.
function fromHost(note) {
  const meta = note.metadata ?? {}
  return {
    id: note.id,
    title: note.title,
    content: note.content ?? "",
    folder: meta.folder ?? "Ideas",
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    favorite: Boolean(meta.favorite),
    trashed: Boolean(meta.trashed),
    updatedAt: note.updatedAt ? new Date(note.updatedAt).getTime() : Date.now(),
  }
}

function metaFrom(fields) {
  const meta = {}
  for (const key of ["folder", "tags", "favorite", "trashed"]) {
    if (fields[key] !== undefined) meta[key] = fields[key]
  }
  return meta
}

// Resolve per-call so a host that injects window.notes after this module loads still wins.
const host = () => globalThis.window?.notes

const hostApi = {
  list: async () => (await host().list()).map(fromHost),
  get: async (id) => {
    const note = await host().get(id)
    return note ? fromHost(note) : note
  },
  create: async (input) =>
    fromHost(await host().create({ title: input.title, content: input.content, metadata: metaFrom(input) })),
  update: async (id, updates) => {
    // Host replaces metadata wholesale, so merge onto the current note's metadata.
    const current = await host().get(id)
    const sent = { metadata: { ...(current?.metadata ?? {}), ...metaFrom(updates) } }
    if (updates.title !== undefined) sent.title = updates.title
    if (updates.content !== undefined) sent.content = updates.content
    const note = await host().update(id, sent)
    return note ? fromHost(note) : note
  },
  delete: (id) => host().delete(id),
}

const api = () => (host() ? hostApi : localNotes)

export const notesApi = {
  list: () => api().list(),
  get: (id) => api().get(id),
  create: (input) => api().create(input),
  update: (id, updates) => api().update(id, updates),
  delete: (id) => api().delete(id),
}
