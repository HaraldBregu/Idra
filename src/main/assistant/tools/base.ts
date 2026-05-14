export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type ToolKind = "normal" | "input";

export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, unknown>;

  /**
   * Classifies the tool's interaction model with the agent loop:
   *
   * - `normal` (default): the loop executes `execute()` to produce the tool
   *   output. Tools opt into a yes/no approval gate via `needsApproval()`.
   * - `input`:    the loop never calls `execute()`. Instead, the call is
   *   surfaced to the human as an InputRequest; whatever the human answers
   *   becomes the tool's output. Use for `ask_human`-style elicitation.
   */
  get kind(): ToolKind {
    return "normal";
  }

  /**
   * Human-in-the-loop gate for `normal` tools. When truthy the agent loop
   * pauses on this tool call and surfaces a pending approval to the host
   * instead of executing. Ignored for `input` tools.
   */
  needsApproval(_args: Record<string, unknown>): boolean | Promise<boolean> {
    return false;
  }

  abstract execute(args: Record<string, unknown>): Promise<string>;

  schema(): ToolSchema {
    return {
      type: "function",
      function: {
        name: this.name,
        description: this.description,
        parameters: this.parameters,
      },
    };
  }
}
