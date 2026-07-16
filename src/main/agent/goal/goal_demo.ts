import { spawn } from 'node:child_process';
import type { CriterionCheck, Goal } from './goal_types';

// Demo goal: make all unit tests in ./tests pass, verified by actually
// running the test command and requiring exit code 0.
export function demoGoal(options: { command?: string; cwd?: string; timeoutMs?: number } = {}): Goal {
	const command = options.command ?? 'npm test';
	const cwd = options.cwd ?? process.cwd();
	return {
		description:
			`Make all unit tests in ./tests pass by fixing the code under test. ` +
			`The tests run with \`${command}\`.`,
		successCriteria: [
			{
				id: 'tests-pass',
				description: `\`${command}\` exits with code 0`,
				verification: { type: 'programmatic', check: () => runTestCommand(command, cwd) },
			},
		],
		constraints: [
			{
				description: 'Do not modify or delete files under tests/ — fix the implementation instead.',
				violatedBy: (toolName, input) =>
					['write', 'edit', 'apply_patch'].includes(toolName) && touchesTests(input),
			},
		],
		budget: {
			maxIterations: 5,
			maxToolCalls: 40,
			timeoutMs: options.timeoutMs ?? 10 * 60 * 1000,
		},
	};
}

function touchesTests(input: Record<string, unknown>): boolean {
	return Object.values(input).some(
		(value) => typeof value === 'string' && /(^|[\\/])tests[\\/]/.test(value),
	);
}

function runTestCommand(command: string, cwd: string): Promise<CriterionCheck> {
	return new Promise((resolve) => {
		const child = spawn(command, [], { cwd, shell: true });
		let output = '';
		const append = (chunk: Buffer | string): void => {
			output = (output + chunk.toString()).slice(-8000);
		};
		child.stdout.on('data', append);
		child.stderr.on('data', append);
		child.on('error', (error) =>
			resolve({ passed: false, evidence: `Error: failed to run '${command}': ${error.message}` }),
		);
		child.on('close', (exitCode) =>
			resolve({
				passed: exitCode === 0,
				evidence: `\`${command}\` exited with code ${exitCode}.\n${output}`,
			}),
		);
	});
}
