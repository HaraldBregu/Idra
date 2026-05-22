# tool_call

`tool_call` runs a hidden tool selected through the tool-search flow.

## How It Is Used

- Used after Friday has found and checked a hidden tool.
- Sends the selected action through the same managed execution path as other
  tools.
- Lets a compact prompt still reach a larger tool catalog when needed.

## Boundaries

- It should only run a hidden tool that is relevant to the request.
- It still follows normal safety, rate, and output handling expectations.
