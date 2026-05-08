import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const MUTATING_TOOLS = new Set(["bash", "edit", "write"]);

let queue: Promise<void> = Promise.resolve();

async function git(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	args: string[]
): Promise<{ stdout: string; stderr: string; code: number }> {
	return pi.exec("git", args, { cwd: ctx.cwd, timeout: 30_000 });
}

async function hasChanges(pi: ExtensionAPI, ctx: ExtensionContext): Promise<boolean> {
	const result = await git(pi, ctx, ["status", "--porcelain"]);
	if (result.code !== 0) return false;
	return result.stdout.trim().length > 0;
}

async function getBranch(pi: ExtensionAPI, ctx: ExtensionContext): Promise<string | null> {
	const result = await git(pi, ctx, ["branch", "--show-current"]);
	if (result.code !== 0) return null;
	const branch = result.stdout.trim();
	return branch.length > 0 ? branch : null;
}

async function hasOrigin(pi: ExtensionAPI, ctx: ExtensionContext): Promise<boolean> {
	const result = await git(pi, ctx, ["remote", "get-url", "origin"]);
	return result.code === 0 && result.stdout.trim().length > 0;
}

async function autoCommitAndPush(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	toolName: string
): Promise<void> {
	const status = await git(pi, ctx, ["status", "--porcelain"]);
	if (status.code !== 0 || status.stdout.trim().length === 0) {
		return;
	}

	await git(pi, ctx, ["add", "-A"]);

	const commitMessage = `chore(pi): auto-commit after ${toolName}`;
	const commit = await git(pi, ctx, ["commit", "-m", commitMessage]);

	if (commit.code !== 0) {
		if (ctx.hasUI) {
			ctx.ui.notify(`Auto-commit failed: ${commit.stderr || commit.stdout || "unknown error"}`, "error");
		}
		return;
	}

	const originExists = await hasOrigin(pi, ctx);
	if (!originExists) {
		if (ctx.hasUI) {
			ctx.ui.notify(`Auto-committed: ${commitMessage} (no origin remote to push)`, "info");
		}
		return;
	}

	const branch = await getBranch(pi, ctx);
	const push = branch
		? await git(pi, ctx, ["push", "-u", "origin", branch])
		: await git(pi, ctx, ["push"]);

	if (ctx.hasUI) {
		if (push.code === 0) {
			ctx.ui.notify(`Auto-committed and pushed: ${commitMessage}`, "info");
		} else {
			ctx.ui.notify(`Auto-committed, but push failed: ${push.stderr || push.stdout || "unknown error"}`, "warning");
		}
	}
}

export default function autoCommitPushExtension(pi: ExtensionAPI) {
	pi.on("tool_execution_end", async (event, ctx) => {
		if (!MUTATING_TOOLS.has(event.toolName)) return;

		queue = queue
			.then(async () => {
				if (!(await hasChanges(pi, ctx))) return;
				await autoCommitAndPush(pi, ctx, event.toolName);
			})
			.catch((error) => {
				if (ctx.hasUI) {
					ctx.ui.notify(
						`Auto commit/push extension error: ${error instanceof Error ? error.message : String(error)}`,
						"error"
					);
				}
			});

		await queue;
	});
}
