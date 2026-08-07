import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { defaultKeymap, history, historyKeymap, isolateHistory, redo, undo } from "@codemirror/commands"
import { markdown } from "@codemirror/lang-markdown"
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorState } from "@codemirror/state"
import { EditorView, keymap, placeholder } from "@codemirror/view"
import { tags } from "@lezer/highlight"

import { cn } from "@/lib/utils"

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: "600" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: [tags.link, tags.url], color: "var(--primary)", textDecoration: "underline" },
  { tag: tags.monospace, color: "var(--primary)" },
  { tag: [tags.processingInstruction, tags.meta], color: "color-mix(in oklch, var(--muted-foreground) 60%, transparent)" },
])

const noteEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--foreground)",
    fontSize: "15px",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "inherit",
    lineHeight: "1.85",
  },
  ".cm-content": {
    minHeight: "360px",
    padding: "0",
    caretColor: "var(--primary)",
  },
  ".cm-line": {
    padding: "0",
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--primary)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--primary) 16%, transparent) !important",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-placeholder": {
    color: "color-mix(in oklch, var(--muted-foreground) 55%, transparent)",
  },
})

export const CodeMirrorEditor = forwardRef(function CodeMirrorEditor(
  { className, onChange, readOnly = false, value },
  ref,
) {
  const mountRef = useRef(null)
  const viewRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const initialValueRef = useRef(value)
  const initialReadOnlyRef = useRef(readOnly)
  onChangeRef.current = onChange

  useImperativeHandle(
    ref,
    () => ({
      wrapSelection(prefix, suffix = prefix) {
        const view = viewRef.current
        if (!view) return

        const { from, to } = view.state.selection.main
        const selectedText = view.state.sliceDoc(from, to)
        view.dispatch({
          changes: { from, to, insert: `${prefix}${selectedText}${suffix}` },
          selection: { anchor: from + prefix.length, head: to + prefix.length },
          annotations: isolateHistory.of("full"),
          scrollIntoView: true,
        })
        view.focus()
      },
      prefixLines(prefix) {
        const view = viewRef.current
        if (!view) return

        const { from, to } = view.state.selection.main
        const document = view.state.doc
        const startLine = document.lineAt(from).number
        const endLine = document.lineAt(to).number
        const changes = []

        for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
          changes.push({ from: document.line(lineNumber).from, insert: prefix })
        }

        view.dispatch({ changes, annotations: isolateHistory.of("full"), scrollIntoView: true })
        view.focus()
      },
      undo() {
        const view = viewRef.current
        if (!view) return
        undo(view)
        view.focus()
      },
      redo() {
        const view = viewRef.current
        if (!view) return
        redo(view)
        view.focus()
      },
      focus() {
        viewRef.current?.focus()
      },
    }),
    [],
  )

  useEffect(() => {
    if (!mountRef.current) return undefined

    const view = new EditorView({
      doc: initialValueRef.current,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        syntaxHighlighting(markdownHighlight, { fallback: true }),
        EditorView.lineWrapping,
        noteEditorTheme,
        placeholder("Start writing..."),
        EditorState.readOnly.of(initialReadOnlyRef.current),
        EditorView.editable.of(!initialReadOnlyRef.current),
        EditorView.contentAttributes.of({
          "aria-label": "Note content",
          "aria-multiline": "true",
          autocapitalize: "sentences",
          spellcheck: "true",
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString())
        }),
      ],
      parent: mountRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  return <div ref={mountRef} className={cn("min-h-[360px]", className)} />
})
