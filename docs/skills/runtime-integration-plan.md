# Skill Runtime Integration Plan

## Assumptions

- `SKILL.md` folders remain the source of truth for local skills.
- The current provider-neutral agent loop must keep working for OpenAI, Anthropic, OpenAI-compatible providers, and local/custom providers.
- Native provider skill attachment requires provider-side ids or shell environments, so the first runtime path should stay local and explicit until those ids exist.

## Success Criteria

1. Installed skill folders are discovered dynamically at runtime.
2. Direct `execute_skill` calls can run a managed skill even when discovery did not run first.
3. Agent turns use a typed runtime plan to decide whether skills are read from `SKILL.md` or executed through `execute_skill`.
4. Provider-specific behavior is isolated behind a strategy seam instead of inline branching in the agent service.
5. Tests cover the runtime plan and the dynamic execution refresh.

## Current Runtime

- `SkillLoader` parses Agent Skill folders and turns `SKILL.md` files into runtime skill definitions.
- `SkillsService` owns registration, discovery, prompt choices, import, download, and the `execute_skill` command.
- `AgentService` discovers relevant skills before a model call, adds compact skill guidance to the system prompt, adds required tools, and exposes `execute_skill` for executable skills.
- Provider-specific adapter helpers exist in `src/shared/skill-adapters.ts`, but provider request objects do not carry native skill attachments yet.

## Design

Use a small Strategy seam for skill runtime planning:

- `PromptToolSkillRuntimeStrategy` is the default for all providers.
- File-backed skills use prompt guidance plus the `read` tool.
- Executable skills use the `execute_skill` command tool.
- The strategy returns a `SkillRuntimePlan` with required tool names, file-backed skills, executable skills, and execution-tool requirements.

This keeps the agent provider-neutral while making future provider-native routes explicit and testable.

## Implementation Steps

1. Add a runtime planning module under `src/main/skills/runtime`.
2. Wire `AgentService` to use the plan when adding skill tools.
3. Refresh managed dynamic skills inside the `execute_skill` command before lookup.
4. Export the planning seam from the skills module.
5. Add focused tests for plan output and direct dynamic execution.

## Current Boundaries

- The default strategy is provider-neutral prompt/tool execution.
- Provider request types stay unchanged until a concrete adapter consumes native skill attachments.
- Connector execution remains scoped to the existing skill connector boundary.
