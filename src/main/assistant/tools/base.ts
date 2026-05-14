export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export abstract class Tool {
  abstract name: string;
  abstract description: string;
  abstract parameters: Record<string, unknown>;

  /**
   * Human-in-the-loop gate. When truthy the agent loop pauses on this tool
   * call and surfaces a pending approval to the host instead of executing.
   * Override as a boolean or async predicate over the parsed arguments.
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
