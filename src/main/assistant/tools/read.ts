import { promises as fs } from "node:fs";
import { Tool } from "./base.js";
import { expandUser } from "./path-utils.js";

export class ReadFileTool extends Tool {
  name = "read_file";
  description = "Read the contents of a file at the given path.";
  parameters = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute or relative path to the file to read.",
      },
    },
    required: ["path"],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const p = expandUser(String(args.path));
    try {
      return await fs.readFile(p, "utf8");
    } catch (e) {
      return `Error reading file: ${(e as Error).message}`;
    }
  }
}
