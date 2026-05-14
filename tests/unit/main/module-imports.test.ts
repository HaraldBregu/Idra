describe('main module imports', () => {
	it('keeps barrel and low-side-effect modules importable after moving assistant up one level', async () => {
		await expect(import('../../../src/main/agent/run')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent/system-prompt')).resolves.toBeTruthy();
		await expect(import('../../../src/main/agent/compaction')).resolves.toBeTruthy();
		await expect(import('../../../src/main/apps')).resolves.toBeTruthy();
		await expect(import('../../../src/main/channels')).resolves.toBeTruthy();
		await expect(import('../../../src/main/connectors')).resolves.toBeTruthy();
		await expect(import('../../../src/main/core')).resolves.toBeTruthy();
		await expect(import('../../../src/main/cron')).resolves.toBeTruthy();
		await expect(import('../../../src/main/hitl')).resolves.toBeTruthy();
		await expect(import('../../../src/main/ipc')).resolves.toBeTruthy();
		await expect(import('../../../src/main/logger')).resolves.toBeTruthy();
		await expect(import('../../../src/main/mcp')).resolves.toBeTruthy();
		await expect(import('../../../src/main/provider/factory')).resolves.toBeTruthy();
		await expect(import('../../../src/main/session/store')).resolves.toBeTruthy();
		await expect(import('../../../src/main/store')).resolves.toBeTruthy();
		await expect(import('../../../src/main/tools')).resolves.toBeTruthy();
		await expect(import('../../../src/main/workspace')).resolves.toBeTruthy();
	});
});
