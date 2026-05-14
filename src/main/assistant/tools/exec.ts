import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import { Tool } from "./base.js";

const DANGEROUS_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\//,
  /mkfs/,
  /dd\s+if=/,
  /:\(\)\s*\{.*\}/, // fork bomb
  />\s*\/dev\/sd/,
];

export class ExecTool extends Tool {
  name = "exec";
  description =
    "Run a shell command and return the output. Use for listing files, checking system state, running scripts, etc.";
  parameters = {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute.",
      },
    },
    required: ["command"],
  };

  private timeoutMs: number;
  private cwd: string;
  private requireApproval: boolean;

  constructor(opts: { workspace?: string; timeoutSeconds?: number; requireApproval?: boolean } = {}) {
    super();
    this.timeoutMs = (opts.timeoutSeconds ?? 60) * 1000;
    this.cwd = opts.workspace ?? os.homedir();
    this.requireApproval = opts.requireApproval ?? true;
  }

  needsApproval(): boolean {
    return this.requireApproval;
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const command = String(args.command);

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        return `Blocked: command matches dangerous pattern '${pattern}'`;
      }
    }

    await fs.mkdir(this.cwd, { recursive: true });

    return new Promise((resolve) => {
      const proc = spawn(command, {
        shell: true,
        cwd: this.cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const chunks: Buffer[] = [];
      proc.stdout.on("data", (d: Buffer) => chunks.push(d));
      proc.stderr.on("data", (d: Buffer) => chunks.push(d));

      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve(`Error: command timed out after ${this.timeoutMs / 1000}s`);
      }, this.timeoutMs);

      proc.on("error", (e) => {
        clearTimeout(timer);
        resolve(`Error executing command: ${e.message}`);
      });

      proc.on("close", () => {
        clearTimeout(timer);
        const out = Buffer.concat(chunks).toString("utf8").trim();
        resolve(out || "(no output)");
      });
    });
  }
}
