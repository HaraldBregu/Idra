# Large Language Model

This document describes how the agent module should run agent turns, expose
service behavior, and keep provider-specific work outside the agent loop.

## Scope

The agent module owns the provider-neutral parts of an agent run:

- building the system prompt for a turn
- evaluating configured pre-run safety hooks
- running the model/tool loop
- compacting old transcript entries after context overflow
- managing per-agent startup files used as lower-priority project context

It does not own provider-specific streaming, UI state, session persistence,
global tool construction, connector discovery, or workspace file APIs. Those
are assembled by the higher-level service layer before calling into this module.

## Module Contract

The agent is a separated module with dependencies. It is exposed as a service,
not as a direct LLM tool for now.

Service surfaces:

- `AgentService.send()` prepares and runs the default assistant service path.
- `runAgent(input)` executes the provider-neutral model/tool loop.
- `AgentStartupFilesService` owns per-agent startup context files.

Dependencies:

- `StoreService` for configured provider records and saved `agent` settings.
- Provider adapters created by `makeProvider()`.
- Session storage, tool construction, skills, hooks, and startup files supplied
  by the service layer.

Other modules may call the agent service through validated paths. For example,
the background task module can run `agent.run`, and the task scheduler can run
Friday cron `agentTurn` jobs. Those paths do not make `agent` itself an LLM
tool.

## Runtime Flow

The default service path prepares an agent run in this order:

1. Resolve the workspace, session, provider, selected model, tools, skills, and
   startup files.
2. Build the system prompt with `buildSystemPrompt`.
3. Evaluate `evaluateBeforeAgentRunHooks` against the user prompt, transcript,
   and final system prompt.
4. If a hook blocks, append the safe block message as the assistant response and
   finish without calling the provider.
5. If hooks pass, call `runAgent`.
6. Save the mutated session returned by `runAgent`.

`runAgent` then executes the model loop:

1. Append the user message to the session transcript.
2. Optionally narrow the tools exposed to the provider for this turn.
3. Stream provider events until a message ends, a tool call is requested, the
   run is cancelled, or an error occurs.
4. Store assistant text, reasoning blocks, and tool-use blocks in the transcript.
5. Execute requested tools through the pre-flight loop detector and managed tool
   executor.
6. Append tool results to the transcript and call the provider again.
7. Stop when the model no longer requests tools, the max iteration count is hit,
   cancellation occurs, or an unrecoverable error is thrown.

## Provider And Model Resolution

The agent module does not choose the provider or model by itself. The agent
service resolves them before the agent module runs.

Design boundary:

- `AgentService.send` is the facade for preparing a run.
- `StoreService` provides configured provider records.
- `makeProvider` is the factory that turns a provider record into a
  `ProviderAdapter`.
- Provider adapters translate provider-specific streaming into the shared
  provider event contract.
- `runAgent` stays provider-neutral and receives an already constructed
  adapter plus the selected model string.

Resolution behavior:

- The saved agent service configuration comes from the root `agent` settings.
- The provider id comes from `agent.providerId`, trimmed and lowercased.
- The model comes from `agent.modelId`, trimmed before use.
- Callers may pass `AgentSendOptions.providerId`; it is trimmed, lowercased,
  and used instead of the stored provider id for that run.
- Callers may pass `AgentSendOptions.model`; it is trimmed and used instead of
  the stored model for that run.
- The provider record comes from `StoreService.getProviderById(providerId)` and
  supplies the API key and optional base URL.
- `makeProvider` converts the provider id into a `ProviderAdapter`.

Timing:

- Resolution happens once per `AgentService.send` call during the
  `resolve_provider_model` phase.
- The selected provider may be overridden by `AgentSendOptions.providerId`.
- The selected model may be overridden by `AgentSendOptions.model`.
- Heartbeat runs can also pass `heartbeat.model`; the normal `options.model`
  override wins over the heartbeat override.
- Per-run provider overrides still resolve API key and base URL from the stored
  provider record.
- The session is loaded with the selected model and provider id before the
  provider adapter, tools, prompt, hooks, and `runAgent` call are prepared.
- `agent.run` tasks can pass `providerId` and `model` in their input so
  independent tasks can use different configured providers and models.
- Scheduled `agentTurn` jobs can pass the same `providerId` and `model` fields.

Example:

```ts
await agentService.send('Summarize the finance report.', 'main', {
	sessionId: 'task:finance-summary',
	providerId: 'anthropic',
	model: 'claude-test',
});
```

The same fields are accepted by the `agent.run` task input:

