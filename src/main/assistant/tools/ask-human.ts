import { Tool, type ToolKind } from "./base.js";

/**
 * Elicitation tool. The model calls this whenever it is uncertain about a
 * parameter (file path, name, destination, etc.) instead of guessing.
 *
 * The agent loop never invokes `execute()`: when `ask_human` appears in the
 * model's tool output, the loop surfaces it to the host as an
 * InputRequest. The human's answer becomes the tool output that is fed
 * back to the model.
 */
export class AskHumanTool extends Tool {
  name = "ask_human";
  description =
    "Ask the human for input when a required value is ambiguous or unspecified (file path, destination, name, choice between options). Prefer this over guessing.";
  parameters = {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The exact question to show the human.",
      },
      suggestions: {
        type: "array",
        items: { type: "string" },
        description:
          "Optional list of candidate answers (e.g. plausible file paths). The human may pick one or supply their own.",
      },
    },
    required: ["question"],
  };

  get kind(): ToolKind {
    return "input";
  }

  async execute(): Promise<string> {
    // Intercepted by the agent loop — never called at runtime.
    return "";
  }
}
