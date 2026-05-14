import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AssistantRunLogger } from '../../../../src/main/run-logger';

describe('AssistantRunLogger', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'friday-runlog-'));
	});

	afterEach(async () => {
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('appends a start record as a JSONL line', async () => {
		const logger = new AssistantRunLogger('a1', { baseDir: tmpDir });
		await logger.logStart({
			runId: 'r1',
			assistantId: 'a1',
			provider: 'openai',
			model: 'gpt-x',
			systemPromptChars: 100,
			userMessageChars: 5,
			tools: ['exec', 'write_file'],
			mcpToolCount: 0,
		});
		await logger.flush();

		const raw = await fs.readFile(path.join(tmpDir, 'a1.jsonl'), 'utf8');
		const records = raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			event: 'start',
			runId: 'r1',
			provider: 'openai',
			model: 'gpt-x',
			tools: ['exec', 'write_file'],
		});
		expect(typeof records[0].ts).toBe('string');
	});

	it('captures every lifecycle event in order via readAll()', async () => {
		const logger = new AssistantRunLogger('a2', { baseDir: tmpDir });
		await logger.logStart({
			runId: 'r1',
			assistantId: 'a2',
			provider: 'openai',
			model: 'm',
			systemPromptChars: 0,
			userMessageChars: 0,
			tools: [],
			mcpToolCount: 0,
		});
		await logger.logIteration({
			runId: 'r1',
			assistantId: 'a2',
			iteration: 0,
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
			durationMs: 25,
		});
		await logger.logToolCall({
			runId: 'r1',
			assistantId: 'a2',
			iteration: 0,
			callId: 'c1',
			tool: 'exec',
			arguments: '{"command":"ls"}',
			durationMs: 5,
			status: 'ok',
			outputChars: 12,
		});
		await logger.logApprovalRequest({
			runId: 'r1',
			assistantId: 'a2',
			iteration: 0,
			pending: [{ callId: 'c2', tool: 'write_file', arguments: '{}' }],
		});
		await logger.logApprovalResolution({
			runId: 'r1',
			assistantId: 'a2',
			callId: 'c2',
			tool: 'write_file',
			decision: 'approve',
			alwaysApply: false,
		});
		await logger.logFinish({
			runId: 'r1',
			assistantId: 'a2',
			provider: 'openai',
			model: 'm',
			status: 'completed',
			iterations: 1,
			durationMs: 100,
			usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
			outputChars: 42,
		});

		const records = await logger.readAll();
		expect(records.map((r) => r.event)).toEqual([
			'start',
			'iteration',
			'tool_call',
			'approval_request',
			'approval_resolution',
			'finish',
		]);
	});

	it('serializes concurrent writes to avoid interleaving', async () => {
		const logger = new AssistantRunLogger('a3', { baseDir: tmpDir });
		await Promise.all(
			Array.from({ length: 10 }, (_, i) =>
				logger.logIteration({
					runId: 'r1',
					assistantId: 'a3',
					iteration: i,
					durationMs: i,
				})
			)
		);
		await logger.flush();
		const records = await logger.readAll();
		expect(records).toHaveLength(10);
		expect(records.every((r) => r.event === 'iteration')).toBe(true);
	});

	it('returns [] from readAll() before any record is written', async () => {
		const logger = new AssistantRunLogger('never-used', { baseDir: tmpDir });
		await expect(logger.readAll()).resolves.toEqual([]);
	});

	it('captures input_request, input_resolution, and cancelled finish', async () => {
		const logger = new AssistantRunLogger('a4', { baseDir: tmpDir });
		await logger.logInputRequest({
			runId: 'r1',
			assistantId: 'a4',
			iteration: 0,
			pending: [{ callId: 'c1', tool: 'ask_human', question: 'where?' }],
		});
		await logger.logInputResolution({
			runId: 'r1',
			assistantId: 'a4',
			callId: 'c1',
			tool: 'ask_human',
			answerChars: 8,
		});
		await logger.logFinish({
			runId: 'r1',
			assistantId: 'a4',
			provider: 'openai',
			model: 'm',
			status: 'cancelled',
			iterations: 0,
			durationMs: 0,
			usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
			outputChars: 0,
		});
		const records = await logger.readAll();
		expect(records.map((r) => r.event)).toEqual([
			'input_request',
			'input_resolution',
			'finish',
		]);
	});
});
