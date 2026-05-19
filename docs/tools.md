# Tools

This describes how the active agent runtime selects tools for a turn and how selected tools are executed. Source file paths are intentionally omitted.

## Selection

The agent first evaluates the user message with a tool-use policy.

- If the user explicitly says not to use tools, no tools are exposed.
- Tool inventory questions expose the available tool surface so the model can answer from the current registry.
- URLs, current data, private account data, workspace files, codebase work, execution, tests, builds, debugging, mutation, email, calendar, Drive, browser, and similar external or mutable tasks require tools.
- Creative writing, rewriting, translation, summarization, and brainstorming are answered without tools unless the request also needs external access.
- If no rule requires tools, the run is a direct answer: tools are not built, startup context is not loaded, and the provider receives an empty tool list.

When tools are needed, the default candidate set is the full local tool registry plus enabled, configured connector tools. The default local set excludes `startup_files`; bootstrap mode only exposes `startup_files` if the active tool factory supplied it. Heartbeat runs can add `heartbeat_respond`. Skill-backed runs can add the skill execution tool and any tools required by the selected skills.

The runtime then narrows the candidate list for the specific turn. In the default service path this narrowing is forced and capped at 8 prompt tools.

- Tool inventory questions skip narrowing and expose all available tools.
- Explicit no-tool requests return no prompt tools even if candidates exist.
- Candidate tools are adapted into managed tool records with inferred category, permissions, safety level, privacy level, reliability, latency, and cost.
- Discovery filters out disabled tools, tools without required permissions, tools above the current safety limit, and tools outside the current privacy constraints.
- Ranking scores tools by request term matches, inferred category matches, user memory preferences, recent success, schema specificity, authoritative-source metadata, reliability, cost, latency, and safety.
- Generic search is penalized when a more specific category matches.
- Google Calendar and Google Drive intents force the relevant connector tools into the prompt even when the rank cap would otherwise omit them.
- File mutation tools `write`, `edit`, `apply_patch`, `delete`, `copy`, and `move` automatically keep `read` available when `read` exists.
- The selected prompt tools preserve the original candidate order; the ranking is used to decide membership and to generate compact guidance.

The system prompt lists only the selected tools for the turn. A compact tool card section is added when narrowing ran, including purpose, when to use the tool, when not to use it, required inputs, safety notes, and an example call. The provider receives only each selected tool's name, description, and JSON schema.

## Use

The model chooses whether to call one of the tools that were exposed for the turn. The runtime does not force a tool choice.

When a provider streams a tool call, the runtime collects the call id, tool name, and JSON argument deltas. Invalid JSON is returned to the model as a tool error and the tool is not executed. A call to a tool name that was not exposed for the turn is also returned as a tool error.

Before execution, identical calls are tracked per turn. The third identical call and later receive a warning. After more than 5 identical calls, execution is vetoed and the model receives a loop-detector error. Legacy approval markers are recorded in the approval cache, but the active path does not pause for a human approval prompt.

Execution then goes through the managed tool path.

- Arguments are extracted from the raw call, sanitized against the input schema, and validated.
- Unknown fields or missing required fields produce a clarification-style tool error instead of executing.
- Common values are normalized where supported, such as numeric strings, email casing, currency casing, units, and relative dates like `today` or `tomorrow` in the session timezone.
- Input schema validation runs before the tool executes.
- Per-tool rate limits and the per-turn tool-call limit are enforced.
- Tools run with an abort signal and an execution timeout. Transient failures can retry with backoff.
- Tool outputs are validated against the output schema.
- Prompt-injection-like tool output is treated as untrusted and normalized before it is returned to the model.
- Empty, partial, stale, contradictory, or otherwise suspicious output can add warnings.
- Tool calls are audited with sensitive values redacted.

Tool results are appended to the transcript as tool messages. The agent loop then calls the provider again with the updated transcript. This repeats until the provider stops calling tools, the run is cancelled, the context is compacted after one overflow retry, or the max iteration limit is reached.

Tool lifecycle events are streamed to the renderer: call start, argument deltas, parsed input, result, status, duration, and displayable output text. Run logs also record the selected tool names, policy reason, iterations, and tool-call outcomes.
