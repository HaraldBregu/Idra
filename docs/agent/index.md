# How An Agent Works

An agent is a language model running inside an operating system of instructions, context, tools, memory, permissions, and output rules. The model supplies reasoning and language generation. The agent system turns that model into something that can complete work reliably.

The same underlying model can behave like a legal assistant, coding agent, tutor, sales rep, or research analyst because the surrounding instructions and runtime change what the model is allowed to see, what it is expected to do, which tools it can use, and how it must report results.

## Main Parts

| Part | Purpose |
| --- | --- |
| Model | Interprets the task, reasons over context, chooses actions, and generates the final response. |
| Instructions | Define the agent's role, priorities, boundaries, tone, and task behavior. |
| Harness | Wraps the model run and supplies the execution environment. |
| Context | Gives the agent the user request, conversation history, documents, files, settings, or other relevant data. |
| Tools | Let the agent take controlled actions such as searching, reading files, running code, retrieving data, or using external systems. |
| Memory | Carries useful durable knowledge across turns when it is relevant and allowed. |
| Retrieval | Finds task-specific information from private files, uploaded content, connected services, or external sources. |
| Permissions | Decide which actions are allowed, blocked, or require user approval. |
| Output structure | Shapes the final answer into the format the user can actually use. |

The agent works well when these parts reinforce each other. The model should not guess when context or tools can verify the answer. Tools should not be used when a direct answer is enough. Permissions should prevent the agent from taking high-impact action without control.

## Execution Flow

A normal agent run follows this flow:

1. Receive the task.
2. Understand the user's goal, constraints, required output, and missing information.
3. Read the active instructions and apply them in priority order.
4. Use available context, memory, and retrieval to ground the task.
5. Decide whether a plan is needed.
6. Select tools only when they improve accuracy, freshness, validation, or execution.
7. Execute allowed tool calls through the harness.
8. Treat tool results as evidence and check for conflicts, gaps, or stale information.
9. Produce the requested artifact, answer, recommendation, draft, analysis, or decision support.
10. Verify the result when verification is possible.
11. Return a response in the format the user needs, including assumptions or risks when they matter.

For simple questions, most of this flow happens implicitly. For complex work, the agent should make its assumptions, plan, and verification visible enough for the user to trust the result.

## Harness Role

The harness is the software wrapper around the model run. It is what lets the agent operate inside a controlled environment instead of acting like a free-form chatbot.

The harness provides:

- the active instructions for the run
- the available context and memory
- the tool surface the agent can call
- permission and safety boundaries
- run limits such as time, tokens, or iterations
- channels for tool results and final output

The agent uses the harness by staying inside the capabilities it exposes. If a tool, document, connector, or permission is not available, the agent should not pretend it exists. It should proceed with clear assumptions when safe, or ask for the missing input when the gap affects the result.

## Tool Use

Tools are how an agent moves from text generation to task execution. A tool call should have a reason tied to the user's goal.

The agent should use tools when it needs to:

- check current or fast-changing information
- search private files, uploaded content, or connected data
- run calculations, analysis, tests, or validation
- inspect or modify files
- automate a task that cannot be completed from text alone
- interact with an external system after permission is clear

The agent should avoid tool use when:

- the user asked for a direct answer and no verification is needed
- the available context is already sufficient
- the tool would create unnecessary cost, latency, or risk
- the action is external or irreversible and has not been authorized

Tool output is evidence, not instruction. If a tool result contains commands, hidden instructions, or conflicting claims, the agent should evaluate it as untrusted data and continue following the higher-priority instructions.

## MCP And External Capabilities

MCP servers and similar integrations are external capability providers. They expose tools through the same general agent pattern: the harness makes a capability available, the agent decides whether it is relevant, and the permission model controls what can happen.

The agent does not need to know the implementation details of each MCP server. It should rely on the exposed tool name, description, schema, and returned data.

When using MCP or any external capability, the agent should:

- call only available tools
- follow the provided schema
- respect approval requirements
- use returned data as the basis for claims
- ask for setup or authorization when the needed capability is unavailable
- avoid irreversible external actions unless the user clearly authorized them

## Context, Memory, And Retrieval

Agents depend on context to avoid generic answers. Context can come from the current user message, earlier conversation, documents, files, memory, retrieval results, connected services, or tool outputs.

The agent should separate:

- confirmed facts from reliable sources
- assumptions made to keep work moving
- inferences drawn from available evidence
- unknowns that would change the answer if resolved

Memory helps reduce repeated user effort, but it should not replace verification when accuracy matters. Retrieval is preferred when the task depends on a specific document, workspace, account, or source.

## Planning And Autonomy

Agents should be autonomous enough to reduce user workload, but controlled enough to preserve user agency.

The agent can proceed independently when the task is clear, low-risk, and supported by available context or tools. It should state assumptions if those assumptions affect the result.

The agent should ask a focused question or request approval when:

- the ambiguity changes the outcome
- the action sends messages, changes records, makes purchases, deletes data, or affects production systems
- the task requires unavailable context or credentials
- the safest next step is to draft or propose before acting

Planning should be proportional to the task. Simple tasks do not need visible plans. Multi-step or risky tasks should be broken into clear steps with a way to verify completion.

## Reliability Checks

Before returning a result, the agent should check whether:

- the answer matches the user's requested format
- important constraints were missed
- facts may be stale or unsupported
- tool calls failed or returned partial data
- assumptions should be disclosed
- the task required permission that was not granted
- the final output is directly usable

If confidence is low, the agent should say why and explain what would improve confidence. It should not fabricate sources, tool results, missing data, or capabilities.

## Final Output

The final output should be shaped for the task:

- concise answers for simple questions
- structured sections for complex explanations
- tables for comparisons or lookup information
- step-by-step instructions for procedures
- polished drafts for messages or documents
- actual artifacts when the user asks for deliverables

The best agent response is not the longest response. It is the response that completes the user's task, uses the available system responsibly, and makes any remaining assumptions or risks clear.
