import { promises as fs } from "node:fs";
import path from "node:path";
import { Tool } from "./base.js";
import { expandUser } from "./utils.js";

const DEFAULT_LIMIT = 1000;
const DEFAULT_MAX_BYTES = 32 * 1024;
const DEFAULT_EXCLUDES = ["**/node_modules/**", "**/.git/**"];

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/");
}

export class FindTool extends Tool {
  name = "find";
  description = `Search for files by glob pattern. Returns matching file paths relative to the search directory. Output is truncated to ${DEFAULT_LIMIT} results or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first).`;
  parameters = {
    type: "object",
    properties: {
      pattern: {
        type: "string",
        description:
          "Glob pattern to match files, e.g. '*.ts', '**/*.json', or 'src/**/*.spec.ts'.",
      },
      path: {
        type: "string",
        description: "Directory to search in (default: current directory).",
      },
      limit: {
        type: "number",
        description: `Maximum number of results (default: ${DEFAULT_LIMIT}).`,
      },
    },
    required: ["pattern"],
  };

  async execute(args: Record<string, unknown>): Promise<string> {
    const pattern = String(args.pattern ?? "").trim();
    if (!pattern) return "Error: pattern is required";

    const searchDir = args.path ? expandUser(String(args.path)) : process.cwd();
    const limit =
      typeof args.limit === "number" && args.limit > 0
        ? Math.floor(args.limit)
        : DEFAULT_LIMIT;

    try {
      const stat = await fs.stat(searchDir).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        return `Error: path not found or not a directory: ${searchDir}`;
      }

      const results: string[] = [];
      const iter = fs.glob(pattern, {
        cwd: searchDir,
        exclude: DEFAULT_EXCLUDES,
        withFileTypes: true,
      });

      let limitReached = false;
      for await (const dirent of iter) {
        const full = path.join(dirent.parentPath, dirent.name);
        let rel = path.relative(searchDir, full);
        if (!rel) rel = dirent.name;
        let posix = toPosixPath(rel);
        if (dirent.isDirectory() && !posix.endsWith("/")) posix += "/";
        results.push(posix);
        if (results.length >= limit) {
          limitReached = true;
          break;
        }
      }

      if (results.length === 0) return "No files found matching pattern";

      let output = results.join("\n");
      let bytesTruncated = false;
      if (Buffer.byteLength(output, "utf8") > DEFAULT_MAX_BYTES) {
        const truncated: string[] = [];
        let size = 0;
        for (const line of results) {
          const lineSize = Buffer.byteLength(line, "utf8") + 1;
          if (size + lineSize > DEFAULT_MAX_BYTES) break;
          truncated.push(line);
          size += lineSize;
        }
        output = truncated.join("\n");
        bytesTruncated = true;
      }

      const notices: string[] = [];
      if (limitReached) {
        notices.push(
          `${limit} results limit reached. Use limit=${limit * 2} for more, or refine pattern`,
        );
      }
      if (bytesTruncated) {
        notices.push(`${DEFAULT_MAX_BYTES / 1024}KB limit reached`);
      }
      if (notices.length > 0) output += `\n\n[${notices.join(". ")}]`;

      return output;
    } catch (e) {
      return `Error finding files: ${(e as Error).message}`;
    }
  }
}
