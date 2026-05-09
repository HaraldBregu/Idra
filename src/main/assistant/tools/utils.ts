import os from "node:os";
import path from "node:path";

export function expandUser(p: string): string {
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}
