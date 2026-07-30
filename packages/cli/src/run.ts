import { spawn } from 'node:child_process';

export interface RunResult {
	readonly stdout: string;
	readonly stderr: string;
}

export async function run(command: string, args: readonly string[], cwd: string): Promise<RunResult> {
	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			env: process.env,
			shell: false,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		let stdout = '';
		let stderr = '';

		child.stdout.setEncoding('utf8');
		child.stderr.setEncoding('utf8');
		child.stdout.on('data', (chunk: string) => {
			stdout += chunk;
		});
		child.stderr.on('data', (chunk: string) => {
			stderr += chunk;
		});
		child.once('error', reject);
		child.once('close', (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
				return;
			}
			reject(new Error(stderr.trim() || `${command} exited with code ${code ?? 'unknown'}.`));
		});
	});
}
