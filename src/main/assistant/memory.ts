import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const TEMPLATE_FILES = ['AGENTS.md', 'BOOTSTRAP.md', 'HEARTBEAT.md', 'MEMORY.md', 'SOUL.md', 'USER.md'];

// Bundled at build time by Vite — keys are template filenames, values are file contents.
const TEMPLATES: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob('./templates/*.md', {
			query: '?raw',
			eager: true,
			import: 'default',
		}) as Record<string, string>
	).map(([p, content]) => [path.basename(p), content])
);

/**
 * Per-assistant markdown memory. Lives in userData/assistant/workspaces/<id>/.
 * Templates are bundled into the main process build and seeded on first init;
 * BOOTSTRAP.md is re-seeded only when the workspace is fresh (no SOUL.md yet).
 */
export class MemoryManager {
	readonly workspace: string;

	constructor(assistantId: string) {
		this.workspace = path.join(app.getPath('userData'), 'assistant', 'workspaces', assistantId);
		console.log(`MemoryManager initialized with workspace: ${this.workspace}`);
	}

	async init(): Promise<void> {
		await fs.mkdir(this.workspace, { recursive: true });
		await this.seedTemplates();
	}

	private async seedTemplates(): Promise<void> {
		const isFresh = !(await this.exists(path.join(this.workspace, 'SOUL.md')));
		for (const [filename, content] of Object.entries(TEMPLATES)) {
			if (filename === 'BOOTSTRAP.md' && !isFresh) continue;
			const dest = path.join(this.workspace, filename);
			if (!(await this.exists(dest))) {
				await fs.writeFile(dest, content);
			}
		}
	}

	private async exists(p: string): Promise<boolean> {
		try {
			await fs.access(p);
			return true;
		} catch {
			return false;
		}
	}

	async clear(): Promise<void> {
		await fs.rm(this.workspace, { recursive: true, force: true });
	}

	async readAll(): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const filename of TEMPLATE_FILES) {
			const p = path.join(this.workspace, filename);
			try {
				const content = (await fs.readFile(p, 'utf8')).trim();
				if (content) {
					result[path.parse(filename).name.toLowerCase()] = content;
				}
			} catch {
				// missing file -- skip
			}
		}
		return result;
	}
}

/**
 * Renders the assistant's memory state as a system prompt: ambient context
 * (date, workspace) followed by tag-wrapped sections for each populated
 * memory file.
 */
export async function buildSystemPrompt(
	memory: MemoryManager,
	channel?: string,
	chatId?: string
): Promise<string> {
	const now = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
	const parts = [
		'You are a personal AI assistant.',
		`Current date/time: ${now}`,
		`Workspace: ${memory.workspace}`,
		`Always use absolute paths when reading or writing files. Your workspace is ${memory.workspace}.`,
	];
	if (channel) parts.push(`Channel: ${channel}`);
	if (chatId) parts.push(`Chat ID: ${chatId}`);

	const sections = [parts.join('\n')];
	const all = await memory.readAll();
	for (const [tag, content] of Object.entries(all)) {
		sections.push(`<${tag}>\n${content}\n</${tag}>`);
	}
	return sections.join('\n\n');
}
