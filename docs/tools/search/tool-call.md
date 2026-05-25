# tool_call

`tool_call` executes a hidden catalog tool by name.

## Tool Search Description

Use `tool_call` only after the hidden tool has been found and its parameters are known.

## Use For

- Calling a deferred catalog tool through the same wrapped execution path as visible tools.

## Do Not Use For

- Guessing tool names.
- Bypassing `tool_search` and `tool_describe`.
- Calling tools that are not available in the hidden catalog.

## Keep In Mind

The hidden tool still runs under the same policy, approval, and loop-detection path as visible tools. Report failures from the called tool directly.