```ts
{
	message: 'Summarize the finance report.',
	providerId: 'anthropic',
	model: 'claude-test',
}
```

How the values are used:

- `buildSystemPrompt` receives the selected model for prompt context.
- The tool factory receives the provider id and model while constructing tools.
- `runAgent` receives the provider adapter, selected model, and optional
  reasoning effort.
- `runAgent` passes `model` and `effort` into each `provider.stream` call.
- If context overflow triggers compaction, `compact` uses the same provider,
  model, and effort to summarize older transcript entries.

Failure behavior:

- Missing provider configuration, missing model configuration, missing provider
  record, or missing API key fails before the provider is called.
- OpenAI runs require a resolved reasoning effort; per-run effort overrides can
  replace the saved effort for that run.

Standards:

- Treat task input as an unsafe boundary. Validate and trim `providerId` and
  `model` before converting them into `AgentSendOptions`.
- Never accept API keys, credentials, or base URLs from task input or per-run
  send options. Those values must come from the configured provider record.
- Preserve backward compatibility: omitting both overrides must use the saved
  agent provider and model exactly as before.
- Prefer passing both `providerId` and `model` when running a task against a
  provider different from the saved agent provider.
- Keep override resolution in the service layer. Do not move store lookups,
  provider factory calls, or API key handling into `runAgent`.

## Exported Surfaces

### `runAgent(input)`

`runAgent` is the provider-neutral execution loop. It receives a fully prepared
session, prompt, provider adapter, model, tools, tool context, optional hooks,
and optional stream callbacks.

Current behavior:

- Pushes the incoming user message into `session.transcript`.
- Emits run-state, text, reasoning, tool-input, and tool-result stream events.
- Sends only selected tool names, descriptions, and schemas to the provider.
- Collects streamed tool-call argument deltas and parses them as JSON.
- Records malformed tool arguments as tool errors instead of executing the tool.
- Records calls to unavailable tool names as tool errors.
- Runs `beforeToolCall` before execution for identical-call loop detection and
  legacy approval marker handling.
- Executes tools through `executeAgentToolWithManagement`.
- Converts tool result blocks into displayable text and structured output for
  stream events.
- Appends assistant and tool entries to the transcript after each provider turn.
- Aggregates token usage and returns final text, tool-call count, stop reason,
  usage, and the mutated session.
- On the first `ContextOverflowError`, flushes session memory, compacts the
  transcript, records a compaction marker when one is produced, and retries.
- Treats aborts as `cancelled`.

Expected behavior:

- Keep the loop provider-neutral. Provider-specific event translation belongs in
  provider adapters.
- Do not resolve provider ids, provider records, API keys, base URLs, or task
  input inside `runAgent`.
- Never execute a tool if arguments fail JSON parsing or if the tool was not
  exposed for the run.
- Preserve stable provider call ids in assistant tool-use blocks and matching
  tool result blocks.
- Always append enough transcript state for the next provider turn to understand
  prior tool calls and results.
- Keep context compaction to a single retry per run to avoid infinite recovery
  loops.
- Keep hook calls best-effort for observability. Hook failures should not corrupt
  transcript state.
- Keep cancellation checks before provider work and before tool execution.

### `buildSystemPrompt(ctx)`

`buildSystemPrompt` assembles the prompt sent to the provider for a turn.

Current behavior:

- Starts with the Friday identity, current date, workspace, and workspace
  contract.
- Emits tool guidance for the tools available on that turn, sorted by name for
  deterministic output.
- Uses built-in guidance for common local tools and falls back to each tool
  description otherwise.
- Adds skill-selection guidance and an escaped `<available_skills>` catalog when
  skills are selected.
- Adds heartbeat guidance when heartbeat context is enabled.
- Reads all memory blocks from the supplied memory manager and inserts them as
  XML-like sections.
- Adds bootstrap instructions when startup files indicate full or limited
  bootstrap mode.
- Adds rendered startup files as lower-priority project context.

Expected behavior:

- Keep output deterministic for the same input.
- Treat startup files and memory as context, not authority above system,
  developer, or user instructions.
- Escape skill metadata before placing it in XML-like prompt sections.
- Avoid tool guidance for tools that are not available in the current turn.
- Keep bootstrap instructions explicit about whether the run can complete setup.

### `compact(sessionId, transcript, provider, model, effort)`

`compact` reduces transcript size after a provider context overflow.

Current behavior:

- Uses a per-session mutex so only one compaction for the same session runs at a
  time.
