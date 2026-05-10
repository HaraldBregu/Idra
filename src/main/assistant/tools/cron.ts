import { randomUUID } from "node:crypto";
import { Tool } from "./base";
import { CronService } from "../../cron/index";

export class CronAddTool extends Tool {
  name = "cron_add";
  description = "Schedule a recurring job using a cron expression (e.g. '0 9 * * *').";
  parameters = {
    type: "object",
    properties: {
      expression: { type: "string", description: "Cron expression, e.g. '0 9 * * *'." },
      message: { type: "string", description: "Human-readable message describing the job." },
      id: { type: "string", description: "Optional job id. Auto-generated if omitted." },
      timezone: { type: "string", description: "Optional IANA timezone." },
    },
    required: ["expression", "message"],
  };

  constructor(private cron: CronService) {
    super();
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const expression = String(args.expression);
    const message = String(args.message);
    const id = args.id ? String(args.id) : randomUUID();
    const timezone = args.timezone ? String(args.timezone) : undefined;
    this.cron.schedule(id, expression, message, () => {}, { timezone });
    return `Scheduled job ${id}: '${expression}' — ${message}`;
  }
}

export class CronListTool extends Tool {
  name = "cron_list";
  description = "List all scheduled cron jobs.";
  parameters = { type: "object", properties: {}, required: [] };

  constructor(private cron: CronService) {
    super();
  }

  async execute(_args: Record<string, unknown>): Promise<string> {
    const jobs = this.cron.listJobs();
    if (jobs.length === 0) return "No jobs scheduled.";
    return jobs.map((j) => `[${j.id}] '${j.expression}'`).join("\n");
  }
}

export class CronRemoveTool extends Tool {
  name = "cron_remove";
  description = "Remove a scheduled cron job by ID.";
  parameters = {
    type: "object",
    properties: {
      job_id: { type: "string", description: "The job ID to remove." },
    },
    required: ["job_id"],
  };

  constructor(private cron: CronService) {
    super();
  }

  async execute(args: Record<string, unknown>): Promise<string> {
    const jobId = String(args.job_id);
    if (!this.cron.has(jobId)) return `No job found with ID ${jobId}.`;
    this.cron.unschedule(jobId);
    return `Removed job ${jobId}.`;
  }
}
