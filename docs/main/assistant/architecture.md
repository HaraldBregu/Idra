# Architecture

## Modules

| File | Role |
|------|------|
| `assistant.ts` | `Assistant` class — orchestrator. Owns memory, session, tools, history. |
| `memory.ts` | `MemoryManager` + `buildSystemPrompt`. Markdown workspace under `userData`. |
| `session.ts` | `SessionManager`. Append-only JSONL conversation log + sanitizer. |
| `loop.ts` | `runAgent`. ReAct loop over OpenAI chat completions. |
| `registry.ts` | `AssistantRegistry`. Map<id, Assistant>. |
| `tools/` | `Tool` base + built-ins: read/write/exec, cron, anthropic/openai keys, channels. |
| `templates/` | Markdown templates seeded into a fresh workspace. |
| `index.ts` | Public exports + `DEFAULT_ASSISTANT_ID = 'main'`. |

## Lifecycle

```
new Assistant(opts)        ← cheap, no IO
  ↓ first send()
init()                     ← idempotent, in-flight promise dedup
  memory.init()            ← mkdir workspace, seed templates
  session.init()           ← mkdir sessions/, write meta line if new
  history = session.load() ← read JSONL, sanitize, slice last 50
  ↓
send(userMessage)
  systemPrompt = buildSystemPrompt(memory)
  { text, newMessages } = runAgent({ client, model, userMessage, tools, history, systemPrompt })
  session.append(newMessages)
  history.push(...newMessages)
  return text
```

## Message flow inside `runAgent`

```
messages = [system?, ...history, user]
loop max=maxIterations:
  resp = client.chat.completions.create({ model: model(), messages, tools })
  msg  = resp.choices[0].message
  push assistant msg (with tool_calls if any)
  if no tool_calls: return text
  for each tool_call:
    tool = toolMap.get(name)
    result = await tool.execute(parsed_args)  // unknown tool → error string
    push role:'tool' { tool_call_id, content: result }
return 'Error: max iterations reached'
```

`newMessages` (returned to caller) starts with the user message and contains every assistant + tool turn from this `send()` — exactly what gets appended to the JSONL.

## Class diagram (textual)

```
Assistant
├─ memory:   MemoryManager   (per id)
├─ session:  SessionManager  (per sessionKey, default `assistant:<id>`)
├─ tools:    Tool[]          (default = read+write+exec [+store-tools] [+cron-tools])
├─ history:  ChatCompletionMessageParam[]
└─ client:   OpenAI (cached, keyed on apiKey)

AssistantRegistry
└─ assistants: Map<id, Assistant>
```

## Why this shape

- **Markdown memory** is human-editable, diffable, and the assistant itself can edit it via the `write_file` tool.
- **JSONL session** is append-only → cheap, crash-safe; sanitizer recovers from any tail-corruption that violates OpenAI tool-pair invariants.
- **Tool registry per Assistant** (not global) lets each assistant get a different tool subset (e.g., one with cron, one without).
- **Lazy init** keeps construction free of IO, so `AssistantRegistry.create` can run during early bootstrap before `userData` paths are needed.