- Leaves short transcripts unchanged.
- Keeps the six most recent transcript entries verbatim.
- Summarizes older entries through the same provider adapter and model.
- Renders user, assistant, and tool entries into a compact plain-text body for
  summarization.
- Replaces older entries with one synthetic user entry containing
  `<previous conversation summary>`.
- Returns a marker with the original turn count, dropped count, and summary hash.

Expected behavior:

- Preserve facts, decisions, file paths, and important command outputs in the
  summary.
- Keep recent turns verbatim so active tool-call context is not lost.
- Do not compact repeatedly for the same overflow in a single run.
- Do not mutate the original transcript until a replacement transcript is ready.

### `AgentStartupFilesService`

`AgentStartupFilesService` manages per-agent startup files under
`agent/workspaces/<agentId>` in the configured user-data area, or under an
injected root path in tests.

Managed files:

- `AGENTS.md`
- `SOUL.md`
- `TOOLS.md`
- `IDENTITY.md`
- `USER.md`
- `HEARTBEAT.md`
- `BOOTSTRAP.md`
- `MEMORY.md`

Current behavior:

- Encodes the agent id into a safe path segment.
- Creates the startup root with private permissions.
- Seeds the default startup profile files if they are missing.
- Seeds `BOOTSTRAP.md` only when setup appears incomplete.
- Stores setup state in `.friday/startup-state.json`.
- Treats deleted seeded `BOOTSTRAP.md` as setup completion.
- Removes stale `BOOTSTRAP.md` when profile files show the agent has already
  been configured.
- Loads startup context files after safety checks.
- Omits `BOOTSTRAP.md` after setup completion.
- Omits missing `MEMORY.md` from loaded prompt context.
- Refuses to read or write symlinks, hard-linked files, non-files, files outside
  the startup root, and files larger than the configured byte limit.
- Writes startup files with private permissions and without overwriting existing
  files during seeding.

Expected behavior:

- Never seed startup files into the workspace root.
- Never follow or write unsafe filesystem entries.
- Never overwrite user-edited startup files during readiness checks.
- Keep bootstrap state recoverable from both the state file and file presence.
- Keep `MEMORY.md` optional so missing memory does not pollute the prompt with a
  missing-file block.

### Startup File Helpers

Supporting helpers expose smaller pieces of startup-file behavior:

- `isAgentStartupFileName(name)` checks whether a name is allowlisted.
- `assertAgentStartupFileName(name)` throws for unsupported names.
- `loadAgentStartupTemplate(name)` loads bundled templates and strips
  frontmatter.
- `safeReadAgentStartupFile(rootPath, name)` reads one startup file with safety
  checks and structured missing/unsafe results.
- `writeFileIfMissing(filePath, content)` seeds a file using exclusive create
  semantics.
- `renderAgentStartupFiles(files, options)` formats startup files into bounded
  prompt context blocks.
- `isPathInside(rootPath, targetPath)` validates path containment after
  resolution.

Expected behavior:

- Keep the allowlist as the single source of supported startup file names.
- Return structured unsafe results for read failures that should be shown as
  context, and throw for unsupported names or write attempts that should stop.
- Keep prompt rendering bounded by per-file and total character limits.

### `evaluateBeforeAgentRunHooks(hooks, event, timeoutMs)`

`evaluateBeforeAgentRunHooks` runs pre-provider policy hooks.

Current behavior:

- Runs hooks in order.
- Treats `undefined` and `{ outcome: 'pass' }` as pass decisions.
- Stops at the first valid block decision.
- Fails closed when a hook throws, times out, or returns an invalid decision.
- Returns a safe replacement message for blocked requests.
- Redacts internal reasons and sensitive metadata keys such as prompt, reason,
  secret, token, password, and credential.
- Preserves only string, number, and boolean metadata values.

Expected behavior:

- Keep pre-run hooks before provider invocation and tool execution.
- Do not leak raw prompts, internal block reasons, or secrets through block
  metadata.
- Use a bounded timeout so a hook cannot hang an agent run.
- Treat hook implementation failures as policy blocks, not as passes.

## Change Guidelines

When changing this module:

- Start from focused tests for agent runs, startup files, and service
  integration.
- Add or update tests for changes to transcript shape, stop reasons, tool-call
  handling, prompt composition, compaction, startup-file safety, and hook
  redaction.
- Keep changes surgical. The service layer should prepare inputs; this module
  should run the provider-neutral behavior.
- Preserve transcript compatibility with existing session files.
- Keep filesystem behavior conservative: private permissions, allowlisted names,
  path containment, and no symlink or hard-link writes.
- Keep prompt additions explicit about priority and authority.
